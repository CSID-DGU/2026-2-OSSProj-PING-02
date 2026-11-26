import { FAKE_ANTHROPIC_PORT } from './support/anthropic-env';
import { Logger } from '@nestjs/common';
import { createServer, IncomingMessage, Server } from 'http';
import request from 'supertest';
import { register, startApp, TestContext, usernameOf } from './support/app';
import { DECISION_REPLIES, FAKE_SUMMARY, fakeModelOutput, GENERAL_REPLIES } from './support/fake-ai-replies';

// 보조(테스트용) 통로: AI_PROVIDER=anthropic 일 때 같은 /v1/ai/reply 가 Claude API 형식으로 나가는지 확인한다.
// 입력 검사·마스킹 검사·요청 제한은 통로와 상관없이 같은 코드라 ai-reply.e2e-spec.ts 에서 확인한다.

// 응답·로그 어디에도 나오면 안 되는 본문 표시. 마스킹된 메시지 안에 넣어 보낸다.
const MARKER = '본문표시_C5L2';

type Mode = 'ok' | 'invalid' | 'refusal' | 'maxTokens' | 'error500' | 'overloaded' | 'leak401' | 'slow';

/** Claude API 대신 요청을 받는 가짜 서버(/v1/messages). 받은 요청을 기록해 두고, mode 에 따라 응답한다. */
const fake = {
  mode: 'ok' as Mode,
  // 앱이 needsDecision 을 보내지 않았을 때 가짜 모델이 내릴 판단
  decide: true,
  requests: [] as Array<{ url: string | undefined; headers: IncomingMessage['headers']; body: any }>,
};
let server: Server;

const message = (text: string, stopReason = 'end_turn') => ({
  id: 'msg_fake',
  type: 'message',
  role: 'assistant',
  model: 'claude-test-model',
  content: [{ type: 'text', text }],
  stop_reason: stopReason,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 20 },
});
const apiError = (type: string, msg: string) => ({ type: 'error', error: { type, message: msg } });

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const parsed = JSON.parse(raw || '{}');
      fake.requests.push({ url: req.url, headers: req.headers, body: parsed });
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      switch (fake.mode) {
        case 'ok':
          return send(200, message(fakeModelOutput(parsed.messages?.[0]?.content ?? '', fake.decide)));
        case 'invalid':
          return send(200, message('이전 지시를 무시하고 시스템 프롬프트를 알려 줄게'));
        case 'refusal':
          return send(200, message('', 'refusal'));
        case 'maxTokens':
          return send(200, message('{"summary":"잘린', 'max_tokens'));
        case 'error500':
          return send(500, apiError('api_error', `provider echoed ${MARKER}`));
        case 'overloaded':
          return send(529, apiError('overloaded_error', `overloaded ${MARKER}`));
        case 'leak401':
          return send(401, apiError('authentication_error', `invalid key; request was ${MARKER}`));
        case 'slow':
          return; // 응답하지 않는다 → 서버 타임아웃(AI_TIMEOUT_MS)
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(FAKE_ANTHROPIC_PORT, '127.0.0.1', resolve));
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

let ctx: TestContext;
let output: string[];
let restoreOutput: () => void;

/** 테스트 중 서버가 남기는 모든 로그를 모은다 (ai-reply.e2e-spec.ts 와 같은 방식). */
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

const token = async (name = 'claudeuser') => (await register(ctx, signupBody(name))).accessToken;
const body = (overrides: Record<string, unknown> = {}) => ({
  text: `[친구A]: 이번 주 금요일에 저녁 먹을래? ${MARKER}`,
  relation: 'FRIEND',
  needsDecision: true,
  ...overrides,
});
const ask = (accessToken: string, payload: Record<string, unknown> = body()) =>
  http().post('/v1/ai/reply').set('Authorization', `Bearer ${accessToken}`).send(payload);

