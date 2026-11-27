import type { PermissionKey, PermissionService, PermissionStatus } from "./PermissionService";

// 기기 권한 (#70: 연락처만 실제, 나머지 알림 접근·앱 알림은 fallback(mock) 그대로. 배터리 최적화는 #59에서 뺌)
// 연락처(READ_CONTACTS)는 RN 내장 PermissionsAndroid로 시스템 팝업, 설정은 Linking.openSettings(앱 정보 화면)

/** PermissionsAndroid에서 쓰는 부분만 (테스트에서 가짜로 바꿀 수 있게) */
export interface AndroidPermissionApi {
  check(permission: string): Promise<boolean>;
  request(permission: string): Promise<string>; // "granted" | "denied" | "never_ask_again"
  openSettings(): Promise<void>;
}

export const READ_CONTACTS = "android.permission.READ_CONTACTS";

const REAL: Partial<Record<PermissionKey, string>> = {
  contacts: READ_CONTACTS,
};

export const createDevicePermissionService = (
  android: AndroidPermissionApi,
  fallback: PermissionService
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
      return base;
    },

    async request(key) {
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
      if (!REAL[key]) return fallback.openSettings(key);
      await android.openSettings();
    },
  };
};
