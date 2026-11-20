import { NativeModules } from "react-native";

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

// 테스트용 원본 기록 (앱별 알림 형식 확인용)
export interface RawNotificationDump {
  id: number;
  packageName: string;
  appName: string;
  postedAt: number; // epoch ms
  summary: string; // "제목: 본문" 한 줄 요약
  json: string; // 알림 원본 전체
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
  clearNotifications(packageName: string | null): Promise<number>;
  isRawDumpEnabled(): Promise<boolean>;
  setRawDumpEnabled(enabled: boolean): Promise<void>;
  getRawDumps(
    packageName: string | null,
    limit: number
  ): Promise<RawNotificationDump[]>;
  clearRawDumps(): Promise<number>;
  copyToClipboard(text: string): Promise<void>;
}

const native = NativeModules.NotificationStore as
  | NotificationStoreNative
  | undefined;

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

const NotificationStore = {
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
  /** 저장된 알림 삭제. packageName을 빼면 전체. 지운 개수를 돌려줌 */
  clearNotifications: (packageName?: string) =>
    getNative().clearNotifications(packageName ?? null),

  // ───────── 테스트용 원본 수집 ─────────
  /** 켜 두면 선택한 앱의 알림 원본(JSON)을 그대로 기록 */
  isRawDumpEnabled: () => getNative().isRawDumpEnabled(),
  setRawDumpEnabled: (enabled: boolean) =>
    getNative().setRawDumpEnabled(enabled),
  getRawDumps: (options: { packageName?: string; limit?: number } = {}) =>
    getNative().getRawDumps(options.packageName ?? null, options.limit ?? 50),
  clearRawDumps: () => getNative().clearRawDumps(),
  copyToClipboard: (text: string) => getNative().copyToClipboard(text),
};

/**
 * 원본 기록 여러 개를 팀원에게 보내기 좋은 JSON 배열 문자열로.
 * JSON.parse를 거치면 chatLogId 같은 큰 정수의 끝자리가 뭉개지므로 원본 문자열을 그대로 잇는다.
 */
export const toExportJson = (dumps: RawNotificationDump[]) =>
  `[\n${dumps.map((d) => d.json).join(",\n")}\n]`;

export default NotificationStore;
