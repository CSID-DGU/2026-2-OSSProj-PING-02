import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';

const USERNAME = usernameOf('flow');
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

const signupBody = (username = USERNAME, password = PASSWORD) => ({
  username,
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  password,
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
  ],
});

/** 가입하고 토큰을 받은 회원을 만든다. */
const signup = (username = USERNAME) => register(ctx, signupBody(username));

async function countRows(table: string): Promise<number> {
  const rows = await ctx.ds.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return rows[0].n;
}

describe('아이디 중복 확인', () => {
  it('가입 전에는 사용 가능, 가입 후에는 불가능으로 응답한다', async () => {
    let res = await http().post('/v1/auth/username/check').send({ username: USERNAME });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });

    await signup();

    res = await http().post('/v1/auth/username/check').send({ username: USERNAME });
    expect(res.body).toEqual({ available: false });
  });

  it('대문자와 앞뒤 공백은 소문자·공백 제거로 맞춰서 비교한다', async () => {
    await signup();
    const res = await http()
      .post('/v1/auth/username/check')
      .send({ username: `  ${USERNAME.toUpperCase()} ` });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it.each(['abc', 'Abc!defg', '1abcdef', 'a'.repeat(21), '한글아이디1234', 'ab cd_ef'])(
    '규칙에 맞지 않는 아이디(%s)는 400 VALIDATION_FAILED',
    async (username) => {
      const res = await http().post('/v1/auth/username/check').send({ username });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    },
  );
});

describe('회원가입', () => {
  it('성공하면 201 과 토큰을 바로 준다. 응답에 이메일은 없다', async () => {
    const res = await http().post('/v1/auth/signup').send(signupBody());
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), username: USERNAME, name: '홍길동' });
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
    expect(res.body.verificationRequired).toBeUndefined();
  });

  it('가입하자마자 받은 토큰으로 내 정보를 볼 수 있다', async () => {
    const { accessToken } = await signup();
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('같은 아이디면 409 USERNAME_ALREADY_EXISTS', async () => {
    await signup();
    const res = await http().post('/v1/auth/signup').send(signupBody());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
    expect(await countRows('users')).toBe(1);
  });

  it('대문자로 같은 아이디를 가입해도 중복으로 본다', async () => {
    await signup();
    const res = await http().post('/v1/auth/signup').send(signupBody(USERNAME.toUpperCase()));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
  });

  it('필수 약관에 동의하지 않으면 422 REQUIRED_TERMS_NOT_AGREED', async () => {
    const body = { ...signupBody(), termsAgreements: [{ termsId: ctx.termsIds.service, agreed: false }] };
    const res = await http().post('/v1/auth/signup').send(body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REQUIRED_TERMS_NOT_AGREED');
    expect(await countRows('users')).toBe(0);
  });

  it('비밀번호가 영문+숫자 8자 규칙을 어기면 400 VALIDATION_FAILED', async () => {
    const res = await http().post('/v1/auth/signup').send(signupBody(USERNAME, 'abcdefgh'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'password' })]),
    );
  });

  it('이메일 필드를 보내면 400 으로 거부한다 (이메일은 받지 않는다)', async () => {
    const res = await http()
      .post('/v1/auth/signup')
      .send({ ...signupBody(), email: 'user@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(await countRows('users')).toBe(0);
  });

  it('같은 아이디로 동시에 가입하면 한 명만 만들어지고 나머지는 409 이다', async () => {
    const results = await Promise.all([
      http().post('/v1/auth/signup').send(signupBody()),
      http().post('/v1/auth/signup').send(signupBody()),
      http().post('/v1/auth/signup').send(signupBody()),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    expect(await countRows('users')).toBe(1);
  });

  it('이메일 인증·재발송 경로는 더 이상 없다', async () => {
    for (const path of ['/v1/auth/email/check', '/v1/auth/email/verify', '/v1/auth/email/resend']) {
      const res = await http().post(path).send({});
      expect(res.status).toBe(404);
    }
  });
});

describe('로그인과 내 정보', () => {
  it('맞는 비밀번호로 로그인하면 200 과 토큰을 준다', async () => {
    await signup();
    const res = await http().post('/v1/auth/login').send({ username: USERNAME, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.user.username).toBe(USERNAME);
  });

  it('대문자로 입력해도 같은 아이디로 로그인된다', async () => {
    await signup();
    const res = await http()
      .post('/v1/auth/login')
      .send({ username: ` ${USERNAME.toUpperCase()} `, password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('비밀번호가 틀리면 401 INVALID_CREDENTIALS', async () => {
    await signup();
    const res = await http().post('/v1/auth/login').send({ username: USERNAME, password: 'wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('없는 아이디도 같은 INVALID_CREDENTIALS 로 응답한다 (계정 존재 여부를 숨긴다)', async () => {
    await signup();
    const wrongPw = await http().post('/v1/auth/login').send({ username: USERNAME, password: 'wrong1234' });
    const noUser = await http().post('/v1/auth/login').send({ username: 'nobody', password: PASSWORD });
    expect(noUser.status).toBe(401);
    expect(noUser.body).toEqual(wrongPw.body);
  });

  it('이메일로 로그인하려는 요청은 400 이다', async () => {
    await signup();
    const res = await http()
      .post('/v1/auth/login')
      .send({ email: 'user@example.com', password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('토큰 없이 /users/me 를 부르면 401, 토큰이 있으면 내 정보를 준다(이메일 없음)', async () => {
    const { accessToken } = await signup();

    let res = await http().get('/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    res = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: USERNAME, provider: 'EMAIL', gender: 'MALE' });
    expect(res.body.email).toBeUndefined();
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

  it('갱신할 때마다 만료일이 그 시점부터 다시 계산된다 (자주 쓰면 로그인이 유지됨)', async () => {
    const { refreshToken } = await signup();
    await ctx.ds.query(`UPDATE refresh_tokens SET expires_at = now() + interval '1 day'`);

    const refreshed = await http().post('/v1/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);

    const rows = await ctx.ds.query(
      `SELECT (expires_at > now() + interval '29 days') AS long FROM refresh_tokens WHERE replaced_by IS NULL AND revoked_at IS NULL`,
    );
    expect(rows).toEqual([{ long: true }]);
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

  it('같은 refreshToken 으로 동시에 갱신하면 한쪽만 성공한다', async () => {
    const { refreshToken } = await signup();
    const results = await Promise.all([
      http().post('/v1/auth/refresh').send({ refreshToken }),
      http().post('/v1/auth/refresh').send({ refreshToken }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
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
      .send({ username: USERNAME, password: PASSWORD, deviceId: 'tablet-1' });
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

    res = await http().post('/v1/auth/login').send({ username: USERNAME, password: PASSWORD });
    expect(res.status).toBe(401);

    res = await http().get('/v1/users/me').set(auth);
    expect(res.status).toBe(401);
  });

  it('탈퇴하면 같은 아이디로 다시 가입할 수 있다', async () => {
    const { accessToken } = await signup();
    await http()
      .delete('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: PASSWORD });

    const again = await http().post('/v1/auth/signup').send(signupBody());
    expect(again.status).toBe(201);
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
