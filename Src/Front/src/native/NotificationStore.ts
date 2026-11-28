import { DeviceEventEmitter, NativeModules } from "react-native";

// Kotlin 네이티브 모듈 래퍼
// 구현: android/app/src/main/java/com/malssiat/notification/bridge/NotificationStoreModule.kt

export interface InstalledApp {
  packageName: string;
  appName: string;
}

export type MessageContentType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "share"; // 인스타 릴스·게시물 공유

export interface StoredNotification {
  id: number;
  packageName: string;
  appName: string;
  conversationId: string; // 대화방 ID. 대화방을 묶을 때는 이름 대신 이 값을 씀
  conversationTitle: string; // 대화방 이름 (1:1이면 상대 이름, 모르면 빈 문자열)
  messageId: string | null; // 앱이 준 메시지 고유 ID (카카오톡 chatLogId)
  isMention: boolean; // 나를 멘션한 메시지 (카카오톡 "[나를 멘션]" 표시는 text에서 떼어 냄)
  contentType: MessageContentType;
  // text가 실제 대화가 아닌 안내 문구 ("새로운 메시지가 있습니다.", "사진을 보냈습니다." 등). AI 요약에서 뺄 것
  isPlaceholder: boolean;
  // 친구 매칭용 보낸 사람 ID (문자 "tel:번호", 인스타 "ig:사용자ID", 카카오톡은 null). 이름은 방마다 달라 쓰지 않음
  senderId: string | null;
  sender: string; // 보낸 사람 (일반 알림이면 알림 제목)
  text: string;
  isGroupConversation: boolean;
  messageTime: number; // epoch ms
  savedAt: number; // epoch ms
}

interface NotificationStoreNative {
  isPermissionGranted(): Promise<boolean>;
  openPermissionSettings(): Promise<void>;
  getInstalledApps(): Promise<InstalledApp[]>;
  getMonitoredApps(): Promise<string[]>;
  setMonitoredApps(packageNames: string[]): Promise<void>;
  getNotifications(
    packageName: string | null,
    limit: number
  ): Promise<StoredNotification[]>;
  getConversationMessages(
    packageName: string,
    conversationId: string,
    limit: number
  ): Promise<StoredNotification[]>;
  clearNotifications(packageName: string | null): Promise<number>;
  getRetentionDays(): Promise<number>;
  setRetentionDays(days: number): Promise<number>;
  getRetentionInfo(): Promise<RetentionInfo>;
  startRetentionCycle(startAt: number): Promise<RetentionInfo>;
  deleteAllNotificationsNow(resetCycle: boolean): Promise<number>;
}

/** 수집 원문 보관 상태 (설정 H07 "수집 원문 전체 캐시"). 시각은 ms */
export interface RetentionInfo {
  count: number; // 저장된 원문 개수
  days: number; // 보관 주기(일, 기본 30)
  cycleStartAt: number;
  lastFullDeleteAt: number | null; // 아직 한 번도 전체 삭제를 안 했으면 null
  nextFullDeleteAt: number;
}

const native = NativeModules.NotificationStore as
  | NotificationStoreNative
  | undefined;

/** 네이티브 모듈이 있는지 (Jest·iOS·옛 빌드에는 없음) */
export const isNotificationStoreAvailable = () => native != null;

const getNative = (): NotificationStoreNative => {
  if (!native) {
    throw new Error(
      "NotificationStore 네이티브 모듈이 없습니다. `yarn android`로 앱을 다시 빌드하세요."
    );
  }
  return native;
};

// 자주 쓰는 메신저 (앱 선택 화면에서 위에 보여 줌)
export const MESSENGER_PACKAGES = [
  "com.kakao.talk", // 카카오톡
  "com.instagram.android", // 인스타그램
  "com.samsung.android.messaging", // 삼성 메시지
  "com.google.android.apps.messaging", // Google 메시지
];

/** NotificationStoreModule.EVENT_SAVED와 같은 이름 */
const EVENT_SAVED = "malssiat.notificationsSaved";

const NotificationStore = {
  /**
   * 알림 리스너가 새 메시지를 저장할 때마다 부름 (#71, 내용 없이 신호만). 구독을 끊는 함수를 돌려줌
   * 앱 화면이 살아 있을 때만 옴 (앱이 꺼져 있던 동안 저장된 것은 화면에 들어올 때 다시 읽어서 반영)
   */
  onSaved: (listener: () => void) => {
    const sub = DeviceEventEmitter.addListener(EVENT_SAVED, listener);
    return () => sub.remove();
  },
  /** 설정 → 알림 접근 허용에서 말씨앗이 켜져 있는지 */
  isPermissionGranted: () => getNative().isPermissionGranted(),
  /** 알림 접근 허용 설정 화면 열기 */
  openPermissionSettings: () => getNative().openPermissionSettings(),
  /** 기기에 설치된 (런처에 보이는) 앱 목록 */
  getInstalledApps: () => getNative().getInstalledApps(),
  /** 알림을 저장할 앱 패키지 목록 */
  getMonitoredApps: () => getNative().getMonitoredApps(),
  setMonitoredApps: (packageNames: string[]) =>
    getNative().setMonitoredApps(packageNames),
  /** 저장된 알림 (최신순). packageName을 빼면 전체 앱 */
  getNotifications: (options: { packageName?: string; limit?: number } = {}) =>
    getNative().getNotifications(
      options.packageName ?? null,
      options.limit ?? 100
    ),
  /** 한 대화방의 최근 메시지 (최신순) */
  getConversationMessages: (
    packageName: string,
    conversationId: string,
    limit = 100
  ) => getNative().getConversationMessages(packageName, conversationId, limit),
  /** 저장된 알림 삭제. packageName을 빼면 전체. 지운 개수를 돌려줌 */
  clearNotifications: (packageName?: string) =>
    getNative().clearNotifications(packageName ?? null),
  /**
   * 원문 보관 주기(일, 기본 30). 주기가 끝날 때마다 원문 전체를 지움 (#60, 가입일부터 셈)
   * (새 알림 저장·메시지 조회 때 1시간에 한 번 확인)
   */
  getRetentionDays: () => getNative().getRetentionDays(),
  /** 보관 주기 변경 (1~365일로 맞춤). 주기가 지났으면 바로 지우고 지운 개수를 돌려줌 */
  setRetentionDays: (days: number) => getNative().setRetentionDays(days),
  /** 원문 개수·마지막/다음 전체 삭제 시각 (주기가 지났으면 먼저 지움) */
  getRetentionInfo: () => getNative().getRetentionInfo(),
  /** 첫 주기의 시작을 가입일로 (아직 한 번도 전체 삭제를 안 했을 때만 바뀜) */
  startRetentionCycle: (startAt: number) =>
    getNative().startRetentionCycle(startAt),
  /**
   * 원문 전체를 지금 지움. 기본은 이 시각부터 주기를 다시 셈(H07 "지금 바로 삭제"),
   * resetCycle이면 주기 기록도 처음으로(회원 탈퇴). 지운 개수를 돌려줌
   */
  deleteAllNow: (resetCycle = false) =>
    getNative().deleteAllNotificationsNow(resetCycle),
};

export default NotificationStore;
