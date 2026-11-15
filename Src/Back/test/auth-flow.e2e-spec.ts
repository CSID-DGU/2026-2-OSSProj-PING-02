import request from 'supertest';
import { registerVerified, startApp, TestContext } from './support/app';

const EMAIL = 'flow@example.com';
const PASSWORD = 'abcd1234';

let ctx: TestContext;

/** 매 테스트마다 앱을 새로 띄운다. 레이트 리밋 카운터가 테스트 사이에 섞이지 않도록. */
beforeEach(async () => {
  ctx = await startApp();
});

afterEach(async () => {
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());

const signupBody = (email = EMAIL, password = PASSWORD) => ({
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  email,
  password,
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
  ],
});

/** 가입 + 메일 코드 확인까지 끝낸 회원을 만든다. */
const signup = (email = EMAIL) => registerVerified(ctx, signupBody(email));

async function countRows(table: string): Promise<number> {
  const rows = await ctx.ds.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return rows[0].n;
}

describe('이메일 중복 확인', () => {
  it('가입 전에는 사용 가능, 가입 후에는 불가능으로 응답한다', async () => {
    let res = await http().post('/v1/auth/email/check').send({ email: EMAIL });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });

    await signup();

    res = await http().post('/v1/auth/email/check').send({ email: EMAIL });
    expect(res.body).toEqual({ available: false });
  });

  it('형식이 틀리면 INVALID_EMAIL_FORMAT 으로 응답한다', async () => {
    const res = await http().post('/v1/auth/email/check').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EMAIL_FORMAT');
  });
});

describe('회원가입', () => {
  it('성공하면 201 과 인증 필요 표시를 주고, 토큰은 주지 않는다. 인증 메일은 해당 주소로 간다', async () => {
    const res = await http().post('/v1/auth/signup').send(signupBody());
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: '홍길동', email: EMAIL });
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.tokens).toBeUndefined();

    expect(ctx.mail.codeFor(EMAIL)).toMatch(/^\d{6}$/);
  });

  it('같은 이메일이면 409 EMAIL_ALREADY_EXISTS', async () => {
    await signup();
    const res = await http().post('/v1/auth/signup').send(signupBody());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('필수 약관에 동의하지 않으면 422 REQUIRED_TERMS_NOT_AGREED', async () => {
    const body = { ...signupBody(), termsAgreements: [{ termsId: ctx.termsIds.service, agreed: false }] };
    const res = await http().post('/v1/auth/signup').send(body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REQUIRED_TERMS_NOT_AGREED');
  });

  it('비밀번호가 영문+숫자 8자 규칙을 어기면 400 VALIDATION_FAILED', async () => {
    const res = await http().post('/v1/auth/signup').send(signupBody(EMAIL, 'abcdefgh'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'password' })]),
    );
  });

  it('인증 메일 발송에 실패하면 503 이고 회원은 만들어지지 않는다 (롤백)', async () => {
    ctx.mail.failNext = true;
    const res = await http().post('/v1/auth/signup').send(signupBody());
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(await countRows('users')).toBe(0);
    expect(await countRows('terms_agreements')).toBe(0);

    // 다시 가입하면 정상으로 된다
    const retry = await http().post('/v1/auth/signup').send(signupBody());
    expect(retry.status).toBe(201);
  });
});

describe('이메일 인증', () => {
  it('인증 전에는 비밀번호가 맞아도 로그인이 403 EMAIL_NOT_VERIFIED 로 막힌다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const res = await http().post('/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('인증 전 틀린 비밀번호는 401 이다 (인증 여부를 먼저 드러내지 않는다)', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const res = await http().post('/v1/auth/login').send({ email: EMAIL, password: 'wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('맞는 코드를 입력하면 인증되고 토큰을 받으며, 이후 로그인이 된다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const res = await http()
      .post('/v1/auth/email/verify')
      .send({ email: EMAIL, code: ctx.mail.codeFor(EMAIL) });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();

    const login = await http().post('/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it('틀린 코드는 400 VERIFICATION_CODE_INVALID 이다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const real = ctx.mail.codeFor(EMAIL);
    const wrong = real === '000000' ? '000001' : '000000';

    const res = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: wrong });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
  });

  it('틀린 입력이 5번 쌓이면 맞는 코드도 받지 못한다 (무차별 대입 차단)', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const real = ctx.mail.codeFor(EMAIL);
    const wrong = real === '000000' ? '000001' : '000000';

    for (let i = 0; i < 5; i++) {
      await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: wrong });
    }
    const res = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: real });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
  });

  it('만료된 코드는 400 이다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    await ctx.ds.query(`UPDATE email_verifications SET expires_at = now() - interval '1 minute'`);

    const res = await http()
      .post('/v1/auth/email/verify')
      .send({ email: EMAIL, code: ctx.mail.codeFor(EMAIL) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_INVALID');
  });

  it('인증이 끝난 코드는 다시 쓸 수 없다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const code = ctx.mail.codeFor(EMAIL);
    await http().post('/v1/auth/email/verify').send({ email: EMAIL, code });

    const again = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code });
    expect(again.status).toBe(400);
  });

  it('재발송하면 새 코드가 가고, 이전 코드는 더 이상 통하지 않는다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const first = ctx.mail.codeFor(EMAIL);

    const resend = await http().post('/v1/auth/email/resend').send({ email: EMAIL });
    expect(resend.status).toBe(204);
    const second = ctx.mail.codeFor(EMAIL);
    expect(ctx.mail.sent.filter((m) => m.to === EMAIL)).toHaveLength(2);

    if (first !== second) {
      const old = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: first });
      expect(old.status).toBe(400);
    }
    const ok = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: second });
    expect(ok.status).toBe(200);
  });

  it('재발송은 없는 이메일에도 같은 204 를 준다 (가입 여부를 드러내지 않음)', async () => {
    const res = await http().post('/v1/auth/email/resend').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(204);
    expect(ctx.mail.sent).toHaveLength(0);
  });

  it('코드 형식이 6자리 숫자가 아니면 400 VALIDATION_FAILED', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const res = await http().post('/v1/auth/email/verify').send({ email: EMAIL, code: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('DB 에는 코드 원문이 아니라 64자 해시만 저장된다', async () => {
    await http().post('/v1/auth/signup').send(signupBody());
    const code = ctx.mail.codeFor(EMAIL);
    const rows = await ctx.ds.query('SELECT code_hash FROM email_verifications');
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].code_hash).not.toBe(code);
  });
});

