// 07 캘린더 일정 (#80). 원문과 같이 기기에만 저장하고 서버로 보내지 않음

// 점 색: 경조사 파랑 · 생일 빨강 · 그 외 초록 (colors.eventOccasion·eventBirthday·eventOther)
export type CalendarEventKind = "occasion" | "birthday" | "other";

// 인원: 연락(1:1 대화방)에서 고른 사람. id는 대화 id
export interface EventPerson {
  id: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO
  // 시간을 모르는 일정(생일, 시간이 없던 메시지): 화면에 시간을 쓰지 않음
  allDay: boolean;
  place?: string;
  people: EventPerson[];
  kind: CalendarEventKind;
  // 메시지에서 찾은 일정이면 그 메시지 (일정 상세 "원문 연락 확인하러 가기"·"답장 보내기")
  source?: { conversationId: string; messageId: string };
  // 친구 생일처럼 다른 데이터에서 만든 일정: 고치거나 지울 수 없음
  readOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  title: string;
  date: string;
  allDay?: boolean;
  place?: string;
  people: EventPerson[];
  // 없으면 제목 낱말로 정함 (eventKindOf)
  kind?: CalendarEventKind;
  source?: CalendarEvent["source"];
}

// "새 일정이 발견됐어요" 카드 한 장 (아직 추가·무시하지 않은 것)
export interface EventSuggestion {
  // 같은 메시지에서 찾은 일정은 같은 key (무시하면 다시 안 보임)
  key: string;
  title: string;
  date: string;
  allDay: boolean;
  place?: string;
  kind: CalendarEventKind;
  source: { conversationId: string; messageId: string };
}
