import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';

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

const signupBody = (username = USERNAME) => ({
  username,
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  password: PASSWORD,
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
  ],
});

const user = (username = USERNAME) => register(ctx, signupBody(username));
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
    await user('other_user');
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes' WHERE username = $1`, [
      USERNAME,
    ]);

    const res = await login(PASSWORD, 'other_user');
    expect(res.status).toBe(200);
  });

  it('잠긴 계정은 이미 발급된 세션을 갱신하는 것까지 막지는 않는다(로그인 시도만 제한)', async () => {
    const { refreshToken } = await user();
    await ctx.ds.query(`UPDATE users SET locked_until = now() + interval '3 minutes'`);

    const res = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
  });
});
