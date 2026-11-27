import type { Account, Person } from "../conversation/types";

// mock 친구 데이터 (Figma 05 친구 예시 + 연락 mock과 같은 사람들)
// - 민지: 카카오톡 + 인스타그램 계정을 같은 사람으로 합쳐 둔 상태, 문자 "김민지"는 아직 연결 안 됨(합치기 후보)
// - 지연: 얼려둔 관계, 이도현: 긴 이름(말줄임 확인)
// - 06 관계·별/하트: 민지 친구♥, 준호 가족, 김서연 선배 기타, 예린 직장★, 나머지 친구
// - 유영서: NEW (새로 발견한 발신자, 카카오톡 + 문자)
// 1:1 대화가 있는 계정 id는 연락 mock 메시지의 accountId(`대화id-보낸 사람`)와 같게 맞춤
const DAY = 24 * 60 * 60_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export const PERSONS: Person[] = [
  {
    id: "p-minji",
    displayName: "민지",
    isFriend: true,
    frozen: false,
    memo: "대학교 친구 · 편하게 안부를 물어볼 수 있음",
    birthday: "05-18",
    relation: "friend",
    favorite: true,
  },
  {
    id: "p-junho",
    displayName: "준호",
    isFriend: true,
    frozen: false,
    memo: "고등학교 친구 · 생일을 먼저 챙겨 줌",
    relation: "family",
  },
  {
    id: "p-seoyeon",
    displayName: "김서연 선배",
    isFriend: true,
    frozen: false,
    memo: "동아리 선배",
    birthday: "12-03",
    relation: "etc",
  },
  {
    id: "p-haneul",
    displayName: "하늘",
    isFriend: true,
    frozen: false,
    relation: "friend",
  },
  {
    id: "p-yerin",
    displayName: "예린",
    isFriend: true,
    frozen: false,
    memo: "스터디 친구",
    relation: "work",
    favorite: true,
  },
  {
    id: "p-siwoo",
    displayName: "시우",
    isFriend: true,
    frozen: false,
    relation: "friend",
  },
  {
    id: "p-dohyun",
    displayName: "고등학교 축구부에서 함께 뛰던 이도현",
    isFriend: true,
    frozen: false,
    relation: "friend",
  },
  {
    id: "p-jiyeon",
    displayName: "지연",
    isFriend: true,
    frozen: true,
    memo: "중학교 친구",
    birthday: "09-02",
    relation: "friend",
  },
  // NEW: 아직 친구로 등록하지 않은 발신자 (06 E02에서 연결하거나 새 친구로 추가)
  { id: "p-new-youngseo", displayName: "유영서", isFriend: false, frozen: false },
];

export const ACCOUNTS: Account[] = [
  { id: "minji-민지", personId: "p-minji", app: "KAKAOTALK", senderName: "민지" },
  { id: "ig-minji_daily", personId: "p-minji", app: "INSTAGRAM", senderName: "minji_daily" },
  { id: "junho-준호", personId: "p-junho", app: "KAKAOTALK", senderName: "준호" },
  { id: "seoyeon-김서연 선배", personId: "p-seoyeon", app: "KAKAOTALK", senderName: "김서연 선배" },
  { id: "haneul-하늘", personId: "p-haneul", app: "INSTAGRAM", senderName: "하늘" },
  { id: "yerin-예린", personId: "p-yerin", app: "KAKAOTALK", senderName: "예린" },
  { id: "siwoo-시우", personId: "p-siwoo", app: "INSTAGRAM", senderName: "시우" },
  { id: "kakao-도현", personId: "p-dohyun", app: "KAKAOTALK", senderName: "도현" },
  { id: "sms-지연", personId: "p-jiyeon", app: "SMS", senderName: "지연" },
  // 아직 친구와 연결 안 된 발신자 (민지와 합치기 후보)
  { id: "sms-김민지", personId: null, app: "SMS", senderName: "김민지" },
  { id: "kakao-유영서", personId: "p-new-youngseo", app: "KAKAOTALK", senderName: "유영서" },
  { id: "sms-유영서", personId: "p-new-youngseo", app: "SMS", senderName: "유영서" },
];

// 대화가 없는 계정의 마지막 연락 (기기 안 기록에서 가져온 값이라고 가정)
export const CONTACTED_AT: Record<string, string> = {
  "kakao-유영서": daysAgo(7),
  "ig-minji_daily": daysAgo(90),
  "kakao-도현": daysAgo(62),
  "sms-지연": daysAgo(240),
  "sms-김민지": daysAgo(400),
};

// 15 첫마디 후보: "오래 연락 못 했다"는 사과·압박 대신 가볍게 안부를 묻는 문장
// TODO(Figma 문구 확인): 시안 두 번째 후보 "연락이 늦었어. 잘 지내는지 궁금했어."는
//   늦었다는 사과로 읽혀서 부담 없는 문장으로 바꿈
export const FIRST_WORDS_DEFAULT = [
  "오랜만이야. 문득 생각나서 연락해봤어.",
  "잘 지내는지 궁금했어. 요즘 어때?",
  "요즘 어떻게 지내? 편할 때 답해줘.",
];

export const FIRST_WORDS: Record<string, string[]> = {
  "p-jiyeon": [
    "지연아, 문득 생각나서 연락해봤어.",
    "잘 지내? 요즘 어떻게 지내는지 궁금했어.",
    "날씨가 많이 추워졌네. 감기 조심해!",
  ],
  "p-dohyun": [
    "도현아, 문득 축구하던 때가 생각나서 연락해봤어.",
    "잘 지내? 요즘 어떻게 지내는지 궁금했어.",
    "요즘 어떻게 지내? 편할 때 답해줘.",
  ],
};
