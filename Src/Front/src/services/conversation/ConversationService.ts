import type {
  Analysis,
  ContactEvent,
  ConversationDetail,
  ConversationSummary,
  DeferredReply,
  MessengerApp,
  ReplyCandidate,
  ReplyStance,
  ReplyTone,
} from "./types";

// 연락·요약·답장 후보 (나중에 Kotlin 네이티브 모듈의 로컬 DB + 분석 파이프라인으로 교체)
// - 원문은 기기 안, 기기 안 규칙 마스킹(utils/masking)으로 이름·전화번호를 가린 뒤 중간 서버를 거쳐 외부 AI로
// - 자동 전송은 없음: 보내기는 MessengerService.sendReply를 사용자가 확인한 뒤에만
export interface ConversationService {
  list(): Promise<ConversationSummary[]>;
  // 새 메시지가 들어와 목록이 바뀌었을 수 있을 때 부름 (#71). 구독을 끊는 함수를 돌려줌
  onChange(listener: () => void): () => void;
  get(conversationId: string): Promise<ConversationDetail>;
  // 분석이 끝나지 않은(pending) 대화를 분석
  analyze(conversationId: string): Promise<Analysis>;
  getReplyCandidates(
    conversationId: string,
    options: { tone: ReplyTone; stance?: ReplyStance }
  ): Promise<ReplyCandidate[]>;
  // 잘린 메시지: 메신저에서 복사해 붙여 넣은 전체 내용을 기기 안에서 요약
  summarizePasted(conversationId: string, text: string): Promise<string>;
  // 답장 없이 확인만 (단톡·정보)
  markChecked(conversationId: string): Promise<void>;
  markReplied(conversationId: string): Promise<void>;
  deferReply(
    conversationId: string,
    remindAt: string | null
  ): Promise<DeferredReply>;
  cancelDeferred(conversationId: string): Promise<void>;
  // 홈 "오늘의 작은 행동"
  getSmallAction(): Promise<{ conversationId: string | null; text: string }>;
  // 메시지에서 뽑은 일정 전체 (홈 "다가오는 일정"). TODO(캘린더): 캘린더 서비스가 생기면 옮김
  listEvents(): Promise<ContactEvent[]>;
}

// 메신저 연결. 복사·앱 열기는 Kotlin Messenger 모듈(#69, deviceMessengerService), 바로 답장은 아직 없음
export interface MessengerService {
  copyText(text: string): Promise<void>;
  // 메신저 앱 열기. conversationId(기기 대화방)를 주면 가능할 때 그 대화방을 바로 염. 못 열면 appNotInstalled
  openApp(app: MessengerApp, conversationId?: string): Promise<void>;
  // 알림의 바로 답장(RemoteInput)을 쓸 수 있는지 (알림이 남아 있을 때만 가능)
  // TODO(네이티브): NotificationListenerService가 가진 알림의 RemoteInput 여부로 교체
  canReplyDirectly(conversationId: string): Promise<boolean>;
  // 알림의 바로 답장으로 보냄. 화면에서 확인 팝업을 거친 뒤에만 호출
  sendReply(conversationId: string, text: string): Promise<void>;
}

export const CONVERSATION_ERROR_CODE = {
  analysisFailed: "ANALYSIS_FAILED",
  notFound: "CONVERSATION_NOT_FOUND",
  replyUnavailable: "REPLY_UNAVAILABLE", // 알림이 사라져 바로 답장 불가
  appNotInstalled: "APP_NOT_INSTALLED", // 메신저 앱이 없거나 열 수 없음
  copyFailed: "COPY_FAILED",
  // 고른 답장 화면 갈래(입장 먼저 / 말투 바로)와 AI의 결정 판단이 다름 → 화면이 맞는 갈래로 바꿔 감
  replyStepMismatch: "REPLY_STEP_MISMATCH",
  // 친구 화면에서 연락 분석을 끈 사람 → AI로 보내지 않음 (#88)
  analysisOff: "ANALYSIS_OFF",
} as const;
