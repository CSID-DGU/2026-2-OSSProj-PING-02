import {
  createMockAuthService,
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "./auth/mockAuthService";
import { createHttpAuthService } from "./auth/httpAuthService";
import { createTokenStore } from "./auth/tokenStore";
import { API_CONFIG, AUTH_FEATURES } from "./config";
import { createHttpClient } from "./http/httpClient";
import { createMockContactsService } from "./contacts/ContactsService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "./conversation/mockConversationService";
import { createMockFriendService } from "./friend/mockFriendService";
import { createMockNetworkService } from "./network/NetworkService";
import {
  createMockPermissionService,
  type MockPermissionScenario,
} from "./permission/mockPermissionService";
import { createKeychainStorage } from "./storage/keychainStorage";
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
// 인증: services/config.ts의 API_CONFIG.mode (테스트 mock / release http / debug DEV_API_MODE)
//   "mock" → 메모리 mock / "http" → API_CONFIG.baseUrl의 실제 백엔드
//
// 실패 화면을 확인하고 싶을 때:
//   network: createMockNetworkService("none") (오프라인이면 AI 답장을 부르지 않음)
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

// 로그인 토큰 (메모리 + 암호화 저장소, 자동 로그인용). HTTP 클라이언트와 SessionProvider가 같이 씀
// mock과 실서버 토큰이 섞이지 않게 모드별로 따로 저장
const tokens = createTokenStore(
  createKeychainStorage(`malssiat.auth.${API_CONFIG.mode}`)
);

const createAuthService = () =>
  API_CONFIG.mode === "http"
    ? createHttpAuthService(
        createHttpClient({
          baseUrl: API_CONFIG.baseUrl,
          timeoutMs: API_CONFIG.timeoutMs,
          tokens,
        })
      )
    : createMockAuthService({ tokens });

export const services = {
  auth: createAuthService(),
  tokens,
  permission: createMockPermissionService(DEV_PERMISSION_SCENARIO),
  network,
  contacts: createMockContactsService(),
  conversation,
  messenger: createMockMessengerService(),
  // 빈 상태·오류 확인: createMockFriendService({ empty: true }) / ({ failList: true })
  friends: createMockFriendService(),
  storage,
  ai,
  aiReplies,
};

export type Services = typeof services;

// 개발 빌드 + mock일 때만 화면에 보여 주는 안내 (실제 API에서는 보이지 않음)
// verificationCode: 비밀번호 재설정 코드(그리고 숨겨 둔 가입 이메일 인증 코드)
const showMockHints = __DEV__ && API_CONFIG.mode === "mock";
export const DEV_HINTS = {
  get verificationCode() {
    return showMockHints &&
      (AUTH_FEATURES.accountRecovery || AUTH_FEATURES.emailVerification)
      ? MOCK_VERIFICATION_CODE
      : undefined;
  },
  demoAccount: showMockHints
    ? `${MOCK_DEMO_ACCOUNT.loginId} / ${MOCK_DEMO_ACCOUNT.password}`
    : undefined,
};

export * from "./common";
export * from "./config";
export * from "./auth/AuthService";
export * from "./auth/tokenStore";
export * from "./permission/PermissionService";
export * from "./network/NetworkService";
export * from "./contacts/ContactsService";
export * from "./conversation/types";
export * from "./conversation/ConversationService";
export * from "./friend/FriendService";
export * from "./storage/KeyValueStorage";
export * from "./ai/AiReplyService";
export * from "./ai/AiReplyStore";
export * from "./ai/classifyMessage";
export * from "./ai/requestAiReply";
