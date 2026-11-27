import type { CalendarEventKind, EventSuggestion } from "./types";

// 05 연락 D03 "새 일정이 발견됐어요": 메시지에서 일정 찾기 (기기 안 규칙, 팀 확정 #80)
// TODO(AI 일정): AI 답장 응답에 일정 항목이 생기면 이 함수만 AI 결과로 바꿔 끼움
//   (입력: 대화의 메시지 / 출력: EventSuggestion[]. CalendarService.findSuggestions가 이 함수 하나만 부름)
// 규칙
// - 날짜: "11월 29일", "내일", "모레" (받은 날 기준. 지난 날짜면 다음 해)
// - 시간: "오후 1시", "오전 10시 30분", "13:00" (없으면 하루 종일)
// - 종류·이름: 결혼식·청첩장 모임(청모)·돌잔치·장례 → 경조사, 생일 → 생일, 모임·약속·회의·발표·마감·시험 등 → 그 외
//   제목은 "{보낸 사람} {이름}", 낱말이 없으면 "{보낸 사람} 약속"
// - 장소: "충무로역 4번 출구", "신라호텔 영빈관", "~에서" 앞 낱말
// 날짜가 없으면 일정이 아님

export interface MessageForEvents {
  id: string;
  conversationId: string;
  senderName: string;
  text: string;
  receivedAt: string;
}

interface KindRule {
  pattern: RegExp;
  label: string;
  kind: CalendarEventKind;
}

const KIND_RULES: KindRule[] = [
  { pattern: /결혼식|웨딩|예식/, label: "결혼식", kind: "occasion" },
  { pattern: /청첩장|청모/, label: "청모", kind: "occasion" },
  { pattern: /돌잔치/, label: "돌잔치", kind: "occasion" },
  { pattern: /장례|부고|발인|빈소/, label: "장례식", kind: "occasion" },
  { pattern: /생일|생신/, label: "생일", kind: "birthday" },
  { pattern: /회의|미팅/, label: "회의", kind: "other" },
  { pattern: /발표/, label: "발표", kind: "other" },
  { pattern: /마감|제출/, label: "마감", kind: "other" },
  { pattern: /시험/, label: "시험", kind: "other" },
  { pattern: /면접/, label: "면접", kind: "other" },
  { pattern: /스터디/, label: "스터디", kind: "other" },
  { pattern: /동창회/, label: "동창회", kind: "other" },
  { pattern: /모임/, label: "모임", kind: "other" },
  { pattern: /상담|진료|예약/, label: "예약", kind: "other" },
];

// 직접 추가한 일정의 종류 (팀 확정: 제목 낱말로)
export const eventKindOf = (title: string): CalendarEventKind =>
  KIND_RULES.find(r => r.pattern.test(title) && r.kind !== "other")?.kind ??
  "other";

const findDay = (text: string, received: Date): Date | null => {
  const base = new Date(
    received.getFullYear(),
    received.getMonth(),
    received.getDate()
  );
  const md = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (md) {
    const month = Number(md[1]) - 1;
    const day = Number(md[2]);
    if (month > 11 || day < 1 || day > 31) return null;
    const date = new Date(base.getFullYear(), month, day);
    if (date < base) date.setFullYear(date.getFullYear() + 1);
    return date;
  }
  if (/모레/.test(text)) return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 2);
  if (/내일/.test(text)) return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  return null;
};

// 하루 중 분 (없으면 null)
const findMinutes = (text: string): number | null => {
  const ko = text.match(/(오전|오후|아침|저녁|밤)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?/);
  if (ko) {
    let hour = Number(ko[2]) % 12;
    if (ko[1] === "오후" || ko[1] === "저녁" || ko[1] === "밤") hour += 12;
    const minute = ko[3] ? Number(ko[3]) : /반/.test(ko[0]) ? 30 : 0;
    return hour * 60 + minute;
  }
  const hm = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (hm && Number(hm[1]) < 24 && Number(hm[2]) < 60) {
    return Number(hm[1]) * 60 + Number(hm[2]);
  }
  const plain = text.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  if (plain && Number(plain[1]) <= 24) {
    return (Number(plain[1]) % 24) * 60 + (plain[2] ? Number(plain[2]) : 0);
  }
  return null;
};

const PLACE_PATTERN =
  /([가-힣A-Za-z0-9]+(?:역|홀|예식장|웨딩홀|컨벤션|호텔|카페|식당|센터|학교|병원)(?:\s*[가-힣0-9]+(?:번\s*출구|관|층|호))?)/;

const findPlace = (text: string): string | undefined => {
  const named = text.match(PLACE_PATTERN);
  if (named) return named[1].trim();
  const at = text.match(/([가-힣A-Za-z0-9]{2,})\s*에서/);
  return at ? at[1] : undefined;
};

export const findEventsInMessages = (
  messages: MessageForEvents[]
): EventSuggestion[] =>
  messages.flatMap(m => {
    const received = new Date(m.receivedAt);
    const day = findDay(m.text, received);
    if (!day) return [];
    const minutes = findMinutes(m.text);
    const rule = KIND_RULES.find(r => r.pattern.test(m.text));
    const date = new Date(day);
    date.setHours(minutes === null ? 0 : Math.floor(minutes / 60), minutes === null ? 0 : minutes % 60);
    return [
      {
        key: m.id,
        title: `${m.senderName} ${rule?.label ?? "약속"}`,
        date: date.toISOString(),
        allDay: minutes === null,
        place: findPlace(m.text),
        kind: rule?.kind ?? "other",
        source: { conversationId: m.conversationId, messageId: m.id },
      },
    ];
  });
