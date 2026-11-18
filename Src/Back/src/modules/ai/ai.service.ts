import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { AiReplyDto } from './dto/ai-reply.dto';
import { OpenRouterClient, UpstreamError } from './openrouter.client';
import { buildMessages, labelsFor } from './prompt.builder';
import { findUnmaskedKinds } from './unmasked-content.util';

export interface AiReplyResult {
  summary: string;
  replies: Array<{ label: string; text: string }>;
}

const MAX_SUMMARY = 200;
const MAX_REPLY = 300;

/**
 * AI 답장 통로. 받은 문장을 검사하고 OpenRouter 에 넘긴 뒤 결과를 그대로 돌려준다.
 * 본문·요약·답장은 어디에도 저장하거나 기록하지 않는다(메모리에서만 다룬다).
 */
@Injectable()
export class AiService {
  constructor(
    private readonly client: OpenRouterClient,
    private readonly config: ConfigService,
  ) {}

  async reply(dto: AiReplyDto): Promise<AiReplyResult> {
    const maxChars = this.config.get<number>('ai.maxInputChars') ?? 1000;
    if (dto.text.length > maxChars) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `메시지는 ${maxChars}자까지 보낼 수 있습니다.`,
        400,
        [{ field: 'text', reason: 'maxLength' }],
      );
    }

    // 마스킹 누락이 있으면 외부로 보내지 않는다. 어떤 종류인지만 알려 주고 값은 응답에 담지 않는다.
    const kinds = findUnmaskedKinds(dto.text);
    if (kinds.length > 0) {
      throw new AppException(
        ErrorCode.UNMASKED_CONTENT,
        '개인정보(전화번호, 계좌번호 등)가 가려지지 않아 보낼 수 없습니다.',
        400,
        kinds.map((kind) => ({ field: 'text', reason: kind })),
      );
    }

    let content: string;
    try {
      ({ content } = await this.client.complete(buildMessages(dto)));
    } catch (error) {
      throw toAppException(error);
    }

    return parseReply(content, labelsFor(dto.needsDecision));
  }
}

/** 외부 호출 실패를 앱용 에러로 바꾼다. 외부 오류 내용은 전달하지 않는다. */
function toAppException(error: unknown): AppException {
  const kind = error instanceof UpstreamError ? error.kind : 'unavailable';
  if (kind === 'not_configured') {
    return new AppException(ErrorCode.UPSTREAM_UNAVAILABLE, 'AI 기능이 아직 준비되지 않았습니다.', 503);
  }
  if (kind === 'timeout') {
    return new AppException(
      ErrorCode.UPSTREAM_TIMEOUT,
      'AI 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.',
      504,
    );
  }
  return new AppException(
    ErrorCode.UPSTREAM_UNAVAILABLE,
    'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    503,
  );
}

/**
 * 모델 출력(JSON 문자열)을 검사해 라벨을 붙인다. 형식이 틀리면 자동으로 다시 생성하지 않고 에러로 응답한다
 * (다시 만들기는 사용자가 앱에서 누를 때만).
 */
export function parseReply(content: string, labels: readonly string[]): AiReplyResult {
  const invalid = () =>
    new AppException(ErrorCode.AI_RESPONSE_INVALID, 'AI 답장을 만들지 못했습니다. 다시 시도해 주세요.', 502);

  let parsed: unknown;
  try {
    // 일부 모델이 ```json 으로 감싸서 주는 경우를 허용한다
    const unwrapped = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    parsed = JSON.parse(unwrapped);
  } catch {
    throw invalid();
  }

  const value = parsed as { summary?: unknown; replies?: unknown };
  const summary = typeof value?.summary === 'string' ? value.summary.trim() : '';
  const replies = Array.isArray(value?.replies) ? value.replies : [];
  if (!summary || summary.length > MAX_SUMMARY || replies.length !== labels.length) throw invalid();

  const texts = replies.map((r) => (typeof r === 'string' ? r.trim() : ''));
  if (texts.some((t) => !t || t.length > MAX_REPLY)) throw invalid();

  return { summary, replies: texts.map((text, i) => ({ label: labels[i], text })) };
}
