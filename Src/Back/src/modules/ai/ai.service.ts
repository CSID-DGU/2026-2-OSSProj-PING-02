import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { AI_COMPLETION_CLIENT, AiCompletionClient } from './ai-completion.client';
import { AiReplyDto, Stance, STANCE_ORDER, Tone, TONE_ORDER } from './dto/ai-reply.dto';
import { UpstreamError } from './openrouter.client';
import { buildMessages } from './prompt.builder';
import { findUnmaskedKinds } from './unmasked-content.util';

/** 결정이 필요하면 입장 × 말투 9개({stance, tone, text}), 아니면 말투 3개({tone, text}) (#65). */
export interface AiReplyCandidate {
  stance?: Stance;
  tone: Tone;
  text: string;
}

export interface AiReplyResult {
  summary: string;
  needsDecision: boolean;
  replies: AiReplyCandidate[];
}

const MAX_SUMMARY = 200;
const MAX_REPLY = 300;

/**
 * AI 답장 통로. 받은 문장을 검사하고 외부 AI(주: OpenRouter, 보조: Claude API)에 넘긴 뒤 결과를 그대로 돌려준다.
 * 본문·요약·답장은 어디에도 저장하거나 기록하지 않는다(메모리에서만 다룬다).
 */
@Injectable()
export class AiService {
  constructor(
    @Inject(AI_COMPLETION_CLIENT) private readonly client: AiCompletionClient,
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

    // null 은 보내지 않은 것과 같게 본다 (AI 가 판단)
    const needsDecision = dto.needsDecision ?? undefined;

    let content: string;
    try {
      ({ content } = await this.client.complete(buildMessages({ ...dto, needsDecision })));
    } catch (error) {
      throw toAppException(error);
    }

    return restorePlaceholders(parseReply(content, needsDecision), dto.text);
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
 * 모델 출력(JSON 문자열)을 검사해 앱에 줄 모양으로 바꾼다 (#65).
 * - 결정이 필요하면 입장 × 말투 9개가 하나씩 있어야 하고, 아니면 말투 3개가 하나씩 있어야 한다.
 * - 순서가 섞여 있으면 정해진 순서(ACCEPT→HOLD→DECLINE × SHORT→WARM→POLITE)로 정렬한다.
 * - 앱이 needsDecision 을 보냈는데 모델이 다르게 판단했으면 받지 않는다.
 * 형식이 틀리면 자동으로 다시 생성하지 않고 에러로 응답한다 (다시 만들기는 사용자가 앱에서 누를 때만).
 */
export function parseReply(content: string, requestedNeedsDecision?: boolean): AiReplyResult {
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

  const value = parsed as { summary?: unknown; needsDecision?: unknown; replies?: unknown };
  const summary = typeof value?.summary === 'string' ? value.summary.trim() : '';
  if (!summary || summary.length > MAX_SUMMARY) throw invalid();

  if (typeof value.needsDecision !== 'boolean') throw invalid();
  const needsDecision = value.needsDecision;
  if (requestedNeedsDecision !== undefined && needsDecision !== requestedNeedsDecision) throw invalid();

  const items = Array.isArray(value.replies) ? value.replies : [];
  // 입장(결정이 필요할 때만)과 말투 조합마다 답장 하나
  const slots = needsDecision
    ? STANCE_ORDER.flatMap((stance) => TONE_ORDER.map((tone) => ({ stance, tone })))
    : TONE_ORDER.map((tone) => ({ stance: undefined, tone }));
  if (items.length !== slots.length) throw invalid();

  const byKey = new Map<string, string>();
  for (const item of items) {
    const r = item as { stance?: unknown; tone?: unknown; text?: unknown };
    const text = typeof r?.text === 'string' ? r.text.trim() : '';
    if (!text || text.length > MAX_REPLY) throw invalid();
    // 결정이 필요 없으면 입장 값은 보지 않는다 (모델은 "NONE" 을 쓴다)
    const key = `${needsDecision ? String(r.stance) : ''}:${String(r.tone)}`;
    if (byKey.has(key)) throw invalid(); // 같은 조합이 두 번
    byKey.set(key, text);
  }

  const replies = slots.map(({ stance, tone }) => {
    const text = byKey.get(`${stance ?? ''}:${tone}`);
    if (text === undefined) throw invalid(); // 빠진 조합 (또는 정해진 값이 아닌 입장·말투)
    return stance ? { stance, tone, text } : { tone, text };
  });

  return { summary, needsDecision, replies };
}

/**
 * 가린 이름 자리표시([이름1], [친구A] 등)의 대괄호를 되살린다 (#65).
 * 앱은 응답에서 대괄호 자리표시를 찾아 원래 이름으로 되돌리는데, 모델이 가끔 대괄호를 빼고 "이름1이"처럼 쓴다.
 * 요청 문장에 실제로 있던 자리표시만, 대괄호 없이 나온 곳에 다시 붙인다(다른 글자는 바꾸지 않는다).
 * - "이름1" 이 "이름10" 의 앞부분을 잘못 고치지 않도록 긴 것부터, 뒤에 숫자가 이어지면 건너뛴다.
 * - 한국어 조사("선배A가")는 바로 붙으므로 뒤 글자는 막지 않는다.
 */
export function restorePlaceholders(result: AiReplyResult, inputText: string): AiReplyResult {
  const labels = [...new Set([...inputText.matchAll(/\[([^[\]\n]{1,30})\]/g)].map((m) => m[1].trim()))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (labels.length === 0) return result;

  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = labels.map((label) => ({
    label,
    // 앞에 "[" 가 없고, 뒤에 "]" 나 숫자가 이어지지 않는 곳만
    re: new RegExp(`(?<!\\[)${escape(label)}(?![\\]\\d])`, 'gu'),
  }));
  const fix = (text: string) => patterns.reduce((acc, { label, re }) => acc.replace(re, `[${label}]`), text);

  return {
    ...result,
    summary: fix(result.summary),
    replies: result.replies.map((r) => ({ ...r, text: fix(r.text) })),
  };
}
