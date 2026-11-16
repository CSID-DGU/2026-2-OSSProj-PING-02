import { delay } from "../common";
import {
  DIALOG_PERMISSIONS,
  type PermissionKey,
  type PermissionService,
  type PermissionStatusMap,
} from "./PermissionService";

// mock 권한: 화면의 모든 분기를 눌러 볼 수 있게 동작을 고정
// - 설정 화면 권한(알림 접근·배터리): 설정으로 보낸 것처럼 처리하고, 다음 check부터 허용
// - 시스템 팝업 권한(앱 알림·연락처): 첫 요청은 거부, 두 번째는 "다시 묻지 않음"(blocked),
//   설정을 열면 허용
export const createMockPermissionService = (): PermissionService => {
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
