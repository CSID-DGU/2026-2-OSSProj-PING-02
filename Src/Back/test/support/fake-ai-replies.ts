// 가짜 AI 서버(OpenRouter·Claude)가 돌려줄 모델 출력 (#65).
// 서버가 만든 프롬프트를 보고 진짜 모델처럼 needsDecision 에 맞는 답장 9개 또는 3개를 만든다.

export const FAKE_SUMMARY = '상대가 저녁을 제안했어요.';

const STANCES = ['ACCEPT', 'HOLD', 'DECLINE'] as const;
const TONES = ['SHORT', 'WARM', 'POLITE'] as const;

/** 답장 문장: 어느 칸의 답장인지 테스트에서 알아볼 수 있게 입장·말투를 넣는다 */
export const replyText = (tone: string, stance?: string) => (stance ? `${stance}-${tone} 답장` : `${tone} 답장`);

/** 앱이 받는 9개 (정해진 순서) */
export const DECISION_REPLIES = STANCES.flatMap((stance) =>
  TONES.map((tone) => ({ stance, tone, text: replyText(tone, stance) })),
);
/** 앱이 받는 3개 (stance 없음) */
export const GENERAL_REPLIES = TONES.map((tone) => ({ tone, text: replyText(tone) }));

/**
 * 모델 출력(JSON 문자열). 일부러 순서를 섞어서 서버가 정렬하는지도 같이 본다.
 * @param userPrompt 서버가 보낸 사용자 메시지 (앱이 needsDecision 을 정했는지 여기 적혀 있다)
 * @param decideWhenAsked 모델이 직접 판단해야 할 때 내릴 판단
 */
export function fakeModelOutput(userPrompt: string, decideWhenAsked: boolean): string {
  const needsDecision = userPrompt.includes('needsDecision은 true로')
    ? true
    : userPrompt.includes('needsDecision은 false로')
      ? false
      : decideWhenAsked;
  const replies = needsDecision
    ? DECISION_REPLIES.map((r) => ({ ...r }))
    : GENERAL_REPLIES.map((r) => ({ stance: 'NONE', ...r }));
  return JSON.stringify({ summary: FAKE_SUMMARY, needsDecision, replies: replies.reverse() });
}
