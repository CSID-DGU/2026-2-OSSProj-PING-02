import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';

// #62 내 정보 수정·비밀번호 확인·비밀번호 변경 (설정 H02)
const EMAIL = 'me@example.com';
const USERNAME = usernameOf('me');
const PASSWORD = 'abcd1234';
const NEW_PASSWORD = 'efgh5678';
const WRONG = 'wrong1234';

let ctx: TestContext;

beforeEach(async () => {
  ctx = await startApp();
});

afterEach(async () => {
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());

const signup = () =>
  register(ctx, {
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

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const login = (password: string, deviceId?: string) =>
  http().post('/v1/auth/login').send({ username: USERNAME, password, deviceId });
const verify = (token: string, password: string) =>
  http().post('/v1/users/me/password/verify').set(bearer(token)).send({ password });
const updateMe = (token: string, body: Record<string, unknown>) =>
  http().patch('/v1/users/me').set(bearer(token)).send(body);
const changePassword = (token: string, currentPassword: string, newPassword: string) =>
  http().patch('/v1/users/me/password').set(bearer(token)).send({ currentPassword, newPassword });

const lockRow = async () =>
  (
    await ctx.ds.query(
      `SELECT failed_login_count AS n, locked_until AS locked FROM users WHERE username = $1`,
      [USERNAME],
    )
  )[0];
/** 카카오 계정처럼 비밀번호가 없는 계정으로 만든다 (카카오 로그인은 아직 없어서 DB 로 만든다). */
const removePassword = () =>
  ctx.ds.query(`UPDATE users SET password_hash = NULL WHERE username = $1`, [USERNAME]);

const expectError = (res: request.Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.body.error.code).toBe(code);
};

describe('POST /v1/users/me/password/verify', () => {
  it('맞으면 204, 틀리면 401 INVALID_CREDENTIALS 이고 실패 횟수가 쌓인다', async () => {
    const { accessToken } = await signup();

    expect((await verify(accessToken, PASSWORD)).status).toBe(204);
    expectError(await verify(accessToken, WRONG), 401, 'INVALID_CREDENTIALS');
    expect((await lockRow()).n).toBe(1);
  });

  it('맞히면 실패 횟수가 0으로 돌아간다', async () => {
    const { accessToken } = await signup();
    await verify(accessToken, WRONG);
    await verify(accessToken, WRONG);

    expect((await verify(accessToken, PASSWORD)).status).toBe(204);
    expect(await lockRow()).toEqual({ n: 0, locked: null });
  });

  it('5번 틀리면 잠기고, 맞는 비밀번호도 429 RATE_LIMITED 이며 로그인도 막힌다', async () => {
    const { accessToken } = await signup();
    for (let i = 0; i < 4; i++) expectError(await verify(accessToken, WRONG), 401, 'INVALID_CREDENTIALS');
    // 5번째 실패에서 잠긴다
    expectError(await verify(accessToken, WRONG), 401, 'INVALID_CREDENTIALS');
    expect((await lockRow()).locked).not.toBeNull();

    expectError(await verify(accessToken, PASSWORD), 429, 'RATE_LIMITED');
    // 로그인과 같은 횟수를 쓰므로 로그인도 잠긴다 (로그인은 잠김을 알려 주지 않는다)
    expectError(await login(PASSWORD), 401, 'INVALID_CREDENTIALS');
  });

  it('로그인 실패와 횟수를 합쳐 센다', async () => {
    const { accessToken } = await signup();
    for (let i = 0; i < 3; i++) await login(WRONG);
    await verify(accessToken, WRONG);
    expectError(await verify(accessToken, WRONG), 401, 'INVALID_CREDENTIALS');

    expectError(await verify(accessToken, PASSWORD), 429, 'RATE_LIMITED');
  });

  it('잠금 시간이 지나면 다시 확인할 수 있다', async () => {
    const { accessToken } = await signup();
    await ctx.ds.query(
      `UPDATE users SET locked_until = now() - interval '1 second' WHERE username = $1`,
      [USERNAME],
    );

    expect((await verify(accessToken, PASSWORD)).status).toBe(204);
    expect(await lockRow()).toEqual({ n: 0, locked: null });
  });

  it('비밀번호가 없으면 400 VALIDATION_FAILED', async () => {
    const { accessToken } = await signup();
    expectError(await verify(accessToken, ''), 400, 'VALIDATION_FAILED');
    const res = await http().post('/v1/users/me/password/verify').set(bearer(accessToken)).send({});
    expectError(res, 400, 'VALIDATION_FAILED');
  });

  it('카카오 계정(비밀번호 없음)은 400 no_password', async () => {
    const { accessToken } = await signup();
    await removePassword();

    const res = await verify(accessToken, PASSWORD);
    expectError(res, 400, 'VALIDATION_FAILED');
    expect(res.body.error.details).toEqual([{ field: 'password', reason: 'no_password' }]);
  });

  it('토큰이 없으면 401 UNAUTHORIZED', async () => {
    const res = await http().post('/v1/users/me/password/verify').send({ password: PASSWORD });
    expectError(res, 401, 'UNAUTHORIZED');
  });
});

describe('PATCH /v1/users/me', () => {
  it('보낸 항목만 고치고 GET /users/me 와 같은 형태로 돌려준다', async () => {
    const { accessToken } = await signup();

    const res = await updateMe(accessToken, { password: PASSWORD, email: 'New@Example.com' });
    expect(res.status).toBe(200);
    // 이메일은 가입과 같이 소문자로 맞춘다. 보내지 않은 항목은 그대로다
    expect(res.body).toMatchObject({
      username: USERNAME,
      name: '홍길동',
      email: 'new@example.com',
      birthdate: '1999-01-01',
      gender: 'MALE',
    });

    const me = await http().get('/v1/users/me').set(bearer(accessToken));
    expect(me.body).toEqual(res.body);
  });

  it('이메일·생년월일·성별을 한 번에 고칠 수 있다', async () => {
    const { accessToken } = await signup();

    const res = await updateMe(accessToken, {
      password: PASSWORD,
      email: 'other@example.com',
      birthdate: '2003-02-12',
      gender: 'FEMALE',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'other@example.com',
      birthdate: '2003-02-12',
      gender: 'FEMALE',
    });
  });

  it('바꿀 항목이 없어도 오류 없이 지금 정보를 돌려준다', async () => {
    const { accessToken } = await signup();
    const before = await http().get('/v1/users/me').set(bearer(accessToken));

    const res = await updateMe(accessToken, { password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(before.body);
  });

  it('바꿀 항목이 없어도 비밀번호는 확인한다', async () => {
    const { accessToken } = await signup();
    expectError(await updateMe(accessToken, { password: WRONG }), 401, 'INVALID_CREDENTIALS');
  });

  it('다른 사람과 같은 이메일로 바꿀 수 있다 (가입과 같이 중복을 막지 않음)', async () => {
    await register(ctx, {
      username: usernameOf('other'),
      name: '김철수',
      birthdate: '2000-01-01',
      gender: 'MALE',
      email: 'taken@example.com',
      password: PASSWORD,
      termsAgreements: [
        { termsId: ctx.termsIds.service, agreed: true },
        { termsId: ctx.termsIds.privacy, agreed: true },
      ],
    });
    const { accessToken } = await signup();

    const res = await updateMe(accessToken, { password: PASSWORD, email: 'taken@example.com' });
    expect(res.status).toBe(200);
  });

  it('비밀번호가 틀리면 401 이고 아무것도 바뀌지 않는다', async () => {
    const { accessToken } = await signup();

    expectError(await updateMe(accessToken, { password: WRONG, gender: 'FEMALE' }), 401, 'INVALID_CREDENTIALS');
    const me = await http().get('/v1/users/me').set(bearer(accessToken));
    expect(me.body.gender).toBe('MALE');
    expect((await lockRow()).n).toBe(1);
  });

  it('이메일 계정이 비밀번호를 보내지 않으면 400 required', async () => {
    const { accessToken } = await signup();

    const res = await updateMe(accessToken, { gender: 'FEMALE' });
    expectError(res, 400, 'VALIDATION_FAILED');
    expect(res.body.error.details).toEqual([{ field: 'password', reason: 'required' }]);
  });

  it('잠겨 있으면 429 RATE_LIMITED', async () => {
    const { accessToken } = await signup();
    for (let i = 0; i < 5; i++) await verify(accessToken, WRONG);

    expectError(await updateMe(accessToken, { password: PASSWORD, gender: 'FEMALE' }), 429, 'RATE_LIMITED');
  });

  it.each([
    // 이메일 형식 오류는 회원가입과 같이 INVALID_EMAIL_FORMAT 이다
    ['이메일 형식', { email: 'not-an-email' }, 'INVALID_EMAIL_FORMAT'],
    ['null 이메일', { email: null }, 'INVALID_EMAIL_FORMAT'],
    ['생년월일 형식', { birthdate: '2003/02/12' }, 'VALIDATION_FAILED'],
    ['없는 날짜', { birthdate: '2003-02-30' }, 'VALIDATION_FAILED'],
    ['미래 날짜', { birthdate: '2999-01-01' }, 'VALIDATION_FAILED'],
    ['성별 값', { gender: 'UNKNOWN' }, 'VALIDATION_FAILED'],
    ['null 생년월일', { birthdate: null }, 'VALIDATION_FAILED'],
    ['null 성별', { gender: null }, 'VALIDATION_FAILED'],
    ['이름 수정', { name: '임꺽정' }, 'VALIDATION_FAILED'],
    ['아이디 수정', { username: 'user_changed' }, 'VALIDATION_FAILED'],
  ])('%s → 400 %s', async (_label, body, code) => {
    const { accessToken } = await signup();
    const before = await http().get('/v1/users/me').set(bearer(accessToken));

    expectError(await updateMe(accessToken, { password: PASSWORD, ...body }), 400, code);
    const after = await http().get('/v1/users/me').set(bearer(accessToken));
    expect(after.body).toEqual(before.body);
  });

  it('카카오 계정은 비밀번호 없이 고칠 수 있다', async () => {
    const { accessToken } = await signup();
    await removePassword();

    const res = await updateMe(accessToken, { gender: 'FEMALE' });
    expect(res.status).toBe(200);
    expect(res.body.gender).toBe('FEMALE');
  });

  it('토큰이 없으면 401 UNAUTHORIZED', async () => {
    const res = await http().patch('/v1/users/me').send({ password: PASSWORD, gender: 'FEMALE' });
    expectError(res, 401, 'UNAUTHORIZED');
  });
});

describe('PATCH /v1/users/me/password', () => {
  it('바꾸면 204 이고 새 비밀번호로만 로그인된다', async () => {
    const { accessToken } = await signup();

    expect((await changePassword(accessToken, PASSWORD, NEW_PASSWORD)).status).toBe(204);
    expectError(await login(PASSWORD), 401, 'INVALID_CREDENTIALS');
    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });

  it('지금 기기의 세션은 남고, 다른 기기의 세션은 끊긴다', async () => {
    const here = await signup();
    const other = (await login(PASSWORD, 'other-device')).body.tokens;

    expect((await changePassword(here.accessToken, PASSWORD, NEW_PASSWORD)).status).toBe(204);

    // 지금 기기: 계속 쓰고, 갱신도 된다
    expect((await http().get('/v1/users/me').set(bearer(here.accessToken))).status).toBe(200);
    const refreshed = await http().post('/v1/auth/refresh').send({ refreshToken: here.refreshToken });
    expect(refreshed.status).toBe(200);

    // 다른 기기: accessToken 도 바로 막히고, 갱신도 안 된다
    expectError(await http().get('/v1/users/me').set(bearer(other.accessToken)), 401, 'UNAUTHORIZED');
    const otherRefresh = await http().post('/v1/auth/refresh').send({ refreshToken: other.refreshToken });
    expectError(otherRefresh, 401, 'REFRESH_TOKEN_INVALID');
  });

  it('바꾸면 실패 횟수가 지워진다', async () => {
    const { accessToken } = await signup();
    await login(WRONG);
    await login(WRONG);

    expect((await changePassword(accessToken, PASSWORD, NEW_PASSWORD)).status).toBe(204);
    expect(await lockRow()).toEqual({ n: 0, locked: null });
  });

  it('현재 비밀번호가 틀리면 401 이고 바뀌지 않으며, 다른 기기도 끊기지 않는다', async () => {
    const here = await signup();
    const other = (await login(PASSWORD, 'other-device')).body.tokens;

    expectError(await changePassword(here.accessToken, WRONG, NEW_PASSWORD), 401, 'INVALID_CREDENTIALS');
    expect((await login(PASSWORD)).status).toBe(200);
    expect((await http().get('/v1/users/me').set(bearer(other.accessToken))).status).toBe(200);
  });

  it('지금과 같은 비밀번호면 400 same_as_current', async () => {
    const { accessToken } = await signup();

    const res = await changePassword(accessToken, PASSWORD, PASSWORD);
    expectError(res, 400, 'VALIDATION_FAILED');
    expect(res.body.error.details).toEqual([{ field: 'newPassword', reason: 'same_as_current' }]);
  });

  it.each([
    ['8자 미만', 'abc123'],
    ['숫자 없음', 'abcdefgh'],
    ['영문 없음', '12345678'],
    ['72자 초과', `a1${'b'.repeat(71)}`],
  ])('새 비밀번호 규칙 위반(%s) → 400', async (_label, newPassword) => {
    const { accessToken } = await signup();

    expectError(await changePassword(accessToken, PASSWORD, newPassword), 400, 'VALIDATION_FAILED');
    expect((await login(PASSWORD)).status).toBe(200);
  });

  it('잠겨 있으면 429 RATE_LIMITED', async () => {
    const { accessToken } = await signup();
    for (let i = 0; i < 5; i++) await login(WRONG);

    expectError(await changePassword(accessToken, PASSWORD, NEW_PASSWORD), 429, 'RATE_LIMITED');
  });

  it('카카오 계정은 400 no_password', async () => {
    const { accessToken } = await signup();
    await removePassword();

    const res = await changePassword(accessToken, PASSWORD, NEW_PASSWORD);
    expectError(res, 400, 'VALIDATION_FAILED');
    expect(res.body.error.details).toEqual([{ field: 'currentPassword', reason: 'no_password' }]);
  });

  it('토큰이 없으면 401 UNAUTHORIZED', async () => {
    const res = await http()
      .patch('/v1/users/me/password')
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expectError(res, 401, 'UNAUTHORIZED');
  });
});
