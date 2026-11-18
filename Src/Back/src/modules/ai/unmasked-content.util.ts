/**
 * 폰에서 마스킹하지 못한 개인정보가 본문에 남아 있는지 검사한다(이중 안전장치).
 * 걸리면 서버로 보낸 문장을 AI 업체에 넘기지 않고 거부한다. 어떤 값이 걸렸는지는 종류만 알려 주고 값은 다루지 않는다.
 */
export type UnmaskedKind = 'url' | 'email' | 'phone' | 'account' | 'national_id';

const RULES: Array<[UnmaskedKind, RegExp]> = [
  ['url', /(?:https?:\/\/|www\.)\S+/i],
  ['url', /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|kr|co\.kr|io|me|ly|gl|app)(?:\/\S*)?\b/i],
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  // 010-1234-5678, 02-123-4567, +82 10 1234 5678, 01012345678
  ['phone', /(?:\+82[-.\s]?)?\(?0?\d{1,2}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b/],
  // 주민등록번호 형태 (6자리-7자리)
  ['national_id', /\b\d{6}[-\s]?[1-4]\d{6}\b/],
  // 계좌번호: 하이픈으로 나뉜 3묶음 이상(마지막 4자리 이상) 또는 10자리 이상 연속 숫자. 날짜(2026-11-18)는 걸리지 않는다.
  ['account', /\b\d{3,6}-\d{2,6}-\d{4,8}(?:-\d{1,4})?\b/],
  ['account', /\d{10,}/],
];

// 앞뒤가 숫자가 아닌, 정확히 전화번호 형태인 부분. 계좌번호 검사에서만 빼고 본다(010-1234-5678 이 계좌번호로도 잡히지 않게).
const EXACT_PHONE = /(?<!\d)(?:\+82[-.\s]?)?0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;

export function findUnmaskedKinds(text: string): UnmaskedKind[] {
  const found = new Set<UnmaskedKind>();
  const withoutPhones = text.replace(EXACT_PHONE, ' ');
  for (const [kind, pattern] of RULES) {
    if (pattern.test(kind === 'account' ? withoutPhones : text)) found.add(kind);
  }
  return [...found];
}
