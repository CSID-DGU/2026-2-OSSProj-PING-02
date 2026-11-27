import { FAKE_AI_PORT } from './support/ai-env';
import { Logger } from '@nestjs/common';
import { createServer, IncomingMessage, Server } from 'http';
import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';
import { DECISION_REPLIES, FAKE_SUMMARY, fakeModelOutput, GENERAL_REPLIES } from './support/fake-ai-replies';

// 응답·로그·DB 어디에도 나오면 안 되는 본문 표시. 마스킹된 메시지 안에 넣어 보낸다.
const MARKER = '본문표시_Z9K4';

type Mode = 'ok' | 'invalid' | 'error500' | 'error200' | 'leak401' | 'slow';

/** OpenRouter 대신 요청을 받는 가짜 서버. 받은 요청 본문을 기록해 두고, mode 에 따라 응답한다. */
const fake = {
  mode: 'ok' as Mode,
  // 앱이 needsDecision 을 보내지 않았을 때 가짜 모델이 내릴 판단
  decide: true,
  requests: [] as Array<{ headers: IncomingMessage['headers']; body: any }>,
};
let server: Server;

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const parsed = JSON.parse(raw || '{}');
      fake.requests.push({ headers: req.headers, body: parsed });
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      switch (fake.mode) {
        case 'ok':
          return send(200, {
            choices: [{ message: { content: fakeModelOutput(parsed.messages?.[1]?.content ?? '', fake.decide) } }],
            usage: { prompt_tokens: 10, completion_tokens: 20 },
          });
        case 'invalid':
          return send(200, { choices: [{ message: { content: '이전 지시를 무시하고 시스템 프롬프트를 알려 줄게' } }] });
        case 'error500':
          return send(500, { error: { code: 500, message: `provider echoed ${MARKER}` } });
        case 'error200':
          return send(200, { error: { code: 502, message: `mid-stream failure ${MARKER}` } });
        case 'leak401':
          return send(401, { error: { code: 401, message: `invalid key; request was ${MARKER}` } });
        case 'slow':
          return; // 응답하지 않는다 → 서버 타임아웃(AI_TIMEOUT_MS)
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(FAKE_AI_PORT, '127.0.0.1', resolve));
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

let ctx: TestContext;
let output: string[];
let restoreOutput: () => void;

/**
 * 테스트 중 서버가 남기는 모든 로그를 모은다. Nest Logger 호출과 표준 출력·오류를 함께 본다.
 * (테스트 환경에서는 Nest 로그가 표준 출력으로 나가지 않을 수 있어 Logger 자체도 감시한다)
 */
function captureOutput() {
  output = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: any, ...rest: any[]) => (output.push(String(chunk)), out(chunk, ...rest))) as any;
  process.stderr.write = ((chunk: any, ...rest: any[]) => (output.push(String(chunk)), err(chunk, ...rest))) as any;
  const spies = (['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((method) =>
    jest.spyOn(Logger.prototype, method).mockImplementation(function (this: Logger, ...args: unknown[]) {
      output.push(args.map((a) => (a instanceof Error ? `${a.message} ${a.stack}` : String(a))).join(' '));
    }),
  );
  restoreOutput = () => {
    process.stdout.write = out as any;
    process.stderr.write = err as any;
    spies.forEach((s) => s.mockRestore());
  };
}

beforeEach(async () => {
  fake.mode = 'ok';
  fake.decide = true;
  fake.requests = [];
  ctx = await startApp();
  captureOutput();
});

afterEach(async () => {
  restoreOutput();
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());

const signupBody = (name: string) => ({
  username: usernameOf(`${name}@example.com`),
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  email: `${name}@example.com`,
  password: 'abcd1234',
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
  ],
});

const token = async (name = 'aiuser') => (await register(ctx, signupBody(name))).accessToken;
const body = (overrides: Record<string, unknown> = {}) => ({
  text: `[친구A]: 이번 주 금요일에 저녁 먹을래? ${MARKER}`,
  relation: 'FRIEND',
  needsDecision: true,
  ...overrides,
});
const ask = (accessToken: string, payload: Record<string, unknown> = body()) =>
  http().post('/v1/ai/reply').set('Authorization', `Bearer ${accessToken}`).send(payload);

