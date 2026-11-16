import { delay } from "../common";
import type {
  PermissionKey,
  PermissionService,
  PermissionStatusMap,
} from "./PermissionService";

// mock 권한: 화면의 모든 분기를 눌러 볼 수 있게 동작을 고정
// - notificationListener·batteryOptimization: 설정으로 보낸 것처럼 처리하고, 다음 check부터 허용
// - postNotifications: 첫 요청은 거부, 두 번째는 "다시 묻지 않음"(blocked), 설정을 열면 허용
export const createMockPermissionService = (): PermissionService => {
  const status: PermissionStatusMap = {
    notificationListener: "denied",
    postNotifications: "denied",
    batteryOptimization: "denied",
  };
  let notificationRequests = 0;

  const grantLater = (key: PermissionKey) => {
    // 사용자가 설정에서 켜고 돌아온 상황
    status[key] = "granted";
  };

  return {
    async checkAll() {
      await delay(400);
      return { ...status };
    },

    async request(key) {
      await delay(500);
      if (key === "postNotifications") {
        notificationRequests += 1;
        status.postNotifications =
          notificationRequests === 1 ? "denied" : "blocked";
        return { status: status.postNotifications, openedSettings: false };
      }
      const before = status[key];
      grantLater(key);
      return { status: before, openedSettings: true };
    },

    async openSettings(key) {
      await delay(300);
      grantLater(key);
    },
  };
};
