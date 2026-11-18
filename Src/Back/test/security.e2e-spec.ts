import { createHmac } from 'crypto';
import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';

const PASSWORD = 'abcd1234';
const USERNAME = usernameOf('sec@example.com');
let ctx: TestContext;

beforeEach(async () => {
  ctx = await startApp();
});

afterEach(async () => {
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());
const JSON_TYPE = 'application/json';

function signupBody(overrides: Record<string, unknown> = {}) {
  const email = String(overrides.email ?? 'sec@example.com');
  return {
    username: usernameOf(email),
    name: '홍길동',
    birthdate: '1999-01-01',
    gender: 'MALE',
    email,
    password: PASSWORD,
    termsAgreements: [
      { termsId: ctx.termsIds.service, agreed: true },
      { termsId: ctx.termsIds.privacy, agreed: true },
    ],
    ...overrides,
  };
}

/** 가입하고 토큰을 받은 회원을 만든다. 토큰이 필요한 테스트용. */
async function signup(overrides: Record<string, unknown> = {}) {
  const v = await register(ctx, signupBody(overrides));
  return { user: { id: v.userId }, tokens: { accessToken: v.accessToken, refreshToken: v.refreshToken } };
}

async function countRows(table: string): Promise<number> {
  const rows = await ctx.ds.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return rows[0].n;
}

/** 서명 검증용 JWT를 직접 만든다. 공격 시나리오(위조, 만료)를 재현하기 위해서다. */
function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}
function forgeJwt(payload: object, secret: string | null, alg = 'HS256'): string {
  const header = b64url(JSON.stringify({ alg, typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  if (secret === null) return `${header}.${body}.`; // alg none
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

describe('1. 인젝션: 입력값이 SQL·NoSQL·스크립트로 해석되지 않는다', () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "admin'--",
    "'; DROP TABLE users; --",
    "1' UNION SELECT password_hash FROM users --",
  ];

  it.each(sqlPayloads)('로그인 아이디에 %s 를 넣어도 구문으로 해석되지 않고 401, DB 는 그대로다', async (payload) => {
    await signup();
    const before = await countRows('users');

    const res = await http().post('/v1/auth/login').send({ username: payload, password: PASSWORD });
    // 파라미터로만 쓰이므로 그냥 없는 아이디로 취급된다 (500 이나 우회 로그인이 아니다)
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(await countRows('users')).toBe(before);
  });

  it('아이디·이메일 입력에 SQL 구문을 넣어도 500 이 나오지 않는다', async () => {
    let res = await http().post('/v1/auth/username/check').send({ username: "x'); DROP TABLE users;--" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');

    res = await http().post('/v1/auth/username/find').send({ email: "x'); DROP TABLE users;--" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EMAIL_FORMAT');
  });

  it('이름에 SQL 구문이 들어가면 문자 그대로 저장되고 테이블은 살아 있다', async () => {
    const name = "Robert'); DROP TABLE users;--";
    const res = await http().post('/v1/auth/signup').send(signupBody({ name: name.slice(0, 50) }));
    expect(res.status).toBe(201);

    const usersCount = await countRows('users');
    expect(usersCount).toBe(1);
    const stored = await ctx.ds.query('SELECT name FROM users');
    expect(stored[0].name).toBe(name.slice(0, 50));
  });

  it('NoSQL 스타일 객체·배열을 아이디나 비밀번호로 보내면 400 이다', async () => {
    await signup();
    let res = await http().post('/v1/auth/login').send({ username: { $ne: null }, password: PASSWORD });
    expect(res.status).toBe(400);

    res = await http().post('/v1/auth/login').send({ username: USERNAME, password: { $gt: '' } });
    expect(res.status).toBe(400);

    res = await http().post('/v1/auth/login').send({ username: [USERNAME], password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('생년월일과 성별에 구문을 넣으면 400 이다', async () => {
    let res = await http()
      .post('/v1/auth/signup')
      .send(signupBody({ birthdate: "1999-01-01'; DROP TABLE users;--" }));
    expect(res.status).toBe(400);

    res = await http().post('/v1/auth/signup').send(signupBody({ gender: "MALE' OR '1'='1" }));
    expect(res.status).toBe(400);
    expect(await countRows('users')).toBe(0);
  });

  it('XSS 페이로드는 JSON 문자열로만 돌아오고, 응답 타입은 JSON 이다', async () => {
    const xss = '<script>alert(1)</script>';
    const res = await http().post('/v1/auth/signup').send(signupBody({ name: xss }));
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(JSON_TYPE);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.body.user.name).toBe(xss);
  });

  it('제한 길이를 넘긴 이름, 널 문자가 든 이메일은 400 이다', async () => {
    let res = await http().post('/v1/auth/signup').send(signupBody({ name: 'a'.repeat(10_000) }));
    expect(res.status).toBe(400);

    res = await http().post('/v1/auth/username/find').send({ email: 'a\u0000b@example.com' });
    expect(res.status).toBe(400);
  });
});

describe('2. 대량 할당: 정의되지 않은 필드는 거부한다 (ValidationPipe forbidNonWhitelisted)', () => {
  it.each([
    ['role', 'ADMIN'],
    ['id', '00000000-0000-0000-0000-000000000001'],
    ['passwordHash', '$2a$10$forged'],
    ['messageText', '메시지 원문'],
    ['summary', '요약'],
  ])('가입 요청에 %s 필드가 있으면 400 이고 저장되지 않는다', async (field, value) => {
    const res = await http().post('/v1/auth/signup').send(signupBody({ [field]: value }));
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field, reason: 'whitelistValidation' })]),
    );
    expect(await countRows('users')).toBe(0);
  });

  it('로그인 요청에 정의되지 않은 필드가 있으면 400 이다', async () => {
    const res = await http().post('/v1/auth/login').send({ username: USERNAME, password: PASSWORD, isAdmin: true });
    expect(res.status).toBe(400);
  });
});

describe('3. 인증 우회: JWT 위조와 잘못된 인증 헤더', () => {
  const secret = process.env.JWT_SECRET as string;

  it('alg none 토큰은 401 이다', async () => {
    const token = forgeJwt({ sub: '00000000-0000-0000-0000-000000000001' }, null, 'none');
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('다른 비밀키로 서명한 토큰은 401 이다', async () => {
    const token = forgeJwt({ sub: '00000000-0000-0000-0000-000000000001' }, 'attacker-secret-attacker-secret-xx');
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('서명된 토큰의 내용(sub)을 바꾸면 401 이다', async () => {
    const { tokens, user } = (await signup()) as any;
    const [h, , s] = tokens.accessToken.split('.');
    const tampered = `${h}.${b64url(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000001', iat: 1, exp: 9999999999 }))}.${s}`;
    expect(user.id).toBeDefined();
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('만료된 토큰(올바른 키로 서명)은 401 이다', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const token = forgeJwt({ sub: '00000000-0000-0000-0000-000000000001', iat: past - 60, exp: past }, secret);
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('유효한 서명이어도 존재하지 않는 회원이면 401 이다', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = forgeJwt({ sub: '00000000-0000-0000-0000-000000000001', iat: now, exp: now + 600 }, secret);
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it.each([
    ['헤더 없음', undefined],
    ['Bearer 뒤 토큰 없음', 'Bearer '],
    ['소문자 bearer', 'bearer abc'],
    ['Basic 방식', 'Basic dXNlcjpwYXNz'],
    ['공백으로 된 쓰레기 값', 'Bearer a b c'],
  ])('인증 헤더가 %s 이면 401 이다', async (_label, header) => {
    const req = http().get('/v1/users/me');
    const res = header === undefined ? await req : await req.set('Authorization', header);
    expect(res.status).toBe(401);
  });
});

describe('4. 권한 범위: 다른 회원의 토큰으로 남의 세션을 건드릴 수 없다', () => {
  it('A가 B의 refreshToken 으로 로그아웃해도 B의 세션은 살아 있다', async () => {
    const a = await signup({ email: 'a@example.com' });
    const b = await signup({ email: 'b@example.com' });

    const res = await http()
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${a.tokens.accessToken}`)
      .send({ refreshToken: b.tokens.refreshToken });
    expect(res.status).toBe(204);

    const refresh = await http().post('/v1/auth/refresh').send({ refreshToken: b.tokens.refreshToken });
    expect(refresh.status).toBe(200);
  });
});

describe('5. 인증 필요 경로 전수 확인', () => {
  const protectedRoutes: Array<[string, string]> = [
    ['get', '/v1/users/me'],
    ['delete', '/v1/users/me'],
    ['post', '/v1/users/me/terms-agreements'],
    ['get', '/v1/models/latest?platform=android&appVersion=1.0.0'],
    ['post', '/v1/auth/logout'],
  ];

  it.each(protectedRoutes)('%s %s 는 토큰 없이 401 이다', async (method, path) => {
    const res = await (http() as any)[method](path).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('공개 경로는 토큰 없이도 응답한다', async () => {
    expect((await http().get('/v1/terms')).status).toBe(200);
    expect((await http().get('/v1/app/version').query({ platform: 'android', appVersion: '1.0.0' })).status).toBe(200);
    expect((await http().post('/v1/auth/username/check').send({ username: 'free_name' })).status).toBe(200);
  });
});

describe('6. 비밀 값 저장 방식', () => {
  it('비밀번호는 평문이 아니라 bcrypt 해시로 저장된다', async () => {
    await signup();
    const rows = await ctx.ds.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(rows[0].password_hash).not.toContain(PASSWORD);
  });

  it('refreshToken 은 원문이 아니라 SHA-256 해시(64자)로만 저장된다', async () => {
    const { tokens } = await signup();
    const rows = await ctx.ds.query('SELECT token_hash FROM refresh_tokens');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].token_hash).not.toBe(tokens.refreshToken);
  });
});

describe('7. 메시지 관련 필드는 어떤 응답에도 없다 (기능명세 6.1.3, 명세 6)', () => {
  const forbiddenKeys = /message|summary|reply|memory|content|body|text|원문|요약/i;

  function collectKeys(value: unknown, out: string[] = []): string[] {
    if (Array.isArray(value)) value.forEach((v) => collectKeys(v, out));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        out.push(k);
        collectKeys(v, out);
      }
    }
    return out;
  }

  it('회원 정보 응답의 키 목록이 명세 범위와 정확히 일치한다', async () => {
    const { tokens } = await signup();
    const res = await http().get('/v1/users/me').set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.body).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String), email: expect.any(String) }),
    );
    expect(Object.keys(res.body).sort()).toEqual(
      ['birthdate', 'createdAt', 'email', 'gender', 'id', 'name', 'provider', 'termsAgreements', 'username'].sort(),
    );
    expect(collectKeys(res.body).filter((k) => forbiddenKeys.test(k))).toEqual([]);
  });

  it('가입·약관·모델·버전 응답에도 메시지 관련 키가 없다', async () => {
    const signed = await http().post('/v1/auth/signup').send(signupBody({ email: 'keys@example.com' }));
    const verified = await register(ctx, signupBody({ email: 'keys2@example.com' }));
    const terms = await http().get('/v1/terms');
    const version = await http().get('/v1/app/version').query({ platform: 'android', appVersion: '1.0.0' });
    const model = await http()
      .get('/v1/models/latest')
      .query({ platform: 'android', appVersion: '1.0.0' })
      .set('Authorization', `Bearer ${verified.accessToken}`);

    // 에러 응답의 error.message 는 명세 형식상 필드라서 제외하고, 성공 응답만 검사한다
    for (const res of [signed, terms, version, model]) {
      const payload = res.body.error ? {} : res.body;
      expect(collectKeys(payload).filter((k) => forbiddenKeys.test(k))).toEqual([]);
    }
  });
});

describe('8. 요청 제한과 과대 입력', () => {
  it('로그인을 연속으로 실패하면 여섯 번째부터 429 RATE_LIMITED 와 Retry-After 가 온다', async () => {
    await signup();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await http().post('/v1/auth/login').send({ username: USERNAME, password: 'wrong1234' });
      statuses.push(res.status);
      if (res.status === 429) {
        expect(res.body.error.code).toBe('RATE_LIMITED');
        expect(res.headers['retry-after']).toBe('60');
      }
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it('너무 큰 본문은 413 이고 명세 형식으로 응답한다', async () => {
    const res = await http()
      .post('/v1/auth/signup')
      .set('Content-Type', JSON_TYPE)
      .send(JSON.stringify({ name: 'a'.repeat(200 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.message).toBe('요청 본문이 너무 큽니다.');
  });

  it('JSON 문법이 깨진 본문은 500 이 아니라 400 으로 명세 형식으로 응답한다', async () => {
    const res = await http().post('/v1/auth/login').set('Content-Type', JSON_TYPE).send('{"email": "a@b.c",');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    // 파서의 내부 문구(위치 정보 등)를 노출하지 않는다
    expect(res.body.error.message).toBe('요청 형식이 올바르지 않습니다.');
    expect(JSON.stringify(res.body)).not.toMatch(/position|column|JSON/);
  });

  it('JSON이 아닌 본문 형식은 명세 형식의 에러로 응답한다 (500 이 아님)', async () => {
    const res = await http().post('/v1/auth/login').set('Content-Type', 'text/plain').send('email=a');
    expect(res.status).toBeLessThan(500);
    expect(res.body.error).toBeDefined();
  });

  it('없는 경로와 잘못된 메서드도 명세 형식의 에러이고 스택 정보가 없다', async () => {
    const notFound = await http().get('/v1/nope');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');

    const wrongMethod = await http().put('/v1/terms').send({});
    expect(wrongMethod.status).toBe(404);

    for (const res of [notFound, wrongMethod]) {
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js):\d+/);
    }
  });

  it('응답 헤더에 서버 종류가 드러나지 않는다', async () => {
    const res = await http().get('/v1/terms');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