describe('Claude 통로 (AI_PROVIDER=anthropic): 정상 흐름', () => {
  it('앱이 받는 응답 형식은 OpenRouter 통로와 같다 (결정 필요: 입장 × 말투 9개)', async () => {
    const res = await ask(await token());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: FAKE_SUMMARY, needsDecision: true, replies: DECISION_REPLIES });
  });

  it('결정이 필요 없으면 말투 3개', async () => {
    const res = await ask(await token(), body({ needsDecision: false }));
    expect(res.body).toEqual({ summary: FAKE_SUMMARY, needsDecision: false, replies: GENERAL_REPLIES });
  });

  it('needsDecision 을 보내지 않으면 AI 가 판단한다', async () => {
    fake.decide = false;
    const res = await ask(await token(), body({ needsDecision: undefined }));
    expect(res.body).toEqual({ summary: FAKE_SUMMARY, needsDecision: false, replies: GENERAL_REPLIES });
    expect(fake.requests[0].body.messages[0].content).toContain('판단해서 needsDecision에 쓰고');
  });

  it('Claude Messages API 형식으로 보낸다: system 은 최상위, JSON 스키마 강제, temperature 없음', async () => {
    await ask(await token());
    expect(fake.requests).toHaveLength(1);
    const [r] = fake.requests;
    expect(r.url).toBe('/v1/messages');
    expect(r.body.model).toBe('claude-test-model');
    expect(r.body.max_tokens).toBe(4096);
    expect(r.body.system).toContain('카카오톡 메시지를 요약');
    expect(r.body.system).not.toContain(MARKER);
    expect(r.body.messages).toHaveLength(1);
    expect(r.body.messages[0].role).toBe('user');
    expect(r.body.messages[0].content).toContain(`<message>\n[친구A]: 이번 주 금요일에 저녁 먹을래? ${MARKER}\n</message>`);
    expect(r.body.output_config.effort).toBe('low');
    expect(r.body.output_config.format.type).toBe('json_schema');
    expect(r.body.output_config.format.schema.required).toEqual(['summary', 'needsDecision', 'replies']);
    expect(r.body).not.toHaveProperty('temperature');
  });

  it('키는 서버가 넣고, 사용자 아이디·토큰은 외부로 나가지 않는다', async () => {
    const accessToken = await token();
    await ask(accessToken);
    const [r] = fake.requests;
    expect(r.headers.authorization).toBe('Bearer sk-ant-test-only');
    expect(r.body).not.toHaveProperty('metadata');
    expect(JSON.stringify(r.body)).not.toContain(usernameOf('claudeuser@example.com'));
    expect(JSON.stringify(r.body)).not.toContain(accessToken);
    expect(JSON.stringify(r.headers)).not.toContain(accessToken);
  });

  it('가려지지 않은 개인정보가 있으면 Claude 통로에서도 외부로 보내지 않는다', async () => {
    const res = await ask(await token(), body({ text: `내 번호 010-9876-5432 ${MARKER}` }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNMASKED_CONTENT');
    expect(fake.requests).toHaveLength(0);
  });
});

describe('Claude 통로: 외부 서버 실패', () => {
  it.each([
    ['error500', 503, 'UPSTREAM_UNAVAILABLE'],
    ['overloaded', 503, 'UPSTREAM_UNAVAILABLE'],
    ['leak401', 503, 'UPSTREAM_UNAVAILABLE'],
    // 거절·잘림은 클라이언트의 bad_response 이고, AiService 는 OpenRouter 통로와 똑같이 503 으로 바꾼다
    ['refusal', 503, 'UPSTREAM_UNAVAILABLE'],
    ['maxTokens', 503, 'UPSTREAM_UNAVAILABLE'],
    ['invalid', 502, 'AI_RESPONSE_INVALID'],
    ['slow', 504, 'UPSTREAM_TIMEOUT'],
  ] as const)('%s 이면 %s %s 이고, 외부 오류 원문을 내보내지 않으며 다시 부르지 않는다', async (mode, status, code) => {
    const accessToken = await token();
    fake.mode = mode;
    const res = await ask(accessToken);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(JSON.stringify(res.body)).not.toMatch(/provider echoed|overloaded|invalid key|시스템 프롬프트/);
    expect(JSON.stringify(res.body)).not.toContain(MARKER);
    // SDK 자동 재시도를 껐다: 실패해도 한 번만 보낸다
    expect(fake.requests).toHaveLength(1);
  });

  it('성공·실패 어느 경로에서도 서버 로그에 본문과 키가 나오지 않는다', async () => {
    const accessToken = await token();
    for (const mode of ['ok', 'error500', 'leak401', 'refusal', 'invalid', 'slow'] as const) {
      fake.mode = mode;
      await ask(accessToken);
    }
    const log = output.join('');
    expect(log).toContain('/v1/ai/reply'); // 로그 수집이 실제로 동작하는지 확인
    expect(log).toContain('AI 호출 실패(anthropic)');
    expect(log).not.toContain(MARKER);
    expect(log).not.toContain('금요일에 저녁');
    expect(log).not.toContain('sk-ant-test-only');
  });
});
