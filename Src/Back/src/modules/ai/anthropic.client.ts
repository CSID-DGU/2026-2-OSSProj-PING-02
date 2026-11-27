import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_DEFAULTS } from '../../config/configuration';
import { Completion, UpstreamError, UpstreamFailure } from './openrouter.client';
import { ChatMessage, REPLY_JSON_SCHEMA } from './prompt.builder';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

/**
 * Claude API(Anthropic) 호출. 보조(테스트용) AI 통로이고, 주 통로는 OpenRouter 다.
 * `AI_PROVIDER=anthropic` 일 때만 쓰인다 (ai.module.ts).
 *
 * OpenRouterClient 와 같은 모양(isConfigured, complete)과 같은 실패 종류(UpstreamError)를 쓴다.
 * - 공식 SDK(@anthropic-ai/sdk)로 Messages API 를 부른다.
 * - JSON 출력은 structured outputs(output_config.format)로 강제한다. 스키마는 OpenRouter 와 같다.
 * - temperature 는 보내지 않는다 (최신 모델은 400 으로 거부한다).
 * - 자동 재시도는 끈다. 같은 대화가 외부로 여러 번 나가지 않게, 다시 만들기는 사용자가 앱에서 누를 때만.
 * - 사용자 식별자(metadata.user_id)는 보내지 않는다.
 *
 * 주의: OpenRouter 통로처럼 요청마다 데이터 미보관(ZDR)을 강제하는 옵션이 없다.
 * 보관 정책은 Anthropic 계정·계약을 따르므로, 실제 사용자에게 켜기 전에 약관을 고쳐야 한다 (Doc/약관_초안_AI전송.md).
 */
@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger('AnthropicClient');

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('ai.anthropic.apiKey') && this.config.get<string>('ai.anthropic.model'));
  }

  async complete(messages: ChatMessage[]): Promise<Completion> {
    if (!this.isConfigured()) throw new UpstreamError('not_configured');

    const client = new Anthropic({
      apiKey: this.config.get<string>('ai.anthropic.apiKey'),
      // 비어 있으면 SDK 기본 주소(api.anthropic.com). 테스트에서만 가짜 서버 주소를 넣는다.
      baseURL: this.config.get<string>('ai.anthropic.baseUrl') || undefined,
      timeout: this.config.get<number>('ai.timeoutMs') ?? AI_DEFAULTS.timeoutMs,
      maxRetries: 0,
    });

    let response: Anthropic.Message;
    try {
      response = await client.messages.create(this.buildBody(messages));
    } catch (error) {
      // SDK 오류 객체에는 외부 응답 원문이 들어 있을 수 있어 종류와 상태 코드만 꺼낸다.
      throw this.fail(failureFor(error), statusOf(error));
    }

    // 거절(refusal)·길이 초과(max_tokens)면 JSON 이 없거나 잘려 있다. 다시 만들기는 사용자가 누를 때만.
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      throw this.fail('bad_response', undefined, response.stop_reason);
    }

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    if (!content) throw this.fail('bad_response');

    return {
      content,
      usage: { promptTokens: response.usage?.input_tokens, completionTokens: response.usage?.output_tokens },
    };
  }

  /** 테스트에서 요청 본문을 확인할 수 있도록 분리했다. */
  buildBody(messages: ChatMessage[]): Anthropic.MessageCreateParamsNonStreaming {
    // Claude 는 system 지시를 messages 가 아니라 최상위 system 으로 받는다.
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const effort = this.config.get<string>('ai.anthropic.effort');

    return {
      model: this.config.get<string>('ai.anthropic.model') as string,
      // 최신 모델은 생각(thinking) 토큰도 max_tokens 에 포함되므로 OpenRouter(400)보다 넉넉히 둔다.
      max_tokens: this.config.get<number>('ai.anthropic.maxOutputTokens') ?? AI_DEFAULTS.anthropicMaxOutputTokens,
      ...(system ? { system } : {}),
      messages: messages.filter((m) => m.role === 'user').map((m) => ({ role: 'user' as const, content: m.content })),
      output_config: {
        // 요약 한 줄 + 짧은 답장 3개라 깊게 생각할 필요가 없다. 낮을수록 빠르고 싸다.
        effort: EFFORTS.includes(effort as Effort) ? (effort as Effort) : 'low',
        format: { type: 'json_schema', schema: REPLY_JSON_SCHEMA.schema },
      },
    };
  }

  private fail(kind: UpstreamFailure, status?: number, stopReason?: string): UpstreamError {
    // 종류·상태 코드·중단 이유만 남긴다. 외부 응답 본문과 요청 내용은 기록하지 않는다.
    const detail = `${status ? ` status=${status}` : ''}${stopReason ? ` stop_reason=${stopReason}` : ''}`;
    this.logger.warn(`AI 호출 실패(anthropic): kind=${kind}${detail}`);
    return new UpstreamError(kind);
  }
}

/** SDK 오류를 실패 종류로 바꾼다. 하위 클래스부터 확인한다 (타임아웃 ⊂ 연결 오류 ⊂ API 오류). */
export function failureFor(error: unknown): UpstreamFailure {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return 'timeout';
  if (error instanceof Anthropic.APIConnectionError) return 'unavailable';
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    if (status === 408 || status === 504) return 'timeout';
    if (status === 429) return 'rate_limited';
    // 401(키 오류), 402(결제), 403(권한) 은 우리 쪽 설정 문제다
    if (status === 401 || status === 402 || status === 403) return 'rejected';
    // 400(잘못된 모델 ID 등), 5xx, 529(과부하)
    return 'unavailable';
  }
  return 'unavailable';
}

function statusOf(error: unknown): number | undefined {
  return error instanceof Anthropic.APIError ? error.status : undefined;
}
