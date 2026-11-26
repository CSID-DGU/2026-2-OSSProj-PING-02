import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** 메시지를 보낸 사람과 나의 관계. 답장 말투(친구 반말, 윗사람 존댓말, 기관 격식)를 정한다. */
export enum Relation {
  FRIEND = 'FRIEND',
  SUPERIOR = 'SUPERIOR',
  INSTITUTION = 'INSTITUTION',
}

/** 답장의 입장. 결정이 필요한 메시지(needsDecision=true)의 답장에만 붙는다. */
export enum Stance {
  ACCEPT = 'ACCEPT',
  HOLD = 'HOLD',
  DECLINE = 'DECLINE',
}

/** 답장의 말투. 모든 답장에 붙는다. */
export enum Tone {
  SHORT = 'SHORT',
  WARM = 'WARM',
  POLITE = 'POLITE',
}

/** 응답의 답장 순서. 결정이 필요하면 입장 × 말투 9개, 아니면 말투 3개 (#65). */
export const STANCE_ORDER: readonly Stance[] = [Stance.ACCEPT, Stance.HOLD, Stance.DECLINE];
export const TONE_ORDER: readonly Tone[] = [Tone.SHORT, Tone.WARM, Tone.POLITE];

/**
 * AI 답장 요청. 앱이 마스킹을 끝낸 문장과 구조화된 칸만 보낸다(프롬프트는 서버가 만든다).
 * 허용 길이의 실제 상한은 환경변수(AI_MAX_INPUT_CHARS)로 서비스에서 한 번 더 확인하고,
 * 여기의 값은 그보다 큰 입력을 아예 읽지 않기 위한 절대 상한이다.
 */
export class AiReplyDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;

  @IsEnum(Relation)
  relation: Relation;

  /**
   * 선택. 수락/보류/거절을 정해야 하는 메시지인지 (#65).
   * 보내지 않으면 AI 가 요약하면서 판단한다(제안·초대·부탁·질문 → true, 안부·인사·축하·정보 전달 → false).
   * 보내면 AI 가 뒤집지 않고 그 값을 쓴다.
   */
  @IsOptional()
  @IsBoolean()
  needsDecision?: boolean;
}
