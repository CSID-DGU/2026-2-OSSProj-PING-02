// 로컬 DB 구조 기준 타입 (기기 안 암호화 DB에 저장, 서버로 보내지 않음)
// person · account · conversation · message · analysis · event · reply_candidate · deferred_reply
import type { LinkedApp } from "@constants/onboarding";

export type MessengerApp = LinkedApp;

// person: 친구 한 명 (여러 메신저 계정을 가질 수 있음)
export interface Person {
  id: string;
  displayName: string;
  isFriend: boolean;
  // 05 친구: 사용자가 남기는 관계 메모 (평가가 아니라 다시 시작하기 위한 메모)
  memo?: string;
  // 생일 "MM-DD" (연도는 받지 않음)
  birthday?: string;
  // 얼려둔 관계: 사용자가 잠시 쉬어 두기로 한 친구
  frozen: boolean;
  // 05 연락 D03 프로필 카드. 연락처에 없는 친구(알림으로만 잡힌 친구)는 없음 → "전화번호가 없어요"
  // TODO(06 친구): 기기 연락처(ContactsService)와 연결. 지금은 mock 데이터에만 있음
  phone?: string;
}

// account: 메신저별 계정 (알림의 발신자 이름으로 구분)
// 같은 사람의 앱별 계정은 personId로 묶음 (합치기 = personId 바꾸기, 분리 = 새 person)
export interface Account {
  id: string;
  personId: string | null; // 아직 친구와 연결 안 된 발신자는 null
  app: MessengerApp;
  senderName: string;
}

export type ConversationKind = "direct" | "group";

// 관계 (05 연락 D01 관계 필터: 친구/가족/직장/기타)
export type ContactRelation = "friend" | "family" | "work" | "etc";

// conversation: 1:1 또는 단톡방
export interface Conversation {
  id: string;
  app: MessengerApp;
  kind: ConversationKind;
  title: string; // 1:1이면 상대 이름, 단톡이면 방 이름
  personId: string | null;
  lastMessageAt: string; // ISO
  // TODO(06 친구): 친구 정보(person)의 관계·별/하트로 교체. 지금은 mock 데이터에만 있고
  // 기기 알림 대화는 비어 있음 (관계 필터 "전체"에서만 보임)
  relation?: ContactRelation;
  // 친구 탭에서 별/하트를 켠 친구 (꼭 챙길 연락 기준)
  favorite?: boolean;
  // 05 연락 D03 관계 탭 "관계 설명" (TODO(06 친구): 친구 메모와 합치기)
  relationNote?: string;
}

// message: 알림으로 받은 메시지 (원문은 기기에만)
export interface Message {
  id: string;
  conversationId: string;
  accountId: string | null; // null = 나
  senderName: string;
  text: string;
  receivedAt: string;
  // 알림에 앞부분만 보여 잘린 메시지 (붙여넣기 요약으로 보완)
  truncated: boolean;
}

export type AnalysisTag =
  | "question" // 나에게 묻는 말 (입장 선택 필요)
  | "occasion" // 경조사
  | "deadline" // 마감·약속 임박
  | "greeting" // 안부·축하 (말투 선택)
  | "info"; // 정보 전달 (요약만)

export type AnalysisStatus = "pending" | "done" | "failed";

// analysis: 기기 안 모델 + (가린 내용) 외부 AI 분석 결과
export interface Analysis {
  conversationId: string;
  status: AnalysisStatus;
  summary?: string;
  needsReply: boolean;
  mentionsMe: boolean;
  tags: AnalysisTag[];
  priority: "high" | "normal" | "low";
  // 꼭 챙길 연락 카드에 보여 줄 이유 (재촉하지 않는 문장)
  highlight?: string;
  // 단톡: 나를 언급하거나 질문한 메시지 id
  highlightedMessageIds: string[];
}

// event: 메시지에서 뽑은 일정 (캘린더와 연결 예정)
export interface ContactEvent {
  id: string;
  conversationId: string;
  kind: "occasion" | "appointment" | "deadline";
  title: string;
  date: string; // ISO
  place?: string;
}

export type ReplyTone = "short" | "warm" | "polite";
export type ReplyStance = "accept" | "decline" | "hold";

// reply_candidate: 답장 후보 (자동 전송 없음, 사용자가 고르고 다듬음)
export interface ReplyCandidate {
  id: string;
  conversationId: string;
  tone: ReplyTone;
  stance?: ReplyStance;
  text: string;
}

// deferred_reply: 나중에 답하기
export interface DeferredReply {
  id: string;
  conversationId: string;
  remindAt: string | null; // null = 날짜 없이 보관
  topic: string; // 무엇에 대한 답장인지 짧게
  createdAt: string;
}

// 목록·홈 카드에 쓰는 묶음
export interface ConversationSummary {
  conversation: Conversation;
  lastMessage: Message;
  analysis: Analysis;
  deferred?: DeferredReply;
  replied: boolean;
}

// 05 연락 D04 긴 메시지 보완: 알림에서 잘린 메시지 하나
export interface TruncatedItem {
  conversation: Conversation;
  message: Message;
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[];
  events: ContactEvent[];
}
