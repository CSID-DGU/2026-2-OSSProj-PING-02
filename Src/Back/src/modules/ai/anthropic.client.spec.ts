import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicClient } from './anthropic.client';
import { UpstreamError } from './openrouter.client';
import { ChatMessage, REPLY_JSON_SCHEMA } from './prompt.builder';

const MARKER = '비밀본문마커_A8X';
const messages: ChatMessage[] = [
  { role: 'system', content: '지시' },
  { role: 'user', content: `<message>\n${MARKER}\n</message>` },
];

const settings: Record<string, unknown> = {
  'ai.anthropic.apiKey': 'sk-ant-test-key',
  'ai.anthropic.model': 'claude-test-model',
  'ai.anthropic.baseUrl': 'https://anthropic.test',
  'ai.anthropic.maxOutputTokens': 2048,
  'ai.anthropic.effort': 'low',
  'ai.timeoutMs': 50,
};
const config = (over: Record<string, unknown> = {}) =>
  ({ get: (key: string) => ({ ...settings, ...over })[key] }) as unknown as ConfigService;

const reply = JSON.stringify({ summary: 's', replies: ['a', 'b', 'c'] });
const message = (over: Record<string, unknown> = {}) => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-test-model',
  content: [{ type: 'text', text: reply }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 20 },
  ...over,
});
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
// 외부가 응답 원문에 본문을 되돌려 보내는 경우까지 가정한다
const apiError = (type: string) => ({ type: 'error', error: { type, message: `echo ${MARKER}` } });

describe('AnthropicClient', () => {
  let fetchSpy: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  const failureKind = async (client: AnthropicClient) => {
    try {
      await client.complete(messages);
      return 'no-error';
    } catch (e) {
      expect(e).toBeInstanceOf(UpstreamError);
      // 던지는 오류와 로그 어디에도 본문이나 외부 응답 원문이 없다
      expect(String((e as Error).message)).not.toContain(MARKER);
      expect(JSON.stringify(warn.mock.calls)).not.toContain(MARKER);
      return (e as UpstreamError).kind;
    }
  };

  it('Messages API 형식으로 보낸다: system 은 최상위, JSON 스키마 강제, effort, 키는 인증 헤더로', async () => {
    fetchSpy.mockResolvedValue(respond(200, message()));
    await new AnthropicClient(config()).complete(messages);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('https://anthropic.test/v1/messages');
    // SDK 1.x 는 API 키를 Authorization: Bearer 헤더로 보낸다 (키는 서버만 넣는다)
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer sk-ant-test-key');

    const body = JSON.parse(init.body);
    expect(body.model).toBe('claude-test-model');
    expect(body.max_tokens).toBe(2048);
    expect(body.system).toBe('지시');
    expect(body.messages).toEqual([{ role: 'user', content: `<message>\n${MARKER}\n</message>` }]);
    expect(body.output_config).toEqual({ effort: 'low', format: { type: 'json_schema', schema: REPLY_JSON_SCHEMA.schema } });
  });

  it('temperature·사용자 식별자·stream 을 보내지 않는다', async () => {
    fetchSpy.mockResolvedValue(respond(200, message()));
    await new AnthropicClient(config()).complete(messages);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('top_p');
    expect(body).not.toHaveProperty('metadata');
    expect(body.stream ?? false).toBe(false);
  });

  it('effort 값이 잘못되면 low 로 보낸다', async () => {
    fetchSpy.mockResolvedValue(respond(200, message()));
    await new AnthropicClient(config({ 'ai.anthropic.effort': 'turbo' })).complete(messages);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).output_config.effort).toBe('low');
  });

  it('정상 응답이면 text 블록 내용과 사용량을 돌려준다 (thinking 블록은 버린다)', async () => {
    fetchSpy.mockResolvedValue(
      respond(200, message({ content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text: reply }] })),
    );
    const result = await new AnthropicClient(config()).complete(messages);
    expect(result).toEqual({ content: reply, usage: { promptTokens: 10, completionTokens: 20 } });
  });

  it('키나 모델이 없으면 보내지 않고 not_configured', async () => {
    expect(await failureKind(new AnthropicClient(config({ 'ai.anthropic.apiKey': '' })))).toBe('not_configured');
    expect(await failureKind(new AnthropicClient(config({ 'ai.anthropic.model': '' })))).toBe('not_configured');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['refusal', 'refusal'],
    ['max_tokens', 'max_tokens'],
  ])('stop_reason 이 %s 이면 bad_response (로그에는 중단 이유만)', async (_name, stopReason) => {
    fetchSpy.mockResolvedValue(respond(200, message({ stop_reason: stopReason, content: [{ type: 'text', text: MARKER }] })));
    expect(await failureKind(new AnthropicClient(config()))).toBe('bad_response');
    expect(JSON.stringify(warn.mock.calls)).toContain(`stop_reason=${stopReason}`);
  });

  it('text 블록이 없으면 bad_response', async () => {
    fetchSpy.mockResolvedValue(respond(200, message({ content: [] })));
    expect(await failureKind(new AnthropicClient(config()))).toBe('bad_response');
  });

  it.each([
    [429, 'rate_limit_error', 'rate_limited'],
    [401, 'authentication_error', 'rejected'],
    [402, 'billing_error', 'rejected'],
    [403, 'permission_error', 'rejected'],
    [400, 'invalid_request_error', 'unavailable'],
    [500, 'api_error', 'unavailable'],
    [529, 'overloaded_error', 'unavailable'],
    [504, 'timeout_error', 'timeout'],
  ])('HTTP %i 이면 %s → %s, 자동으로 다시 보내지 않는다', async (status, type, kind) => {
    fetchSpy.mockResolvedValue(respond(status, apiError(type)));
    expect(await failureKind(new AnthropicClient(config()))).toBe(kind);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('응답이 늦으면 timeout', async () => {
    fetchSpy.mockImplementation(
      (_url: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    expect(await failureKind(new AnthropicClient(config({ 'ai.timeoutMs': 20 })))).toBe('timeout');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('네트워크 오류면 unavailable', async () => {
    fetchSpy.mockRejectedValue(new TypeError(`fetch failed ${MARKER}`));
    expect(await failureKind(new AnthropicClient(config()))).toBe('unavailable');
  });
});
