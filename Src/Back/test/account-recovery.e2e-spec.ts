import { createHmac } from 'crypto';
import request from 'supertest';
import { registerVerified, startApp, TestContext, usernameOf } from './support/app';

const EMAIL = 'recover@example.com';
const USERNAME = usernameOf(EMAIL);
const PASSWORD = 'abcd1234';
const NEW_PASSWORD = 'newpass5678';

let ctx: TestContext;

/** 매 테스트마다 앱을 새로 띄운다. 레이트 리밋 카운터가 테스트 사이에 섞이지 않도록. */
beforeEach(async () => {
  ctx = await startApp();
});

afterEach(async () => {
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());

const signupBody = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

/** 가입 + 메일 코드 확인까지 끝낸 회원 */
const verifiedUser = (overrides: Record<string, unknown> = {}) =>
  registerVerified(ctx, signupBody(overrides));

const login = (username: string, password: string) =>
  http().post('/v1/auth/login').send({ username, password });

describe('아이디 규칙과 중복 확인', () => {
  it('가입 전에는 사용 가능, 가입 후에는 불가능으로 응답한다', async () => {
    let res = await http().post('/v1/auth/username/check').send({ username: USERNAME });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });

    await verifiedUser();

    res = await http().post('/v1/auth/username/check').send({ username: USERNAME });
    expect(res.body).toEqual({ available: false });
  });

  it('대문자와 앞뒤 공백은 소문자·공백 제거로 맞춰서 비교한다', async () => {
    await verifiedUser();
    const res = await http()
      .post('/v1/auth/username/check')
      .send({ username: `  ${USERNAME.toUpperCase()} ` });
    expect(res.body).toEqual({ available: false });
  });

  it.each([
    ['3자(너무 짧음)', 'abc'],
    ['21자(너무 김)', 'a'.repeat(21)],
    ['숫자로 시작', '1abcd'],
    ['밑줄로 시작', '_abcd'],
    ['한글', '홍길동아이디'],
    ['허용되지 않는 문자', 'ab-cd!'],
    ['공백 포함', 'ab cd'],
  ])('규칙에 맞지 않으면 400 VALIDATION_FAILED: %s', async (_label, username) => {
    const res = await http().post('/v1/auth/username/check').send({ username });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'username' })]),
    );
  });

  it('SQL 구문을 넣어도 500 이 아니라 400 이다', async () => {
    const res = await http().post('/v1/auth/username/check').send({ username: "x'; DROP TABLE users;--" });
    expect(res.status).toBe(400);
  });
});

