import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouterClient, UpstreamError } from './openrouter.client';
import { ChatMessage } from './prompt.builder';

const MARKER = '비밀본문마커_7Q3';
const messages: ChatMessage[] = [
  { role: 'system', content: '지시' },
  { role: 'user', content: `<message>\n${MARKER}\n</message>` },
];

const settings: Record<string, unknown> = {
  'ai.apiKey': 'sk-test-key',
  'ai.model': 'test/model',
  'ai.baseUrl': 'https://openrouter.test/api/v1',
  'ai.timeoutMs': 50,
  'ai.maxOutputTokens': 400,
};
const config = (over: Record<string, unknown> = {}) =>
  ({ get: (key: string) => ({ ...settings, ...over })[key] }) as unknown as ConfigService;

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const okBody = { choices: [{ message: { content: '{"summary":"s","replies":["a","b","c"]}' } }], usage: { prompt_tokens: 10, completion_tokens: 20 } };

describe('OpenRouterClient', () => {
  let fetchSpy: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  const failureKind = async (client: OpenRouterClient) => {
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

  it('모든 요청에 ZDR 강제 옵션을 넣고, 사용자 식별자는 보내지 않는다', async () => {
    fetchSpy.mockResolvedValue(json(200, okBody));
    await new OpenRouterClient(config()).complete(messages);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://openrouter.test/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test-key');
    const body = JSON.parse(init.body);
    expect(body.provider).toEqual({ zdr: true, data_collection: 'deny', require_parameters: true });
    expect(body.model).toBe('test/model');
    expect(body.stream).toBe(false);
    expect(body.response_format.type).toBe('json_schema');
    expect(body).not.toHaveProperty('user');
  });

  it('정상 응답이면 모델 출력 문자열과 토큰 수를 돌려준다', async () => {
    fetchSpy.mockResolvedValue(json(200, okBody));
    const result = await new OpenRouterClient(config()).complete(messages);
    expect(result).toEqual({ content: okBody.choices[0].message.content, usage: { promptTokens: 10, completionTokens: 20 } });
  });

  it('키나 모델이 없으면 외부로 보내지 않고 not_configured', async () => {
    expect(await failureKind(new OpenRouterClient(config({ 'ai.apiKey': '' })))).toBe('not_configured');
    expect(await failureKind(new OpenRouterClient(config({ 'ai.model': '' })))).toBe('not_configured');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'rejected'],
    [402, 'rejected'],
    [403, 'rejected'],
    [408, 'timeout'],
    [429, 'rate_limited'],
    [500, 'unavailable'],
    [502, 'unavailable'],
    [503, 'unavailable'],
  ])('상태 %s 는 %s 로 바꾸고 외부 오류 원문(본문 포함)을 버린다', async (status, kind) => {
    fetchSpy.mockResolvedValue(json(status, { error: { code: status, message: `upstream said: ${MARKER}` } }));
    expect(await failureKind(new OpenRouterClient(config()))).toBe(kind);
  });

  it('상태가 200 이어도 본문에 error 만 있으면 실패로 본다', async () => {
    fetchSpy.mockResolvedValue(json(200, { error: { code: 502, message: MARKER } }));
    expect(await failureKind(new OpenRouterClient(config()))).toBe('unavailable');
  });

  it('JSON 이 아닌 응답은 bad_response', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error(MARKER); } } as unknown as Response);
    expect(await failureKind(new OpenRouterClient(config()))).toBe('bad_response');
  });

  it('네트워크 오류는 unavailable, 원인 객체는 버린다', async () => {
    fetchSpy.mockRejectedValue(new TypeError(`fetch failed ${MARKER}`));
    expect(await failureKind(new OpenRouterClient(config()))).toBe('unavailable');
  });

  it('시간 안에 응답이 없으면 요청을 끊고 timeout', async () => {
    fetchSpy.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    expect(await failureKind(new OpenRouterClient(config({ 'ai.timeoutMs': 20 })))).toBe('timeout');
  });
});
