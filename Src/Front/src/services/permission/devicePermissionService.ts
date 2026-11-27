import type { PermissionKey, PermissionService, PermissionStatus } from "./PermissionService";

// 기기 권한 (#70: 연락처 실제, #83: 알림 접근 실제. 앱 알림은 fallback(mock) 그대로. 배터리 최적화는 #59에서 뺌)
// 연락처(READ_CONTACTS)는 RN 내장 PermissionsAndroid로 시스템 팝업, 설정은 Linking.openSettings(앱 정보 화면)

/** PermissionsAndroid에서 쓰는 부분만 (테스트에서 가짜로 바꿀 수 있게) */
export interface AndroidPermissionApi {
  check(permission: string): Promise<boolean>;
  request(permission: string): Promise<string>; // "granted" | "denied" | "never_ask_again"
  openSettings(): Promise<void>;
}

/**
 * 알림 접근 허용(NotificationListenerService, #83). 시스템 팝업이 없어서 설정 화면에서 켬
 * (Kotlin NotificationStore 모듈의 isPermissionGranted·openPermissionSettings)
 */
export interface NotificationAccessApi {
  isGranted(): Promise<boolean>;
  openSettings(): Promise<void>;
}

export const READ_CONTACTS = "android.permission.READ_CONTACTS";

const REAL: Partial<Record<PermissionKey, string>> = {
  contacts: READ_CONTACTS,
};

export const createDevicePermissionService = (
  android: AndroidPermissionApi,
  fallback: PermissionService,
  // 있으면 04 알림 접근(notificationListener)도 실제로 확인·설정 열기. 없으면 fallback(mock)
  notificationAccess?: NotificationAccessApi
): PermissionService => {
  // Android는 "다시 묻지 않음" 상태를 check로 알려 주지 않음 (켜짐/꺼짐만).
  // 요청 결과가 never_ask_again이었던 권한은 켜질 때까지 blocked로 기억해, 화면이 설정 안내를 바로 보여 주게 함
  const blocked = new Set<PermissionKey>();

  const statusOf = async (key: PermissionKey): Promise<PermissionStatus> => {
    const granted = await android.check(REAL[key]!);
    if (granted) {
      blocked.delete(key);
      return "granted";
    }
    return blocked.has(key) ? "blocked" : "denied";
  };

  return {
    async checkAll() {
      const base = await fallback.checkAll();
      const real = Object.keys(REAL) as PermissionKey[];
      const statuses = await Promise.all(real.map(statusOf));
      real.forEach((key, i) => {
        base[key] = statuses[i];
      });
      if (notificationAccess) {
        // 설정에서 켜고 끄는 권한이라 "다시 묻지 않음"(blocked)은 없음
        base.notificationListener = (await notificationAccess.isGranted()) ? "granted" : "denied";
      }
      return base;
    },

    async request(key) {
      if (key === "notificationListener" && notificationAccess) {
        if (await notificationAccess.isGranted()) {
          return { status: "granted", openedSettings: false };
        }
        // 설정 화면으로 보냄 → 앱으로 돌아오면 usePermissionStep이 다시 확인
        await notificationAccess.openSettings();
        return { status: "denied", openedSettings: true };
      }
      const permission = REAL[key];
      if (!permission) return fallback.request(key);
      const result = await android.request(permission);
      if (result === "granted") {
        blocked.delete(key);
        return { status: "granted", openedSettings: false };
      }
      if (result === "never_ask_again") {
        blocked.add(key);
        return { status: "blocked", openedSettings: false };
      }
      return { status: "denied", openedSettings: false };
    },

    async openSettings(key) {
      if (key === "notificationListener" && notificationAccess) {
        return notificationAccess.openSettings();
      }
      if (!REAL[key]) return fallback.openSettings(key);
      await android.openSettings();
    },
  };
};
