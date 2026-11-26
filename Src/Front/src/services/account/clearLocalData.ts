import NotificationStore, {
  isNotificationStoreAvailable,
} from "../../native/NotificationStore";
import { STORAGE_KEYS, type KeyValueStorage } from "../storage/KeyValueStorage";

// 회원 탈퇴 후 기기에 남은 그 사용자의 데이터를 지움 (Doc/API_목록.md 4.9: 앱은 204를 받은 뒤 기기 내 데이터를 직접 지움)
// - 온보딩 진행 상황·선택 값(연동 앱·받을 알림·친구·AI 메모리), 오늘의 도움 수준
// - 알림으로 모은 대화 원문(알림 DB) + 수집할 앱 선택 (기기에 한 사람만 쓴다고 보고 전부)
// 하나가 실패해도 나머지는 지움 (계정은 이미 삭제됨)
// TODO(#48 머지 후): 연락 상태·AI 답장 결과가 사용자별 저장소(userStorage)로 옮겨지면 함께 지우기
export const clearLocalAccountData = async (
  storage: KeyValueStorage,
  userId: string
) => {
  const tasks: Promise<unknown>[] = [
    storage.removeItem(`${STORAGE_KEYS.onboarding}.${userId}`),
    storage.removeItem(`${STORAGE_KEYS.homeHelp}.${userId}`),
  ];
  if (isNotificationStoreAvailable()) {
    tasks.push(NotificationStore.clearNotifications());
    tasks.push(NotificationStore.setMonitoredApps([]));
  }
  await Promise.allSettled(tasks);
};
