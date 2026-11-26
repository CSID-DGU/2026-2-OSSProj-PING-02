import { Logger } from '@nestjs/common';
import { Completion, UpstreamError } from './openrouter.client';
import { ChatMessage } from './prompt.builder';

/** AI 통로가 갖춰야 할 모양. OpenRouterClient(주 통로)와 AnthropicClient(보조, 테스트용)가 같은 모양이다. */
export interface AiCompletionClient {
  isConfigured(): boolean;
  complete(messages: ChatMessage[]): Promise<Completion>;
}

/** AiService 가 받는 AI 통로 (ai.module.ts 에서 AI_PROVIDER 로 고른다). */
export const AI_COMPLETION_CLIENT = Symbol('AI_COMPLETION_CLIENT');

export const AI_PROVIDERS = ['openrouter', 'anthropic'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** 알 수 없는 AI_PROVIDER 값일 때: 어느 외부로도 보내지 않고 AI 요청만 503(not_configured)으로 막는다. */
const unknownProvider: AiCompletionClient = {
  isConfigured: () => false,
  complete: async () => {
    throw new UpstreamError('not_configured');
  },
};

/**
 * AI_PROVIDER 값으로 통로를 고른다. 비어 있으면 주 통로(openrouter).
 * 오타 같은 엉뚱한 값이면 다른 통로로 조용히 보내지 않고 막는다 (설정 실수로 데이터가 의도하지 않은 곳으로 가지 않게).
 */
export function selectCompletionClient(
  provider: string | undefined,
  clients: Record<AiProvider, AiCompletionClient>,
  logger: Pick<Logger, 'warn'> = new Logger('AiProvider'),
): AiCompletionClient {
  const name = (provider ?? '').trim().toLowerCase() || 'openrouter';
  if ((AI_PROVIDERS as readonly string[]).includes(name)) return clients[name as AiProvider];
  logger.warn(`알 수 없는 AI_PROVIDER 값이라 AI 요청을 막습니다 (가능한 값: ${AI_PROVIDERS.join(', ')}).`);
  return unknownProvider;
}