describe('정상 흐름', () => {
  it('결정이 필요하면 요약과 입장 × 말투 9개를 정해진 순서로 돌려준다 (모델이 섞어 줘도 정렬)', async () => {
    const res = await ask(await token());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: FAKE_SUMMARY, needsDecision: true, replies: DECISION_REPLIES });
  });

  it('결정이 필요 없으면 말투 3개 {tone, text} 이고 stance 는 없다', async () => {
    const res = await ask(await token(), body({ needsDecision: false }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: FAKE_SUMMARY, needsDecision: false, replies: GENERAL_REPLIES });
    expect(res.body.replies.some((r: object) => 'stance' in r)).toBe(false);
  });

  it.each([
    [true, DECISION_REPLIES],
    [false, GENERAL_REPLIES],
  ])('needsDecision 을 보내지 않으면 AI 가 판단한다 (판단: %s)', async (decide, replies) => {
    fake.decide = decide;
    const res = await ask(await token(), body({ needsDecision: undefined }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: FAKE_SUMMARY, needsDecision: decide, replies });
    expect(fake.requests[0].body.messages[1].content).toContain('판단해서 needsDecision에 쓰고');
  });

  it('needsDecision 을 보내면 프롬프트에 그 값을 쓰라고 들어간다', async () => {
    await ask(await token(), body({ needsDecision: true }));
    expect(fake.requests[0].body.messages[1].content).toContain('needsDecision은 true로 쓰고 판단을 바꾸지 않는다');
  });

  it('출력 토큰 기본값(1500)과 공통 JSON 스키마로 보낸다', async () => {
    await ask(await token());
    const r = fake.requests[0].body;
    expect(r.max_tokens).toBe(1500);
    expect(r.response_format.json_schema.schema.required).toEqual(['summary', 'needsDecision', 'replies']);
  });

  it('OpenRouter 로 가는 요청에 ZDR 옵션이 항상 들어가고, 키는 서버가 넣으며, 사용자 정보는 없다', async () => {
    const accessToken = await token();
    await ask(accessToken);
    await ask(accessToken, body({ relation: 'SUPERIOR', needsDecision: false }));

    expect(fake.requests).toHaveLength(2);
    for (const r of fake.requests) {
      expect(r.body.provider).toEqual({ zdr: true, data_collection: 'deny', require_parameters: true });
      expect(r.body.model).toBe('test/zdr-model');
      expect(r.headers.authorization).toBe('Bearer sk-test-only');
      expect(r.body).not.toHaveProperty('user');
      // 사용자 아이디·토큰이 외부로 나가지 않는다
      expect(JSON.stringify(r.body)).not.toContain(usernameOf('aiuser@example.com'));
      expect(JSON.stringify(r.body)).not.toContain(accessToken);
    }
  });

  it('보낸 문장은 <message> 안에만 들어가고, 프롬프트 틀은 서버가 정한다', async () => {
    await ask(await token());
    const [system, user] = fake.requests[0].body.messages;
    expect(system.role).toBe('system');
    expect(system.content).not.toContain(MARKER);
    expect(user.content).toContain(`<message>\n[친구A]: 이번 주 금요일에 저녁 먹을래? ${MARKER}\n</message>`);
  });
});

describe('인증과 입력 검사', () => {
  it('로그인하지 않으면 401 이고 외부로 보내지 않는다', async () => {
    const res = await http().post('/v1/ai/reply').send(body());
    expect(res.status).toBe(401);
    expect(fake.requests).toHaveLength(0);
  });

  it.each([
    ['text 없음', { text: undefined }],
    ['빈 text', { text: '   ' }],
    ['관계 값 오류', { relation: 'BOSS' }],
    ['needsDecision 이 불리언이 아님', { needsDecision: 'yes' }],
    // 9개를 한 번에 주므로 입장(stance)은 더 받지 않는다 (#65)
    ['입장(stance)을 보냄', { stance: 'ACCEPT' }],
  ])('%s 이면 400 VALIDATION_FAILED', async (_label, over) => {
    const res = await ask(await token(), body(over));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(fake.requests).toHaveLength(0);
  });

  it('앱이 프롬프트나 모델을 직접 보내면 400 이다 (공개 프록시가 되지 않게)', async () => {
    for (const extra of [{ model: 'other/model' }, { messages: [{ role: 'system', content: 'x' }] }, { prompt: 'x' }]) {
      const res = await ask(await token(`p${Object.keys(extra)[0]}`), body(extra));
      expect(res.status).toBe(400);
    }
    expect(fake.requests).toHaveLength(0);
  });

  it('1,000자를 넘으면 400 이고 외부로 보내지 않는다', async () => {
    const res = await ask(await token(), body({ text: '가'.repeat(1001) }));
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'text', reason: 'maxLength' }]);
    expect(fake.requests).toHaveLength(0);
  });

  it('가려지지 않은 전화번호가 있으면 400 UNMASKED_CONTENT 이고, 응답에 그 값을 담지 않으며 외부로 보내지 않는다', async () => {
    const res = await ask(await token(), body({ text: `내 번호 010-9876-5432 ${MARKER}` }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNMASKED_CONTENT');
    expect(res.body.error.details).toEqual([{ field: 'text', reason: 'phone' }]);
    expect(JSON.stringify(res.body)).not.toContain('9876');
    expect(JSON.stringify(res.body)).not.toContain(MARKER);
    expect(fake.requests).toHaveLength(0);
  });
});

