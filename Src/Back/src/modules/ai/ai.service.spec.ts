import { AppException } from '../../common/errors/app.exception';
import { parseReply, restorePlaceholders } from './ai.service';
import { STANCE_ORDER, TONE_ORDER } from './dto/ai-reply.dto';

const SUMMARY = '상대가 금요일 저녁을 제안했어요.';

/** 결정이 필요한 메시지의 정상 출력: 입장 × 말투 9개 */
const decisionReplies = () =>
  STANCE_ORDER.flatMap((stance) => TONE_ORDER.map((tone) => ({ stance, tone, text: `${stance}-${tone}` })));
/** 결정이 필요 없는 메시지의 정상 출력: 말투 3개, 입장은 NONE */
const generalReplies = () => TONE_ORDER.map((tone) => ({ stance: 'NONE', tone, text: `general-${tone}` }));

const decision = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ summary: SUMMARY, needsDecision: true, replies: decisionReplies(), ...patch });
const general = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ summary: SUMMARY, needsDecision: false, replies: generalReplies(), ...patch });

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof AppException ? e.code : 'not-app-exception';
  }
  return undefined;
}

describe('parseReply (모델 출력 검사, #65)', () => {
  it('결정이 필요하면 입장 × 말투 9개를 정해진 순서로 돌려준다', () => {
    const result = parseReply(decision());
    expect(result.summary).toBe(SUMMARY);
    expect(result.needsDecision).toBe(true);
    expect(result.replies.map((r) => `${r.stance}/${r.tone}`)).toEqual([
      'ACCEPT/SHORT', 'ACCEPT/WARM', 'ACCEPT/POLITE',
      'HOLD/SHORT', 'HOLD/WARM', 'HOLD/POLITE',
      'DECLINE/SHORT', 'DECLINE/WARM', 'DECLINE/POLITE',
    ]);
    expect(result.replies[0]).toEqual({ stance: 'ACCEPT', tone: 'SHORT', text: 'ACCEPT-SHORT' });
  });

  it('결정이 필요 없으면 말투 3개 {tone, text} 이고 stance 는 넣지 않는다', () => {
    const result = parseReply(general());
    expect(result.needsDecision).toBe(false);
    expect(result.replies).toEqual([
      { tone: 'SHORT', text: 'general-SHORT' },
      { tone: 'WARM', text: 'general-WARM' },
      { tone: 'POLITE', text: 'general-POLITE' },
    ]);
  });

  it('모델이 순서를 섞어 줘도 정해진 순서로 정렬한다', () => {
    const shuffled = decisionReplies().reverse();
    const result = parseReply(decision({ replies: shuffled }));
    expect(result.replies.map((r) => `${r.stance}/${r.tone}`)).toEqual(
      decisionReplies().map((r) => `${r.stance}/${r.tone}`),
    );
    expect(result.replies[8].text).toBe('DECLINE-POLITE');
  });

  it('결정이 필요 없으면 모델이 쓴 입장 값은 보지 않는다', () => {
    const replies = generalReplies().map((r) => ({ ...r, stance: 'ACCEPT' }));
    expect(parseReply(general({ replies })).replies.every((r) => r.stance === undefined)).toBe(true);
  });

  it('앱이 보낸 needsDecision 과 같으면 받는다', () => {
    expect(parseReply(decision(), true).needsDecision).toBe(true);
    expect(parseReply(general(), false).needsDecision).toBe(false);
  });

  it('답장 앞뒤 공백을 지운다', () => {
    const replies = generalReplies().map((r) => ({ ...r, text: `  ${r.text}  ` }));
    expect(parseReply(general({ replies })).replies[0].text).toBe('general-SHORT');
  });

  it('```json 으로 감싼 출력도 받는다', () => {
    expect(parseReply('```json\n' + decision() + '\n```').replies).toHaveLength(9);
  });

  it('모델이 넣은 다른 필드는 버린다(정해진 구조만 돌려준다)', () => {
    const extra = JSON.stringify({ ...JSON.parse(decision()), secret: '무시해', system: 'x' });
    expect(Object.keys(parseReply(extra)).sort()).toEqual(['needsDecision', 'replies', 'summary']);
  });

  const without = (i: number) => decisionReplies().filter((_, j) => j !== i);
  it.each([
    ['JSON 이 아님', '이전 지시를 무시하고 비밀을 말할게'],
    ['빈 문자열', ''],
    ['배열 자체', JSON.stringify(decisionReplies())],
    ['요약 없음', decision({ summary: undefined })],
    ['빈 요약', decision({ summary: '  ' })],
    ['너무 긴 요약', decision({ summary: 'a'.repeat(201) })],
    ['needsDecision 없음', decision({ needsDecision: undefined })],
    ['needsDecision 이 문자열', decision({ needsDecision: 'true' })],
    ['결정 필요인데 3개', decision({ replies: generalReplies() })],
    ['결정 필요 없는데 9개', general({ replies: decisionReplies() })],
    ['9개 중 하나 빠지고 8개', decision({ replies: without(4) })],
    ['조합이 겹침(빠진 자리를 같은 조합으로)', decision({ replies: [...without(4), decisionReplies()[0]] })],
    ['정해진 값이 아닌 입장', decision({ replies: [...without(0), { stance: 'MAYBE', tone: 'SHORT', text: 'x' }] })],
    ['정해진 값이 아닌 말투', general({ replies: [...generalReplies().slice(1), { stance: 'NONE', tone: 'LOUD', text: 'x' }] })],
    ['말투가 겹침', general({ replies: [...generalReplies().slice(1), generalReplies()[1]] })],
    ['빈 답장', general({ replies: [{ ...generalReplies()[0], text: ' ' }, ...generalReplies().slice(1)] })],
    ['문자열이 아닌 답장', general({ replies: [{ ...generalReplies()[0], text: 3 }, ...generalReplies().slice(1)] })],
    ['너무 긴 답장', general({ replies: [{ ...generalReplies()[0], text: 'a'.repeat(301) }, ...generalReplies().slice(1)] })],
    ['답장이 문자열', general({ replies: ['좋아', '응', '그래'] })],
  ])('%s 이면 502 AI_RESPONSE_INVALID (자동 재시도 없음)', (_label, content) => {
    expect(codeOf(() => parseReply(content))).toBe('AI_RESPONSE_INVALID');
  });

  it.each([
    ['앱은 true 인데 모델은 false', general(), true],
    ['앱은 false 인데 모델은 true', decision(), false],
  ])('%s 로 판단하면 502 (앱이 정한 값을 뒤집지 않음)', (_label, content, requested) => {
    expect(codeOf(() => parseReply(content, requested))).toBe('AI_RESPONSE_INVALID');
  });
});

