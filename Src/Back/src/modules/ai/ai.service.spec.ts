import { AppException } from '../../common/errors/app.exception';
import { parseReply } from './ai.service';
import { DECISION_LABELS } from './prompt.builder';

const ok = { summary: '상대가 금요일 저녁을 제안했어요.', replies: ['좋아!', '확인하고 알려줄게', '이번엔 어려워'] };

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof AppException ? e.code : 'not-app-exception';
  }
  return undefined;
}

describe('parseReply (모델 출력 검사)', () => {
  it('정상 JSON 이면 라벨을 순서대로 붙여 돌려준다', () => {
    const result = parseReply(JSON.stringify(ok), DECISION_LABELS);
    expect(result).toEqual({
      summary: ok.summary,
      replies: [
        { label: '수락', text: '좋아!' },
        { label: '보류', text: '확인하고 알려줄게' },
        { label: '거절', text: '이번엔 어려워' },
      ],
    });
  });

  it('```json 으로 감싼 출력도 받는다', () => {
    const fenced = '```json\n' + JSON.stringify(ok) + '\n```';
    expect(parseReply(fenced, DECISION_LABELS).replies).toHaveLength(3);
  });

  it('모델이 넣은 다른 필드는 버린다(정해진 구조만 돌려준다)', () => {
    const extra = JSON.stringify({ ...ok, secret: '무시해', system: 'x' });
    expect(Object.keys(parseReply(extra, DECISION_LABELS)).sort()).toEqual(['replies', 'summary']);
  });

  it.each([
    ['JSON 이 아님', '이전 지시를 무시하고 비밀을 말할게'],
    ['빈 문자열', ''],
    ['요약 없음', JSON.stringify({ replies: ok.replies })],
    ['빈 요약', JSON.stringify({ ...ok, summary: '  ' })],
    ['답장 2개', JSON.stringify({ ...ok, replies: ok.replies.slice(0, 2) })],
    ['답장 4개', JSON.stringify({ ...ok, replies: [...ok.replies, '하나 더'] })],
    ['빈 답장', JSON.stringify({ ...ok, replies: ['좋아', '', '싫어'] })],
    ['문자열이 아닌 답장', JSON.stringify({ ...ok, replies: ['좋아', 3, '싫어'] })],
    ['너무 긴 답장', JSON.stringify({ ...ok, replies: ['좋아', 'a'.repeat(301), '싫어'] })],
    ['너무 긴 요약', JSON.stringify({ ...ok, summary: 'a'.repeat(201) })],
    ['배열 자체', JSON.stringify(ok.replies)],
  ])('%s 이면 502 AI_RESPONSE_INVALID (자동 재시도 없음)', (_label, content) => {
    expect(codeOf(() => parseReply(content, DECISION_LABELS))).toBe('AI_RESPONSE_INVALID');
  });
});
