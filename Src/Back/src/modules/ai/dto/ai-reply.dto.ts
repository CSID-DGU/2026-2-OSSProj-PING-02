import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** 메시지를 보낸 사람과 나의 관계. 답장 말투(친구 반말, 윗사람 존댓말, 기관 격식)를 정한다. */
export enum Relation {
  FRIEND = 'FRIEND',
  SUPERIOR = 'SUPERIOR',
  INSTITUTION = 'INSTITUTION',
}

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

  /** 초대·부탁처럼 수락/보류/거절을 정해야 하는 메시지인지. 아니면 짧게/다정하게/공손하게 답장을 만든다. */
  @IsBoolean()
  needsDecision: boolean;
}
