import NotificationStore, {
  isNotificationStoreAvailable,
} from "../../native/NotificationStore";
import type { CollectionService } from "../collection/CollectionService";
import { STATE_KEY as CONVERSATION_STATE_KEY } from "../conversation/deviceConversationService";
import { STORAGE_KEYS, type KeyValueStorage } from "../storage/KeyValueStorage";

// 회원 탈퇴 후 기기에 남은 그 사용자의 데이터를 지움 (Doc/API_목록.md 4.9: 앱은 204를 받은 뒤 기기 내 데이터를 직접 지움)
// - 온보딩 진행 상황·선택 값(연동 앱·받을 알림·친구·AI 메모리), 오늘의 도움 수준 (storage, 키에 사용자 id)
// - 연락 상태(답장함·확인함·나중에 답하기) (userStorage: 아직 탈퇴한 사용자로 지정돼 있을 때 불러야 함)
// - 알림으로 모은 대화 원문(알림 DB) + 수집할 앱 목록 (기기에 한 사람만 쓴다고 보고 전부)
// 하나가 실패해도 나머지는 지움 (계정은 이미 삭제됨)
// TODO(H07 저장된 데이터): AI 답장 결과는 대화방별 키라 목록을 알 수 없어 남음. 저장소에 전체 삭제가 생기면 같이 지우기
interface AccountDataStores {
  storage: KeyValueStorage;
  userStorage: KeyValueStorage;
  collection: CollectionService;
}

export const clearLocalAccountData = async (
  { storage, userStorage, collection }: AccountDataStores,
  userId: string
) => {
  const tasks: Promise<unknown>[] = [
    storage.removeItem(`${STORAGE_KEYS.onboarding}.${userId}`),
    storage.removeItem(`${STORAGE_KEYS.homeHelp}.${userId}`),
    userStorage.removeItem(CONVERSATION_STATE_KEY),
    collection.setApps([]),
  ];
  if (isNotificationStoreAvailable()) {
    tasks.push(NotificationStore.clearNotifications());
  }
  await Promise.allSettled(tasks);
};
