/**
 * 폰에서 마스킹하지 못한 개인정보가 본문에 남아 있는지 검사한다(서버 쪽 마지막 안전장치).
 * 걸리면 서버로 보낸 문장을 AI 업체에 넘기지 않고 거부한다. 어떤 값이 걸렸는지는 종류만 알려 주고 값은 다루지 않는다.
 *
 * 기준: 앱의 마스킹 모듈(Src/Front/src/utils/masking)이 1차로 가린다. 서버는 **확실한 것만** 막는다.
 * 주문번호·운송장·날짜 같은 정상 메시지를 막지 않도록, 모양만 비슷한 숫자는 거부하지 않는다.
 * - 전화번호: 실제로 쓰는 국번(휴대폰 01X, 지역번호 02·031~064, 070, 050X, 080)으로 시작할 때만
 * - 계좌번호: 숫자 모양에 더해 근처(앞뒤 15자)에 계좌·입금·은행 이름 같은 단서가 있을 때만
 * - 주민등록번호: 앞 6자리가 실제 날짜 모양일 때만
 * 링크(URL)는 막지 않는다. 앱 마스킹도 링크를 가리지 않으므로, 서버만 막으면 링크가 든 메시지는 답장을 받을 수 없다(팀 결정).
 */
export type UnmaskedKind = 'email' | 'phone' | 'account' | 'national_id';

// 숫자 사이 구분자로 쓰는 하이픈·점·공백·가운뎃점
const SEP = '[-.\\s·]?';

// 국번: 휴대폰(010·011·016·017·018·019), 서울 02, 지역 031~033·041~044·051~055·061~064, 070, 050X, 080
const AREA = '(?:1[016789]|2|3[1-3]|4[1-4]|5[1-5]|6[1-4]|70|50\\d|80)';

const PHONE = new RegExp(
  // 국내 표기 010-1234-5678, (02) 123-4567 / 국제 표기 +82 10-1234-5678, +82-2-123-4567
  `(?<!\\d)(?:\\+82${SEP}\\(?0?|\\(?0)${AREA}\\)?${SEP}\\d{3,4}${SEP}\\d{4}(?!\\d)`,
);

const RULES: Array<[UnmaskedKind, RegExp]> = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ['phone', PHONE],
  // 주민등록번호·외국인등록번호: YYMMDD(실제 날짜 모양) + 뒷자리 첫 숫자 1~8 + 6자리
  ['national_id', /(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[-\s]?[1-8]\d{6}(?!\d)/],
];

// 계좌번호 모양: 하이픈·공백으로 나뉜 2~4묶음(합쳐 10자리 이상) 또는 붙여 쓴 10~14자리
const ACCOUNT_SHAPE = /(?<!\d)(?:\d{2,7}(?:[-\s]\d{1,7}){1,3}|\d{10,14})(?!\d)/g;

// 계좌 단서. 일상어와 겹치는 은행 이름(우리·하나·국민·기업)은 넣지 않는다(앱 마스킹이 붙어 쓴 경우를 따로 처리함).
const ACCOUNT_CUES =
  /계좌|입금|이체|송금|예금주|통장|은행|뱅크|신한|농협|카뱅|카카오뱅크|케이뱅크|케뱅|토스뱅크|새마을금고|신협|수협|우체국|SC제일|\bKB\b|\bNH\b|\bIBK\b/i;
const CUE_WINDOW = 15;

function hasAccountWithCue(text: string): boolean {
  for (const m of text.matchAll(ACCOUNT_SHAPE)) {
    if (m[0].replace(/\D/g, '').length < 10) continue;
    const start = m.index ?? 0;
    const around = text.slice(Math.max(0, start - CUE_WINDOW), start + m[0].length + CUE_WINDOW);
    if (ACCOUNT_CUES.test(around)) return true;
  }
  return false;
}

// 앞뒤가 숫자가 아닌, 정확히 전화번호 형태인 부분. 계좌번호 검사에서만 빼고 본다(010-1234-5678 이 계좌번호로도 잡히지 않게).
const EXACT_PHONE = new RegExp(PHONE.source, 'g');

export function findUnmaskedKinds(text: string): UnmaskedKind[] {
  const found = new Set<UnmaskedKind>();
  for (const [kind, pattern] of RULES) {
    if (pattern.test(text)) found.add(kind);
  }
  if (hasAccountWithCue(text.replace(EXACT_PHONE, ' '))) found.add('account');
  return [...found];
}