describe('가입 시 아이디', () => {
  it('아이디 없이 가입하면 400 이다', async () => {
    const { username: _omit, ...withoutUsername } = signupBody();
    const res = await http().post('/v1/auth/signup').send(withoutUsername);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'username' })]),
    );
  });

  it('같은 아이디로 가입하면 409 USERNAME_ALREADY_EXISTS (이메일이 달라도)', async () => {
    await verifiedUser();
    const res = await http()
      .post('/v1/auth/signup')
      .send(signupBody({ email: 'other@example.com' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
  });

  it('같은 이메일이면 아이디가 달라도 409 EMAIL_ALREADY_EXISTS 다', async () => {
    await verifiedUser();
    const res = await http()
      .post('/v1/auth/signup')
      .send(signupBody({ username: 'someone_else' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('대문자로 보내면 소문자로 저장되어 그 아이디로 로그인된다', async () => {
    await registerVerified(ctx, signupBody({ username: 'MixedCase_01' }));
    const stored = await ctx.ds.query('SELECT username FROM users');
    expect(stored[0].username).toBe('mixedcase_01');

    expect((await login('MixedCase_01', PASSWORD)).status).toBe(200);
  });

  it('이메일로는 더 이상 로그인할 수 없다 (로그인은 아이디로만)', async () => {
    await verifiedUser();
    const res = await http().post('/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(400); // username 누락 + email 은 정의되지 않은 필드
  });
});

describe('아이디 찾기', () => {
  it('가입한 이메일로 아이디를 보내고, 응답에는 아이디가 없다', async () => {
    await verifiedUser();
    const res = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(ctx.mail.usernames).toEqual([{ to: EMAIL, username: USERNAME }]);
  });

  it('가입하지 않은 이메일에도 같은 204 를 주고 메일은 보내지 않는다', async () => {
    const res = await http().post('/v1/auth/username/find').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(ctx.mail.usernames).toHaveLength(0);
  });

  it('이메일 인증을 마치지 않은 계정에는 보내지 않는다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const res = await http().post('/v1/auth/username/find').send({ email: EMAIL });
    expect(res.status).toBe(204);
    expect(ctx.mail.usernames).toHaveLength(0);
  });

  it('이메일 형식이 틀리면 400 INVALID_EMAIL_FORMAT', async () => {
    const res = await http().post('/v1/auth/username/find').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EMAIL_FORMAT');
  });

  it('연속으로 요청하면 네 번째부터 429 RATE_LIMITED 다 (메일 폭탄 방지)', async () => {
    await verifiedUser();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await http().post('/v1/auth/username/find').send({ email: EMAIL })).status);
    }
    expect(statuses).toEqual([204, 204, 204, 429]);
  });
});

describe('비밀번호 찾기 1단계: 재설정 코드 요청', () => {
  it('아이디와 이메일이 맞으면 6자리 코드를 보낸다', async () => {
    await verifiedUser();
    const res = await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    expect(res.status).toBe(204);
    expect(ctx.mail.resetCodeFor(EMAIL)).toMatch(/^\d{6}$/);
  });

  it.each([
    ['없는 아이디', { username: 'nobody_here', email: EMAIL }],
    ['아이디는 맞고 이메일이 다름', { username: USERNAME, email: 'wrong@example.com' }],
  ])('%s 이면 같은 204 를 주고 메일은 보내지 않는다 (가입 여부를 드러내지 않음)', async (_label, body) => {
    await verifiedUser();
    const res = await http().post('/v1/auth/password/forgot').send(body);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(ctx.mail.resets).toHaveLength(0);
  });

  it('이메일 인증을 마치지 않은 계정에는 보내지 않는다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const res = await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    expect(res.status).toBe(204);
    expect(ctx.mail.resets).toHaveLength(0);
  });

  it('60초 안에 다시 요청하면 새 메일을 보내지 않고, 지나면 보낸다', async () => {
    await verifiedUser();
    const body = { username: USERNAME, email: EMAIL };
    await http().post('/v1/auth/password/forgot').send(body);
    await http().post('/v1/auth/password/forgot').send(body);
    expect(ctx.mail.resets).toHaveLength(1);

    await ctx.ds.query(
      `UPDATE email_verifications SET created_at = now() - interval '2 minutes' WHERE purpose = 'PASSWORD_RESET'`,
    );
    await http().post('/v1/auth/password/forgot').send(body);
    expect(ctx.mail.resets).toHaveLength(2);
  });

  it('DB 에는 코드 원문이 아니라 64자 해시만, 용도와 함께 저장된다', async () => {
    await verifiedUser();
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    const code = ctx.mail.resetCodeFor(EMAIL);
    const rows = await ctx.ds.query(`SELECT code_hash, purpose FROM email_verifications`);
    expect(rows).toHaveLength(1);
    expect(rows[0].purpose).toBe('PASSWORD_RESET');
    expect(rows[0].code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].code_hash).not.toBe(code);
  });

  it('연속으로 요청하면 네 번째부터 429 RATE_LIMITED 다', async () => {
    await verifiedUser();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push(
        (await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL })).status,
      );
    }
    expect(statuses).toEqual([204, 204, 204, 429]);
  });
});

