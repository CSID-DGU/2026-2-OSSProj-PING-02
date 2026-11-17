import request from 'supertest';
import { registerVerified, startApp, TestContext, usernameOf } from './support/app';

const EMAIL = 'guard@example.com';
const USERNAME = usernameOf(EMAIL);
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

const signupBody = () => ({
  username: USERNAME,
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  email: EMAIL,
  password: PASSWORD,
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
  ],
});

const verifiedUser = () => registerVerified(ctx, signupBody());
const login = (password: string) => http().post('/v1/auth/login').send({ username: USERNAME, password });
const userRow = async () =>
  (await ctx.ds.query(`SELECT failed_login_count AS n, locked_until AS locked FROM users`))[0];
const mailRows = (): Promise<Array<{ kind: string }>> => ctx.ds.query(`SELECT kind FROM mail_sends`);
/** 이미 보낸 메일 기록을 모두 주어진 시간만큼 오래된 것으로 만든다 */
const ageMails = (interval: string) =>
  ctx.ds.query(`UPDATE mail_sends SET created_at = now() - $1::interval`, [interval]);

describe('로그인 실패 잠금 (계정 기준)', () => {
  it('비밀번호를 틀릴 때마다 실패 횟수가 쌓이고, 로그인에 성공하면 0으로 돌아간다', async () => {
    await verifiedUser();
    for (let i = 0; i < 3; i++) expect((await login('wrongpass1')).status).toBe(401);
    expect((await userRow()).n).toBe(3);

    expect((await login(PASSWORD)).status).toBe(200);
    expect(await userRow()).toEqual({ n: 0, locked: null });
  });

  it('5회 연속 틀리면 잠기고 실패 횟수는 0으로 돌아간다', async () => {
    await verifiedUser();
    for (let i = 0; i < 5; i++) expect((await login('wrongpass1')).status).toBe(401);

    const row = await userRow();
    expect(row.n).toBe(0);
    const remainMs = new Date(row.locked).getTime() - Date.now();
    expect(remainMs).toBeGreaterThan(4 * 60_000);
    expect(remainMs).toBeLessThanOrEqual(5 * 60_000);
  });

  it('잠겨 있으면 비밀번호가 맞아도 같은 401 INVALID_CREDENTIALS 이고, 잠김을 알려 주지 않는다', async () => {
    await verifiedUser();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '10 minutes'`);

    const right = await login(PASSWORD);
    const wrong = await login('wrongpass1');
    expect(right.status).toBe(401);
    expect(right.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(right.body).toEqual(wrong.body);
    expect(JSON.stringify(right.body)).not.toMatch(/잠|lock/i);
  });

  it('잠겨 있는 동안의 시도는 실패 횟수에 더하지 않는다(잠금이 계속 늘어나지 않음)', async () => {
    await verifiedUser();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '10 minutes'`);
    await login('wrongpass1');
    await login('wrongpass1');
    expect((await userRow()).n).toBe(0);
  });

  it('잠금 시간이 지나면 다시 로그인할 수 있고 잠금 기록이 지워진다', async () => {
    await verifiedUser();
    await ctx.ds.query(`UPDATE users SET locked_until = now() - interval '1 second'`);

    expect((await login(PASSWORD)).status).toBe(200);
    expect(await userRow()).toEqual({ n: 0, locked: null });
  });

  it('잠금이 풀린 뒤 4번 틀려도 다시 잠기지 않고, 5번째에 잠긴다', async () => {
    await verifiedUser();
    await ctx.ds.query(`UPDATE users SET locked_until = now() - interval '1 second'`);
    for (let i = 0; i < 4; i++) await login('wrongpass1');
    expect(new Date((await userRow()).locked).getTime()).toBeLessThan(Date.now());

    await login('wrongpass1');
    expect(new Date((await userRow()).locked).getTime()).toBeGreaterThan(Date.now());
  });

  it('없는 아이디는 아무것도 기록하지 않고 같은 401 을 준다', async () => {
    await verifiedUser();
    const res = await http().post('/v1/auth/login').send({ username: 'nobody_here', password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect((await userRow()).n).toBe(0);
  });

  it('다른 계정은 영향받지 않는다', async () => {
    await verifiedUser();
    await registerVerified(ctx, {
      ...signupBody(),
      username: 'other_user',
      email: 'other@example.com',
    });
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '10 minutes' WHERE username = $1`, [
      USERNAME,
    ]);

    const res = await http().post('/v1/auth/login').send({ username: 'other_user', password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('비밀번호를 재설정하면 잠금과 실패 횟수가 지워진다', async () => {
    await verifiedUser();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '10 minutes', failed_login_count = 3`);
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

  it('인증 전 계정도 틀린 비밀번호는 실패로 센다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    await login('wrongpass1');
    expect((await userRow()).n).toBe(1);
  });
});

describe('메일 발송 제한 (계정 기준)', () => {
  it('가입하면 인증 메일 기록이 하나 남고, 주소·코드는 저장하지 않는다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    expect(await mailRows()).toEqual([{ kind: 'EMAIL_VERIFY' }]);
    const cols = await ctx.ds.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'mail_sends' ORDER BY column_name`,
    );
    expect(cols.map((c: { column_name: string }) => c.column_name)).toEqual([
      'created_at',
      'id',
      'kind',
      'user_id',
    ]);
  });

  it('인증 메일 재발송은 60초 안에는 보내지 않고, 지나면 보낸다. 응답은 항상 204', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const first = await http().post('/v1/auth/email/resend').send({ email: EMAIL });
    expect(first.status).toBe(204);
    expect(ctx.mail.sent).toHaveLength(1);

    await ageMails('2 minutes');
    const second = await http().post('/v1/auth/email/resend').send({ email: EMAIL });
    expect(second.status).toBe(204);
    expect(ctx.mail.sent).toHaveLength(2);
  });

  it('막힌 재발송은 기존 코드를 지우지 않는다(받은 코드가 계속 유효)', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const code = ctx.mail.codeFor(EMAIL);
    await http().post('/v1/auth/email/resend').send({ email: EMAIL });
    const ok = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code });
    expect(ok.status).toBe(200);
  });

  it('아이디 찾기는 같은 이메일로 60초 안에 다시 보내지 않고, 지나면 보낸다', async () => {
    await verifiedUser();
    const body = { email: EMAIL };
    expect((await http().post('/v1/auth/username/find').send(body)).status).toBe(204);
    expect((await http().post('/v1/auth/username/find').send(body)).status).toBe(204);
    await new Promise((r) => setTimeout(r, 50));
    expect(ctx.mail.usernames).toHaveLength(1);

    await ageMails('2 minutes');
    await http().post('/v1/auth/username/find').send(body);
    await new Promise((r) => setTimeout(r, 50));
    expect(ctx.mail.usernames).toHaveLength(2);
  });

  it('메일 종류가 달라도 간격 제한을 공유하지 않는다(재설정 직후에도 아이디 찾기 가능)', async () => {
    await verifiedUser();
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    await new Promise((r) => setTimeout(r, 50));
    expect(ctx.mail.resets).toHaveLength(1);
    expect(ctx.mail.usernames).toHaveLength(1);
  });

  it('하루 10통을 넘으면 종류와 상관없이 더 보내지 않는다', async () => {
    await verifiedUser();
    const kinds = ['USERNAME_FIND', 'PASSWORD_RESET'];
    for (let i = 0; i < 10; i++) {
      await ctx.ds.query(
        `INSERT INTO mail_sends (user_id, kind, created_at) SELECT id, $1, now() - interval '5 minutes' FROM users`,
        [kinds[i % 2]],
      );
    }
    const res = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    expect(res.status).toBe(204);
    const forgot = await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    expect(forgot.status).toBe(204);
    await new Promise((r) => setTimeout(r, 50));
    expect(ctx.mail.usernames).toHaveLength(0);
    expect(ctx.mail.resets).toHaveLength(0);
  });

  it('10번째 통까지는 보내고, 하루가 지난 기록은 세지 않고 지운다', async () => {
    await verifiedUser(); // 가입 인증 메일이 이미 1통으로 기록되어 있다
    for (let i = 0; i < 8; i++) {
      await ctx.ds.query(
        `INSERT INTO mail_sends (user_id, kind, created_at) SELECT id, 'PASSWORD_RESET', now() - interval '5 minutes' FROM users`,
      );
    }
    await http().post('/v1/auth/username/find').send({ email: EMAIL });
    await new Promise((r) => setTimeout(r, 50));
    expect(ctx.mail.usernames).toHaveLength(1);

    await ageMails('25 hours');
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    await new Promise((r) => setTimeout(r, 50));
    expect(ctx.mail.resets).toHaveLength(1);
    expect(await mailRows()).toHaveLength(1);
  });

  it('없는 이메일이나 인증 전 이메일에는 기록도 메일도 남기지 않는다', async () => {
    await http().post('/v1/auth/username/find').send({ email: 'nobody@example.com' });
    await http()
      .post('/v1/auth/password/forgot')
      .send({ username: 'nobody_here', email: 'nobody@example.com' });
    await http().post('/v1/auth/email/resend').send({ email: 'nobody@example.com' });
    expect(await mailRows()).toHaveLength(0);
    expect(ctx.mail.usernames).toHaveLength(0);
  });

  it('막힌 요청과 보낸 요청의 응답이 같다(상태·본문)', async () => {
    await verifiedUser();
    const sent = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    const blocked = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    expect(blocked.status).toBe(sent.status);
    expect(blocked.body).toEqual(sent.body);
  });

  it('회원을 지우면 메일 기록도 함께 지워진다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    await ctx.ds.query(`DELETE FROM users`);
    expect(await mailRows()).toHaveLength(0);
  });

  it('동시에 같은 계정으로 요청해도 메일은 한 통만 나간다', async () => {
    await verifiedUser();
    await Promise.all([
      http().post('/v1/auth/username/find').send({ email: EMAIL }),
      http().post('/v1/auth/username/find').send({ email: EMAIL }),
      http().post('/v1/auth/username/find').send({ email: EMAIL }),
    ]);
    await new Promise((r) => setTimeout(r, 100));
    expect(ctx.mail.usernames).toHaveLength(1);
  });
});
