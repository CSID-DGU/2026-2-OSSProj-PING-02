import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';

const EMAIL = 'guard@example.com';
const USERNAME = usernameOf('guard');
const PASSWORD = 'abcd1234';

let ctx: TestContext;

/** 매 테스트마다 앱을 새로 띄운다. IP 기준 레이트 리밋 카운터가 테스트 사이에 섞이지 않도록. */
beforeEach(async () => {
  ctx = await startApp();
});

afterEach(async () => {
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());

const signupBody = (username = USERNAME, email = EMAIL) => ({
  username,
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  email,
  password: PASSWORD,
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
  ],
});

const user = (username = USERNAME, email = EMAIL) => register(ctx, signupBody(username, email));
const login = (password: string, username = USERNAME) =>
  http().post('/v1/auth/login').send({ username, password });
const userRow = async (username = USERNAME) =>
  (
    await ctx.ds.query(`SELECT failed_login_count AS n, locked_until AS locked FROM users WHERE username = $1`, [
      username,
    ])
  )[0];

describe('로그인 실패 잠금 (계정 기준)', () => {
  it('비밀번호를 틀릴 때마다 실패 횟수가 쌓이고, 로그인에 성공하면 0으로 돌아간다', async () => {
    await user();
    for (let i = 0; i < 3; i++) expect((await login('wrongpass1')).status).toBe(401);
    expect((await userRow()).n).toBe(3);

    expect((await login(PASSWORD)).status).toBe(200);
    expect(await userRow()).toEqual({ n: 0, locked: null });
  });

  it('5회 연속 틀리면 5분 잠기고 실패 횟수는 0으로 돌아간다', async () => {
    await user();
    for (let i = 0; i < 5; i++) expect((await login('wrongpass1')).status).toBe(401);

    const row = await userRow();
    expect(row.n).toBe(0);
    const remainMs = new Date(row.locked).getTime() - Date.now();
    expect(remainMs).toBeGreaterThan(4 * 60_000);
    expect(remainMs).toBeLessThanOrEqual(5 * 60_000);
  });

  it('잠겨 있으면 비밀번호가 맞아도 같은 401 INVALID_CREDENTIALS 이고, 잠김을 알려 주지 않는다', async () => {
    await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes'`);

    const right = await login(PASSWORD);
    const wrong = await login('wrongpass1');
    expect(right.status).toBe(401);
    expect(right.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(right.body).toEqual(wrong.body);
    expect(JSON.stringify(right.body)).not.toMatch(/잠|lock/i);
  });

  it('잠겨 있는 동안의 시도는 실패 횟수에 더하지 않는다(잠금이 계속 늘어나지 않음)', async () => {
    await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes'`);
    await login('wrongpass1');
    await login('wrongpass1');
    expect((await userRow()).n).toBe(0);
  });

  it('잠금 시간이 지나면 다시 로그인할 수 있고 잠금 기록이 지워진다', async () => {
    await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() - interval '1 second'`);

    expect((await login(PASSWORD)).status).toBe(200);
    expect(await userRow()).toEqual({ n: 0, locked: null });
  });

  it('잠금이 풀린 뒤 4번 틀려도 다시 잠기지 않고, 5번째에 잠긴다', async () => {
    await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() - interval '1 second'`);
    for (let i = 0; i < 4; i++) await login('wrongpass1');
    expect(new Date((await userRow()).locked).getTime()).toBeLessThan(Date.now());

    await login('wrongpass1');
    expect(new Date((await userRow()).locked).getTime()).toBeGreaterThan(Date.now());
  });

  it('없는 아이디는 아무것도 기록하지 않고 같은 401 을 준다', async () => {
    await user();
    const res = await login(PASSWORD, 'nobody_here');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect((await userRow()).n).toBe(0);
  });

  it('다른 계정은 영향받지 않는다', async () => {
    await user();
    await user('other_user', 'other@example.com');
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes' WHERE username = $1`, [
      USERNAME,
    ]);

    const res = await login(PASSWORD, 'other_user');
    expect(res.status).toBe(200);
  });

  it('잠긴 계정이어도 이미 발급된 세션의 토큰 갱신은 막지 않는다(로그인 시도만 제한)', async () => {
    const { refreshToken } = await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes'`);

    const res = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
  });

  it('비밀번호를 재설정하면 잠금과 실패 횟수가 지워진다', async () => {
    await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes', failed_login_count = 3`);
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    const reset = await http().post('/v1/auth/password/reset').send({
      username: USERNAME,
      code: ctx.mail.resetCodeFor(EMAIL),
      newPassword: 'newpass5678',
    });
    expect(reset.status).toBe(204);
    expect(await userRow()).toEqual({ n: 0, locked: null });
    expect((await login('newpass5678')).status).toBe(200);
  });
});

