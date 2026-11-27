import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_DEFAULTS } from '../../config/configuration';
import { ChatMessage, REPLY_JSON_SCHEMA } from './prompt.builder';

/** 외부 호출 실패의 종류. 외부 응답 원문(본문이 섞일 수 있음)은 담지 않는다. */
export type UpstreamFailure = 'not_configured' | 'timeout' | 'rate_limited' | 'rejected' | 'unavailable' | 'bad_response';

export class UpstreamError extends Error {
  constructor(public readonly kind: UpstreamFailure) {
    // 메시지에는 종류만 둔다. 로그·예외 추적에 원문이 남지 않게 한다.
    super(`openrouter:${kind}`);
    this.name = 'UpstreamError';
  }
}

export interface Completion {
  content: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

/**
 * OpenRouter 채팅 완성 호출. 모든 요청에 데이터 미보관(ZDR)을 강제한다.
 * - provider.zdr: ZDR 엔드포인트로만 보낸다(계정 설정과 OR 로 동작, 끄는 용도로는 못 씀)
 * - provider.data_collection: 'deny': 데이터를 수집·학습하는 제공자를 쓰지 않는다
 * - provider.require_parameters: JSON 출력 형식을 지원하지 않는 제공자를 쓰지 않는다
 * 사용자 식별자(user 필드)는 보내지 않는다.
 * 출처: https://openrouter.ai/docs/features/zdr , https://openrouter.ai/docs/guides/routing/provider-selection
 */
@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger('OpenRouterClient');

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('ai.apiKey') && this.config.get<string>('ai.model'));
  }

  async complete(messages: ChatMessage[]): Promise<Completion> {
    if (!this.isConfigured()) throw new UpstreamError('not_configured');

    const baseUrl = this.config.get<string>('ai.baseUrl') ?? 'https://openrouter.ai/api/v1';
    const timeoutMs = this.config.get<number>('ai.timeoutMs') ?? AI_DEFAULTS.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.get<string>('ai.apiKey')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildBody(messages)),
        signal: controller.signal,
      });
    } catch {
      // 네트워크 오류 원인 객체에는 요청 정보가 섞일 수 있어 버린다.
      throw this.fail(controller.signal.aborted ? 'timeout' : 'unavailable');
    } finally {
      clearTimeout(timer);
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw this.fail('bad_response', res.status);
    }

    if (!res.ok) throw this.fail(failureForStatus(res.status), res.status);

    // 상태가 200 이어도 본문에 error 만 오는 경우가 있다(문서 명시). choices 가 없으면 실패로 본다.
    const body = payload as {
      error?: unknown;
      choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body?.choices?.[0]?.message?.content;
    if (body?.error || typeof content !== 'string') throw this.fail('unavailable', res.status);

    return {
      content,
      usage: { promptTokens: body.usage?.prompt_tokens, completionTokens: body.usage?.completion_tokens },
    };
  }

  /** 테스트에서 요청 본문의 ZDR 옵션을 확인할 수 있도록 분리했다. */
  buildBody(messages: ChatMessage[]): Record<string, unknown> {
    return {
      model: this.config.get<string>('ai.model'),
      messages,
      stream: false,
      max_tokens: this.config.get<number>('ai.maxOutputTokens') ?? AI_DEFAULTS.maxOutputTokens,
      temperature: 0.7,
      response_format: { type: 'json_schema', json_schema: REPLY_JSON_SCHEMA },
      provider: { zdr: true, data_collection: 'deny', require_parameters: true },
    };
  }

  private fail(kind: UpstreamFailure, status?: number): UpstreamError {
    // 상태 코드와 종류만 남긴다. 외부 응답 본문과 요청 내용은 기록하지 않는다.
    this.logger.warn(`AI 호출 실패: kind=${kind}${status ? ` status=${status}` : ''}`);
    return new UpstreamError(kind);
  }
}

function failureForStatus(status: number): UpstreamFailure {
  if (status === 408 || status === 504 || status === 524) return 'timeout';
  if (status === 429) return 'rate_limited';
  // 401(키 오류), 402(크레딧 부족), 403(키 한도·가드레일) 은 우리 쪽 설정 문제다
  if (status === 401 || status === 402 || status === 403) return 'rejected';
  return 'unavailable';
}
