import { AiCompletionClient, selectCompletionClient } from './ai-completion.client';
import { UpstreamError } from './openrouter.client';

const fakeClient = (): AiCompletionClient => ({
  isConfigured: () => true,
  complete: async () => ({ content: '{}' }),
});

describe('selectCompletionClient (AI_PROVIDER 로 통로 고르기)', () => {
  const openrouter = fakeClient();
  const anthropic = fakeClient();
  const clients = { openrouter, anthropic };
  const logger = { warn: jest.fn() };

  beforeEach(() => logger.warn.mockReset());

  it.each([[undefined], [''], ['  ']])('값이 없으면(%p) 주 통로 openrouter', (value) => {
    expect(selectCompletionClient(value, clients, logger)).toBe(openrouter);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([['openrouter'], ['OpenRouter']])('%s → openrouter', (value) => {
    expect(selectCompletionClient(value, clients, logger)).toBe(openrouter);
  });

  it.each([['anthropic'], [' Anthropic ']])('%p → anthropic (보조 통로)', (value) => {
    expect(selectCompletionClient(value, clients, logger)).toBe(anthropic);
  });

  it('모르는 값이면 다른 통로로 보내지 않고 막는다 (not_configured → 503)', async () => {
    const selected = selectCompletionClient('anthropc', clients, logger);
    expect(selected).not.toBe(openrouter);
    expect(selected).not.toBe(anthropic);
    expect(selected.isConfigured()).toBe(false);
    await expect(selected.complete([])).rejects.toEqual(new UpstreamError('not_configured'));
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
