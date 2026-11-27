// 권한 인터페이스 (나중에 Kotlin 네이티브 모듈로 교체)
//
// | key                  | Android                                              | 요청 방식       | 화면 |
// |----------------------|------------------------------------------------------|-----------------|------|
// | notificationListener | NotificationListenerService 접근 허용                | 설정 화면 이동  | 04   |
// | postNotifications    | POST_NOTIFICATIONS (Android 13+)                     | 시스템 팝업     | 06-1 |
// | contacts             | READ_CONTACTS                                        | 시스템 팝업     | 07   |
// (배터리 최적화 예외는 최종 시안에서 빠져 온보딩에서 묻지 않음, #59)

export type PermissionKey = "notificationListener" | "postNotifications" | "contacts";

// blocked: 시스템 팝업에서 "다시 묻지 않음" 등으로 더 이상 팝업을 띄울 수 없음 → 설정에서만 켤 수 있음
export type PermissionStatus = "granted" | "denied" | "blocked";

export type PermissionStatusMap = Record<PermissionKey, PermissionStatus>;

export interface PermissionRequestResult {
  status: PermissionStatus;
  // true면 설정 화면으로 보냈다는 뜻. 앱으로 돌아왔을 때(AppState active) 다시 check 해야 함
  openedSettings: boolean;
}

export interface PermissionService {
  checkAll(): Promise<PermissionStatusMap>;
  request(key: PermissionKey): Promise<PermissionRequestResult>;
  openSettings(key: PermissionKey): Promise<void>;
}

export const PERMISSION_KEYS: PermissionKey[] = [
  "notificationListener",
  "postNotifications",
  "contacts",
];

// 시스템 팝업으로 요청하는 권한 (나머지는 설정 화면으로 보냄)
export const DIALOG_PERMISSIONS: PermissionKey[] = [
  "postNotifications",
  "contacts",
];