describe('비밀번호 찾기 2단계: 코드 확인과 새 비밀번호', () => {
  const requestCode = async () => {
    await http().post('/v1/auth/password/forgot').send({ username: USERNAME, email: EMAIL });
    return ctx.mail.resetCodeFor(EMAIL);
  };

  it('맞는 코드로 새 비밀번호를 정하면 204, 새 비밀번호로만 로그인된다', async () => {
    await verifiedUser();
    const code = await requestCode();

    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(204);

    expect((await login(USERNAME, PASSWORD)).status).toBe(401);
    expect((await login(USERNAME, NEW_PASSWORD)).status).toBe(200);
  });

  it('성공하면 기존 세션이 모두 끊긴다 (accessToken 도 즉시 401, refreshToken 도 불가)', async () => {
    const session = await verifiedUser();
    const other = (await login(USERNAME, PASSWORD)).body.tokens; // 다른 기기
    const code = await requestCode();

    await http().post('/v1/auth/password/reset').send({ username: USERNAME, code, newPassword: NEW_PASSWORD });

    for (const tokens of [session, other]) {
      const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${tokens.accessToken}`);
      expect(me.status).toBe(401);
      const refreshed = await http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
      expect(refreshed.status).toBe(401);
    }
  });

  it('한 번 쓴 코드는 다시 쓸 수 없다', async () => {
    await verifiedUser();
    const code = await requestCode();
    const body = { username: USERNAME, code, newPassword: NEW_PASSWORD };

    expect((await http().post('/v1/auth/password/reset').send(body)).status).toBe(204);
    const again = await http().post('/v1/auth/password/reset').send({ ...body, newPassword: 'another9999' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('VERIFICATION_CODE_INVALID');
    expect((await login(USERNAME, NEW_PASSWORD)).status).toBe(200);
  });

  it('틀린 코드는 400 VERIFICATION_CODE_INVALID 이고 비밀번호는 바뀌지 않는다', async () => {
    await verifiedUser();
    const real = await requestCode();
    const wrong = real === '000000' ? '000001' : '000000';

    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code: wrong, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
    expect((await login(USERNAME, PASSWORD)).status).toBe(200);

    const rows = await ctx.ds.query(`SELECT attempts FROM email_verifications WHERE purpose = 'PASSWORD_RESET'`);
    expect(rows[0].attempts).toBe(1);
  });

  it('틀린 입력이 5번 쌓이면 맞는 코드도 받지 못한다 (무차별 대입 차단)', async () => {
    await verifiedUser();
    const real = await requestCode();
    await ctx.ds.query(`UPDATE email_verifications SET attempts = 5 WHERE purpose = 'PASSWORD_RESET'`);

    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code: real, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
    expect((await login(USERNAME, PASSWORD)).status).toBe(200);
  });

  it('만료된 코드는 400 이다', async () => {
    await verifiedUser();
    const code = await requestCode();
    await ctx.ds.query(`UPDATE email_verifications SET expires_at = now() - interval '1 minute'`);

    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
  });

  it('없는 아이디도 코드가 틀린 것과 같은 에러로 응답한다 (가입 여부를 드러내지 않음)', async () => {
    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: 'nobody_here', code: '123456', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
  });

  it('재설정을 요청한 적이 없으면 가입 인증 때 받은 코드를 흉내 내도 통하지 않는다', async () => {
    // 가입 인증 코드는 가입 직후 인증하면서 지워졌다. 재가입 직전 단계의 코드로도 비밀번호는 못 바꾼다.
    await http().post('/v1/auth/signup').send(signupBody());
    const verifyCode = ctx.mail.codeFor(EMAIL);
    await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: verifyCode });

    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code: verifyCode, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect((await login(USERNAME, PASSWORD)).status).toBe(200);
  });

  it('같은 숫자라도 용도가 다르면 해시가 달라서 가입 인증 코드로는 비밀번호를 못 바꾼다', async () => {
    await verifiedUser();
    await requestCode();
    const userId = (await ctx.ds.query('SELECT id FROM users'))[0].id;
    const hashFor = (tag: string, code: string) =>
      createHmac('sha256', process.env.JWT_SECRET!).update(`${tag}:${userId}:${code}`).digest('hex');
    const body = { username: USERNAME, code: '123456', newPassword: NEW_PASSWORD };

    // 가입 인증용(email-verify)으로 계산한 해시가 들어 있으면 같은 숫자를 내도 거부된다
    await ctx.ds.query(`UPDATE email_verifications SET code_hash = $1 WHERE purpose = 'PASSWORD_RESET'`, [
      hashFor('email-verify', '123456'),
    ]);
    expect((await http().post('/v1/auth/password/reset').send(body)).status).toBe(400);

    // 비교 대조: 재설정용(password-reset)으로 계산한 해시면 같은 숫자로 통과한다 (시험 방식 자체가 맞는지 확인)
    await ctx.ds.query(`UPDATE email_verifications SET attempts = 0, code_hash = $1 WHERE purpose = 'PASSWORD_RESET'`, [
      hashFor('password-reset', '123456'),
    ]);
    expect((await http().post('/v1/auth/password/reset').send(body)).status).toBe(204);
  });

  it('새 비밀번호가 규칙(8자 이상, 영문+숫자)에 맞지 않으면 400 이고 코드는 그대로 쓸 수 있다', async () => {
    await verifiedUser();
    const code = await requestCode();

    const bad = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code, newPassword: 'abcdefgh' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'newPassword' })]),
    );

    const ok = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code, newPassword: NEW_PASSWORD });
    expect(ok.status).toBe(204);
  });

  it('코드 형식이 6자리 숫자가 아니면 400 VALIDATION_FAILED', async () => {
    const res = await http()
      .post('/v1/auth/password/reset')
      .send({ username: USERNAME, code: '12345', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('재설정 후 비밀번호 해시가 바뀌고 평문은 저장되지 않는다', async () => {
    await verifiedUser();
    const before = (await ctx.ds.query('SELECT password_hash FROM users'))[0].password_hash;
    const code = await requestCode();
    await http().post('/v1/auth/password/reset').send({ username: USERNAME, code, newPassword: NEW_PASSWORD });

    const after = (await ctx.ds.query('SELECT password_hash FROM users'))[0].password_hash;
    expect(after).not.toBe(before);
    expect(after).not.toContain(NEW_PASSWORD);
    expect(after).toMatch(/^\$2[aby]\$12\$/);
  });
});
