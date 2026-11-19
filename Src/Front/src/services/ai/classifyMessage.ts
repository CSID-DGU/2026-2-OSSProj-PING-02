import type { Relation } from "./AiReplyService";

// AI 답장 요청의 relation(말투)과 needsDecision(수락/거절 칸)을 기기에서 규칙으로 정함
// 규칙은 원문(마스킹 전)을 기기 안에서만 보고, 결과(관계·불리언)만 서버로 보냄
// 사용자가 친구별로 관계를 정해 두면 그 값이 규칙보다 먼저임 (classifyRelation의 saved)

export interface RelationInput {
  /** 친구 설정 등 사용자가 직접 정한 관계. 있으면 규칙을 보지 않음 */
  saved?: Relation;
  /** 알림의 보낸 사람 표시 이름 (예: "김민수", "박팀장님", "1588-0000", "국민건강보험") */
  senderName: string;
  /** 보낸 사람이 쓴 최근 메시지들 (오래된 것 → 최근) */
  texts: string[];
}

export interface Classified<T> {
  value: T;
  /** 어떤 규칙으로 정했는지 (디버그·테스트용, 서버로 보내지 않음) */
  reason: string;
}

// 기관·회사·서비스 이름에 흔한 낱말
const INSTITUTION_NAME_RE =
  /은행|뱅크|카드|보험|증권|공단|공사|구청|시청|군청|도청|주민센터|행정복지센터|우체국|택배|배송|병원|의원|치과|약국|학교|대학교|학원|어린이집|유치원|관리사무소|고객센터|센터$|정부|국세청|세무서|경찰|법원|검찰|협회|재단|㈜|\(주\)|주식회사|쇼핑|마트|몰$|스토어|통신|텔레콤|SKT|KT|LG ?U\+/i;
// 번호만 있는 발신자 (대표번호 1588-0000, 문자 발신번호 등)
const NUMBER_ONLY_RE = /^[\d\s\-+().#*]+$/;
// 기관·광고 문자에 흔한 표현
const INSTITUTION_TEXT_RE =
  /\[Web발신\]|\(광고\)|\[광고\]|고객님|회원님|본인인증|인증번호|수신거부|무료거부|납부|고지서|청구|예약이 (?:확정|완료)|배송(?:이|을|중|완료)|주문(?:이|하신)/;
// 존댓말로 답해야 할 사람의 호칭·직함
const SUPERIOR_TITLE_RE =
  /교수|선생|쌤|팀장|부장|과장|차장|실장|대표|사장|원장|이사|상무|전무|본부장|센터장|소장|선배|사모님|목사|신부|스님|할머니|할아버지|어머님|아버님|장모님|장인어른|시어머니|시아버지|님$/;
// 존댓말 문장 끝 (해요체·하십시오체)
const POLITE_END_RE =
  /(?:요|니다|니까|세요|셔요|십시오|시죠|죠)[\s.!?~^ㅎㅠ]*$/;

/** 보낸 사람 이름이 기관·회사·번호처럼 보이는지 */
export const looksLikeInstitution = (senderName: string) => {
  const name = senderName.trim();
  return NUMBER_ONLY_RE.test(name) || INSTITUTION_NAME_RE.test(name);
};

const splitSentences = (texts: string[]) =>
  texts
    .flatMap((t) => t.split(/[\n.!?]+(?=\s|$)|\n/))
    .map((s) => s.trim())
    .filter(Boolean);

export function classifyRelation({
  saved,
  senderName,
  texts,
}: RelationInput): Classified<Relation> {
  if (saved) {
    return { value: saved, reason: "사용자 설정" };
  }
  const name = senderName.trim();
  if (NUMBER_ONLY_RE.test(name)) {
    return { value: "INSTITUTION", reason: "번호만 있는 발신자" };
  }
  if (INSTITUTION_NAME_RE.test(name)) {
    return { value: "INSTITUTION", reason: "기관·회사 이름" };
  }
  if (texts.some((t) => INSTITUTION_TEXT_RE.test(t))) {
    return { value: "INSTITUTION", reason: "기관·광고 문자 표현" };
  }
  if (SUPERIOR_TITLE_RE.test(name)) {
    return { value: "SUPERIOR", reason: "호칭·직함" };
  }
  // 상대가 존댓말을 주로 쓰면 아직 반말할 사이가 아닐 가능성이 높아 존댓말로 답함
  const sentences = splitSentences(texts);
  const polite = sentences.filter((s) => POLITE_END_RE.test(s)).length;
  if (sentences.length > 0 && polite * 2 > sentences.length) {
    return { value: "SUPERIOR", reason: "상대가 존댓말을 씀" };
  }
  return { value: "FRIEND", reason: "기본값(친구)" };
}

// 수락/거절을 정해야 하는 메시지의 단서. 위에서부터 먼저 맞는 것을 이유로 씀
// "~줘서"(고마워 해줘서)는 부탁이 아니라 고마움이라 뺀다
const ASK = "(?:줘(?!서)|줄래|줄 ?수|주세요|주실|주시겠)";
const DECISION_RULES: Array<[RegExp, string]> = [
  [
    /초대|청첩장|결혼식|돌잔치|집들이|생일 ?파티|송년회|신년회|회식|모임|번개|동창회|참석|참여 ?(?:여부|가능)/,
    "초대·모임",
  ],
  [
    new RegExp(
      `부탁|(?:해|도와|빌려|보내|와|맡아|챙겨|사다|데려다) ?${ASK}|대신 ?해`
    ),
    "부탁",
  ],
  [
    /가능(?:해|할까|하세요|하신가요|할까요|한가요|하니|하냐|하실까요)|시간 ?(?:돼|되|괜찮|있)|괜찮(?:아|으세요|으신가요|을까|겠어|겠어요)\s*[?？]|어때(?:요)?\s*[?？]|어떠(?:세요|신가요|니)/,
    "가능 여부·제안",
  ],
  // "먹을래?", "갈래요?" (그래?·뭐래? 같은 되묻기는 뺌)
  [/[가-힣](?<![그이저뭐])래(?:요)?\s*[?？]/, "~래? 제안"],
  // "할까?", "만날까요?"
  [/[가-힣]까(?:요)?\s*[?？]/, "~까? 제안"],
  // "만나자", "가자", "보자", "먹자" (남자·과자 같은 낱말은 빼려고 흔한 동사만)
  [
    /(?:하|가|보|먹|만나|놀|마시|오|타|사|모이|나가|들어가|찍|쉬|잡|정하|노)자(?:요)?(?![가-힣])/,
    "~자 제안",
  ],
  [
    /회신|답장 ?(?:부탁|주세요|줘)|확인 ?(?:부탁|해 ?주세요|해 ?줘)/,
    "회신 요청",
  ],
  [/(?:놀러|밥 먹으러|보러|집에|우리 ?집) ?와(?![가-힣])/, "오라는 초대"],
];

/** 보낸 사람의 최근 메시지로 needsDecision을 정함. 단서가 없으면 false(짧게·다정하게·공손하게) */
export function classifyNeedsDecision(
  texts: string[],
  saved?: boolean
): Classified<boolean> {
  if (saved !== undefined) {
    return { value: saved, reason: "직접 지정" };
  }
  const joined = texts.join("\n");
  for (const [re, reason] of DECISION_RULES) {
    if (re.test(joined)) {
      return { value: true, reason };
    }
  }
  return { value: false, reason: "결정 단서 없음" };
}