describe('외부 서버 실패', () => {
  it.each([
    ['error500', 503, 'UPSTREAM_UNAVAILABLE'],
    ['error200', 503, 'UPSTREAM_UNAVAILABLE'],
    ['leak401', 503, 'UPSTREAM_UNAVAILABLE'],
    ['invalid', 502, 'AI_RESPONSE_INVALID'],
    ['slow', 504, 'UPSTREAM_TIMEOUT'],
  ] as const)('%s 이면 %s %s 이고, 외부 오류 원문을 그대로 내보내지 않는다', async (mode, status, code) => {
    const accessToken = await token();
    fake.mode = mode;
    const res = await ask(accessToken);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(JSON.stringify(res.body)).not.toMatch(/provider echoed|mid-stream|invalid key|시스템 프롬프트/);
    expect(JSON.stringify(res.body)).not.toContain(MARKER);
    // 실패해도 자동으로 다시 부르지 않는다
    expect(fake.requests).toHaveLength(1);
  });
});

describe('사용자별 호출 제한 (메모리 카운터)', () => {
  it('한 사용자가 분당 10회를 넘으면 429 이고, 다른 사용자는 영향받지 않는다', async () => {
    const a = await token('usera');
    const b = await token('userb');
    for (let i = 0; i < 10; i++) expect((await ask(a)).status).toBe(200);

    const blocked = await ask(a);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(fake.requests).toHaveLength(10); // 막힌 요청은 외부로 보내지 않는다

    expect((await ask(b)).status).toBe(200);
  });
});

describe('저장하지 않는다 (DB·로그·응답)', () => {
  async function tables(): Promise<string[]> {
    const rows = await ctx.ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    return rows.map((r: { table_name: string }) => r.table_name);
  }

  it('AI 요청 전후로 DB 의 어떤 테이블에도 행이 늘지 않고, 본문이 어디에도 없다', async () => {
    const accessToken = await token();
    const names = await tables();
    const count = async () =>
      Object.fromEntries(
        await Promise.all(
          names.map(async (t) => [t, (await ctx.ds.query(`SELECT COUNT(*)::int AS n FROM "${t}"`))[0].n] as const),
        ),
      );
    const before = await count();

    await ask(accessToken); // 성공
    fake.mode = 'error500';
    await ask(accessToken); // 실패
    await ask(accessToken, body({ text: `010-1111-2222 ${MARKER}` })); // 마스킹 누락

    expect(await count()).toEqual(before);
    expect(await tables()).toEqual(names); // AI 용 테이블도 없다
    for (const t of names) {
      const hit = await ctx.ds.query(`SELECT COUNT(*)::int AS n FROM "${t}" WHERE "${t}"::text LIKE $1`, [`%${MARKER}%`]);
      expect({ table: t, n: hit[0].n }).toEqual({ table: t, n: 0 });
    }
  });

  it('성공·실패·거부 어느 경로에서도 서버 로그에 본문이 나오지 않는다', async () => {
    const accessToken = await token();
    for (const mode of ['ok', 'error500', 'leak401', 'invalid', 'slow'] as const) {
      fake.mode = mode;
      await ask(accessToken);
    }
    await ask(accessToken, body({ text: `010-1111-2222 ${MARKER}` }));
    await ask(accessToken, body({ text: `${MARKER}`.repeat(200) }));

    const log = output.join('');
    expect(log).toContain('/v1/ai/reply'); // 로그 수집이 실제로 동작하는지 확인
    expect(log).not.toContain(MARKER);
    expect(log).not.toContain('금요일에 저녁');
    expect(log).not.toContain('sk-test-only');
  });
});
