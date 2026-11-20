import {
  createMockAuthService,
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "./auth/mockAuthService";
import { createMockContactsService } from "./contacts/ContactsService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "./conversation/mockConversationService";
import { createMockModelService } from "./model/mockModelService";
import { createMockNetworkService } from "./network/NetworkService";
import {
  createMockPermissionService,
  type MockPermissionScenario,
} from "./permission/mockPermissionService";
import { createMemoryStorage } from "./storage/memoryStorage";
import { createMockAiReplyService } from "./ai/AiReplyService";
import { createKeyValueAiReplyStore } from "./ai/AiReplyStore";
import { createDeviceConversationService } from "./conversation/deviceConversationService";
import NotificationStore, {
  isNotificationStoreAvailable,
} from "@native/NotificationStore";

// 서비스 교체 지점
// API·네이티브 모듈이 준비되면 여기서 mock 대신 실제 구현을 넣으면 됨. 화면 코드는 바꿀 필요 없음
//
// 실패 화면을 확인하고 싶을 때:
//   model: createMockModelService({ failFirstAttemptAt: 0.4 })
//   network: createMockNetworkService("cellular")
// 개발 옵션: 권한 거부 → 다시 묻지 않음 → 설정 열기 흐름을 보려면 "deny"
const DEV_PERMISSION_SCENARIO: MockPermissionScenario = "allow";

// 연락 데이터: 기기에 쌓인 알림(Kotlin 알림 수집 모듈의 로컬 DB)을 씀. 네이티브 모듈이 없으면(Jest) mock
// 화면만 작업하면서 예시 대화를 보고 싶으면 false로 바꿈 (커밋 전에 되돌리기)
const USE_DEVICE_CONVERSATIONS = true;

// 기기 저장소 (mock은 메모리). AI 답장 결과도 같은 저장소에 둠
const storage = createMemoryStorage();
const network = createMockNetworkService();
// AI 답장 (백엔드 PR #36 POST /v1/ai/reply). 서버 연결 시 createHttpAiReplyService로 교체
const ai = createMockAiReplyService();
const aiReplies = createKeyValueAiReplyStore(storage);

const conversation =
  USE_DEVICE_CONVERSATIONS && isNotificationStoreAvailable()
    ? createDeviceConversationService({
        source: NotificationStore,
        storage,
        ai,
        aiReplies,
        network,
        // TODO(친구): 사용자 본인·친구 이름·별명을 넘겨 마스킹
      })
    : // 빈 상태·오류 확인: createMockConversationService({ empty: true }) / ({ failList: true })
      createMockConversationService();

export const services = {
  auth: createMockAuthService(),
  permission: createMockPermissionService(DEV_PERMISSION_SCENARIO),
  model: createMockModelService(),
  network,
  contacts: createMockContactsService(),
  conversation,
  messenger: createMockMessengerService(),
  storage,
  ai,
  aiReplies,
};

export type Services = typeof services;

// 개발 빌드에서만 화면에 보여 주는 mock 안내. 실제 구현으로 바꾸면 이 값도 지움
export const DEV_HINTS: { verificationCode?: string; demoAccount?: string } =
  __DEV__
    ? {
        verificationCode: MOCK_VERIFICATION_CODE,
        demoAccount: `${MOCK_DEMO_ACCOUNT.loginId} / ${MOCK_DEMO_ACCOUNT.password}`,
      }
    : {};

export * from "./common";
export * from "./auth/AuthService";
export * from "./permission/PermissionService";
export * from "./model/ModelService";
export * from "./network/NetworkService";
export * from "./contacts/ContactsService";
export * from "./conversation/types";
export * from "./conversation/ConversationService";
export * from "./storage/KeyValueStorage";
export * from "./ai/AiReplyService";
export * from "./ai/AiReplyStore";
export * from "./ai/classifyMessage";
export * from "./ai/requestAiReply";