describe('메일 발송 제한 (이메일 주소 기준)', () => {
  const settle = () => new Promise((r) => setTimeout(r, 60));
  const keyOf = (email: string) =>
    `encode(sha256(convert_to('${email}', 'UTF8')), 'hex')`;
  const mailRows = (): Promise<Array<{ kind: string }>> => ctx.ds.query(`SELECT kind FROM mail_sends`);
  /** 이미 보낸 메일 기록을 모두 주어진 시간만큼 오래된 것으로 만든다 */
  const ageMails = (interval: string) =>
    ctx.ds.query(`UPDATE mail_sends SET created_at = now() - $1::interval`, [interval]);

  it('아이디 찾기는 같은 이메일로 60초 안에 다시 보내지 않고, 지나면 보낸다. 응답은 항상 204', async () => {
    await user();
    const body = { email: EMAIL };
    expect((await http().post('/v1/auth/username/find').send(body)).status).toBe(204);
    expect((await http().post('/v1/auth/username/find').send(body)).status).toBe(204);
    await settle();
    expect(ctx.mail.usernames).toHaveLength(1);

    await ageMails('2 minutes');
    await http().post('/v1/auth/username/find').send(body);
    await settle();
    expect(ctx.mail.usernames).toHaveLength(2);
  });

  it('비밀번호 재설정 코드도 같은 이메일로 60초에 한 통이다', async () => {
    await user();
    const body = { username: USERNAME, email: EMAIL };
    await http().post('/v1/auth/password/forgot').send(body);
    await http().post('/v1/auth/password/forgot').send(body);
    await settle();
    expect(ctx.mail.resets).toHaveLength(1);

    await ageMails('2 minutes');
    await http().post('/v1/auth/password/forgot').send(body);
    await settle();
    expect(ctx.mail.resets).toHaveLength(2);
  });

  it('막힌 비밀번호 재설정 요청은 먼저 받은 코드를 지우지 않는다', async () => {
    await user();
    const body = { username: USERNAME, email: EMAIL };
    await http().post('/v1/auth/password/forgot').send(body);
    const code = ctx.mail.resetCodeFor(EMAIL);
    await http().post('/v1/auth/password/forgot').send(body); // 60초 안이라 막힘

    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code, newPassword: 'newpass5678' });
    expect(res.status).toBe(204);
  });

  it('메일 종류가 달라도 간격 제한을 공유하지 않는다(재설정 직후에도 아이디 찾기 가능)', async () => {
    await user();
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    await settle();
    expect(ctx.mail.resets).toHaveLength(1);
    expect(ctx.mail.usernames).toHaveLength(1);
  });

  it('같은 이메일로 계정을 여러 개 만들어도 이메일 기준으로 센다', async () => {
    await user();
    await user('second_account', EMAIL);
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    await settle();
    expect(ctx.mail.usernames).toHaveLength(1);
    expect(ctx.mail.usernames[0].usernames).toHaveLength(2);
  });

  it('하루 10통을 넘으면 종류와 상관없이 더 보내지 않는다', async () => {
    await user();
    const kinds = ['USERNAME_FIND', 'PASSWORD_RESET'];
    for (let i = 0; i < 10; i++) {
      await ctx.ds.query(
        `INSERT INTO mail_sends (key, kind, created_at) VALUES (${keyOf(EMAIL)}, $1, now() - interval '5 minutes')`,
        [kinds[i % 2]],
      );
    }
    expect((await http().post('/v1/auth/username/find').send({ email: EMAIL })).status).toBe(204);
    expect(
      (await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL })).status,
    ).toBe(204);
    await settle();
    expect(ctx.mail.usernames).toHaveLength(0);
    expect(ctx.mail.resets).toHaveLength(0);
  });

  it('9통까지는 더 보내고, 하루가 지난 기록은 세지 않고 지운다', async () => {
    await user();
    for (let i = 0; i < 9; i++) {
      await ctx.ds.query(
        `INSERT INTO mail_sends (key, kind, created_at) VALUES (${keyOf(EMAIL)}, 'PASSWORD_RESET', now() - interval '5 minutes')`,
      );
    }
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    await settle();
    expect(ctx.mail.usernames).toHaveLength(1);

    await ageMails('25 hours');
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    await settle();
    expect(ctx.mail.resets).toHaveLength(1);
    expect(await mailRows()).toHaveLength(1);
  });

  it('없는 이메일에는 기록도 메일도 남기지 않는다', async () => {
    await http().post('/v1/auth/username/find').send({ email: 'nobody@example.com' });
    await http()
      .post('/v1/auth/password/forgot')
      .send({ username: 'nobody_here', email: 'nobody@example.com' });
    await settle();
    expect(await mailRows()).toHaveLength(0);
    expect(ctx.mail.usernames).toHaveLength(0);
  });

  it('막은 요청과 보낸 요청의 응답이 같다(상태·본문)', async () => {
    await user();
    const sent = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    const blocked = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    expect(blocked.status).toBe(sent.status);
    expect(blocked.body).toEqual(sent.body);
  });

  it('기록에는 이메일 주소 원문이 없고 해시만 있다', async () => {
    await user();
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    const rows = await ctx.ds.query(`SELECT * FROM mail_sends`);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['created_at', 'id', 'key', 'kind']);
    expect(rows[0].key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain('guard@example.com');
  });

  it('같은 이메일로 동시에 요청해도 메일은 한 통만 나간다', async () => {
    await user();
    await Promise.all([
      http().post('/v1/auth/username/find').send({ email: EMAIL }),
      http().post('/v1/auth/username/find').send({ email: EMAIL }),
      http().post('/v1/auth/username/find').send({ email: EMAIL }),
    ]);
    await settle();
    expect(ctx.mail.usernames).toHaveLength(1);
  });
});