describe('로그인과 내 정보', () => {
  it('맞는 비밀번호로 로그인하면 200 과 토큰을 준다', async () => {
    await signup();
    const res = await http().post('/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });

  it('비밀번호가 틀리면 401 INVALID_CREDENTIALS', async () => {
    await signup();
    const res = await http().post('/v1/auth/login').send({ email: EMAIL, password: 'wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('없는 이메일도 같은 INVALID_CREDENTIALS 로 응답한다 (계정 존재 여부를 숨긴다)', async () => {
    const res = await http().post('/v1/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('토큰 없이 /users/me 를 부르면 401, 토큰이 있으면 내 정보를 준다', async () => {
    const { accessToken } = await signup();

    let res = await http().get('/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    res = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: EMAIL, provider: 'EMAIL', gender: 'MALE' });
  });
});

describe('토큰 갱신과 로그아웃 (세션 기준)', () => {
  it('refresh 하면 새 토큰을 주고, 이전 refreshToken 재사용은 401 이다', async () => {
    const { refreshToken } = await signup();

    const first = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(refreshToken);

    const reuse = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('갱신해도 같은 세션이라서 이전 accessToken 은 계속 유효하다', async () => {
    const { accessToken, refreshToken } = await signup();
    const refreshed = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);

    const old = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(old.status).toBe(200);

    const fresh = await http()
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    expect(fresh.status).toBe(200);
  });

  it('재사용이 감지되면 그 세션의 accessToken 도 즉시 무효가 된다', async () => {
    const { refreshToken } = await signup();
    const rotated = await http().post('/v1/auth/refresh').send({ refreshToken });
    await http().post('/v1/auth/refresh').send({ refreshToken }); // 재사용 → 세션 폐기

    const res = await http()
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${rotated.body.accessToken}`);
    expect(res.status).toBe(401);
  });

  it('로그아웃하면 204, 그 refreshToken 은 쓸 수 없고, accessToken 도 즉시 401 이다', async () => {
    const { accessToken, refreshToken } = await signup();

    const out = await http()
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(out.status).toBe(204);

    const refresh = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);

    const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHORIZED');
  });

  it('로그아웃은 그 기기 세션만 끊고, 다른 기기 세션은 그대로 둔다', async () => {
    const phone = await signup();
    const login = await http()
      .post('/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD, deviceId: 'tablet-1' });
    const tablet = login.body.tokens;

    await http()
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${phone.accessToken}`)
      .send({ refreshToken: phone.refreshToken });

    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${tablet.accessToken}`);
    expect(res.status).toBe(200);
  });
});

describe('약관 재동의', () => {
  it('동의를 보내면 204, 내 정보의 약관 목록에 버전이 함께 나온다', async () => {
    const { accessToken } = await signup();

    const res = await http()
      .post('/v1/users/me/terms-agreements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ termsAgreements: [{ termsId: ctx.termsIds.service, agreed: true }] });
    expect(res.status).toBe(204);

    const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.body.termsAgreements).toEqual(
      expect.arrayContaining([expect.objectContaining({ termsId: ctx.termsIds.service, version: '1.0.0' })]),
    );
  });
});

describe('회원 탈퇴', () => {
  it('비밀번호를 빼면 400, 틀리면 401, 맞으면 204 이고 이후 로그인과 조회가 실패한다', async () => {
    const { accessToken } = await signup();
    const auth = { Authorization: `Bearer ${accessToken}` };

    let res = await http().delete('/v1/users/me').set(auth).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');

    res = await http().delete('/v1/users/me').set(auth).send({ password: 'wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');

    res = await http().delete('/v1/users/me').set(auth).send({ password: PASSWORD });
    expect(res.status).toBe(204);

    res = await http().post('/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(401);

    res = await http().get('/v1/users/me').set(auth);
    expect(res.status).toBe(401);
  });
});

describe('앱 버전과 모델', () => {
  it('현재 버전이 최소 지원 버전 이상이면 forceUpdate 가 false 다', async () => {
    const res = await http().get('/v1/app/version').query({ platform: 'android', appVersion: '1.0.0' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ latestVersion: '1.0.0', forceUpdate: false });
  });

  it('최소 지원 버전보다 낮으면 forceUpdate 가 true 다', async () => {
    const res = await http().get('/v1/app/version').query({ platform: 'android', appVersion: '0.9.0' });
    expect(res.body.forceUpdate).toBe(true);
  });

  it('활성 모델이 없으면 모델 조회는 404 MODEL_NOT_FOUND (모델 배포는 아직 제외)', async () => {
    const { accessToken } = await signup();
    const res = await http()
      .get('/v1/models/latest')
      .query({ platform: 'android', appVersion: '1.0.0' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MODEL_NOT_FOUND');
  });
});

describe('공통 에러 형식', () => {
  it('없는 경로는 명세 형식의 404 로 응답한다', async () => {
    const res = await http().get('/v1/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