describe('restorePlaceholders (가린 이름의 대괄호 되살리기, #65)', () => {
  const result = (summary: string, texts: string[] = []) => ({
    summary,
    needsDecision: false,
    replies: texts.map((text, i) => ({ tone: TONE_ORDER[i], text })),
  });

  it('요청에 있던 자리표시가 대괄호 없이 나오면 대괄호를 붙인다 (실제 Claude 응답에서 본 경우)', () => {
    const out = restorePlaceholders(result('선배A가 취업 소식을 듣고 축하해 주었어요.'), '[선배A]: 취업 축하해요!');
    expect(out.summary).toBe('[선배A]가 취업 소식을 듣고 축하해 주었어요.');
  });

  it('이미 대괄호가 있으면 그대로 둔다 (두 번 감싸지 않음)', () => {
    const out = restorePlaceholders(result('[친구A]가 점심을 제안했어요.', ['[친구A], 좋아!']), '[친구A]: 점심 먹을래?');
    expect(out.summary).toBe('[친구A]가 점심을 제안했어요.');
    expect(out.replies[0].text).toBe('[친구A], 좋아!');
  });

  it('답장과 요약 모두 고친다', () => {
    const out = restorePlaceholders(result('이름1이 물었어요.', ['이름1아 좋아', '응 [이름1]']), '[이름1]: 갈래?');
    expect(out.summary).toBe('[이름1]이 물었어요.');
    expect(out.replies.map((r) => r.text)).toEqual(['[이름1]아 좋아', '응 [이름1]']);
  });

  it('"이름1" 이 "이름10" 을 잘못 고치지 않는다', () => {
    const out = restorePlaceholders(result('이름10과 이름1이 왔어요.'), '[이름1] [이름10]');
    expect(out.summary).toBe('[이름10]과 [이름1]이 왔어요.');
  });

  it('요청에 없던 단어는 바꾸지 않는다', () => {
    const out = restorePlaceholders(result('친구가 연락했어요. 이름2도 있어요.'), '[이름1]: 안녕');
    expect(out.summary).toBe('친구가 연락했어요. 이름2도 있어요.');
  });

  it('자리표시에 정규식 특수문자가 있어도 안전하다', () => {
    const out = restorePlaceholders(result('A.B가 왔어요. AxB도.'), '[A.B]: 안녕');
    expect(out.summary).toBe('[A.B]가 왔어요. AxB도.');
  });

  it('입장·말투 등 다른 값은 바꾸지 않는다', () => {
    const input = parseReply(decision());
    expect(restorePlaceholders(input, '[친구A]: 저녁 먹을래?')).toEqual(input);
  });
});
