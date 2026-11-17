import { delay } from "../common";
import {
  DIALOG_PERMISSIONS,
  type PermissionKey,
  type PermissionService,
  type PermissionStatusMap,
} from "./PermissionService";

// mock 권한 시나리오 (services/index.ts에서 고름)
// - "allow": 요청하면 허용 (기본값, 실기기에서 09·10까지 진행해 볼 수 있음)
//   설정 화면 권한(알림 접근·배터리)은 설정에 다녀온 것처럼 처리하고 허용
// - "deny" : 거부 흐름 확인용. 시스템 팝업 권한(앱 알림·연락처)은
//   첫 요청 거부 → 두 번째 "다시 묻지 않음"(blocked) → 설정을 열면 허용
export type MockPermissionScenario = "allow" | "deny";

export const createMockPermissionService = (
  scenario: MockPermissionScenario = "allow"
): PermissionService => {
  // 처음에는 모두 꺼져 있어서 화면마다 요청 버튼을 볼 수 있음
  const status: PermissionStatusMap = {
    notificationListener: "denied",
    postNotifications: "denied",
    batteryOptimization: "denied",
    contacts: "denied",
  };
  const requests: Partial<Record<PermissionKey, number>> = {};

  return {
    async checkAll() {
      await delay(400);
      return { ...status };
    },

    async request(key) {
      await delay(500);
      if (DIALOG_PERMISSIONS.includes(key)) {
        if (scenario === "allow") {
          status[key] = "granted";
          return { status: "granted", openedSettings: false };
        }
        requests[key] = (requests[key] ?? 0) + 1;
        status[key] = requests[key] === 1 ? "denied" : "blocked";
        return { status: status[key], openedSettings: false };
      }
      const before = status[key];
      // 사용자가 설정에서 켜고 돌아온 상황
      status[key] = "granted";
      return { status: before, openedSettings: true };
    },

    async openSettings(key) {
      await delay(300);
      status[key] = "granted";
    },
  };
};
