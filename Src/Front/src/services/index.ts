import {
  createMockAuthService,
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "./auth/mockAuthService";
import { createHttpAuthService } from "./auth/httpAuthService";
import { createMemoryTokenStore } from "./auth/tokenStore";
import { API_CONFIG, AUTH_FEATURES } from "./config";
import { createHttpClient } from "./http/httpClient";
import { createMockContactsService } from "./contacts/ContactsService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "./conversation/mockConversationService";
import { createMockFriendService } from "./friend/mockFriendService";
import { createMockModelService } from "./model/mockModelService";
import { createMockNetworkService } from "./network/NetworkService";
import {
  createMockPermissionService,
  type MockPermissionScenario,
} from "./permission/mockPermissionService";
import { createMemoryStorage } from "./storage/memoryStorage";
import { createMockAiReplyService } from "./ai/AiReplyService";
import { createKeyValueAiReplyStore } from "./ai/AiReplyStore";

// 서비스 교체 지점
// API·네이티브 모듈이 준비되면 여기서 mock 대신 실제 구현을 넣으면 됨. 화면 코드는 바꿀 필요 없음
//
// 인증: services/config.ts의 API_CONFIG.mode
//   "mock" → 메모리 mock (기본, 테스트 기준) / "http" → API_CONFIG.baseUrl의 실제 백엔드
//
// 실패 화면을 확인하고 싶을 때:
//   model: createMockModelService({ failFirstAttemptAt: 0.4 })
//   network: createMockNetworkService("cellular")
// 개발 옵션: 권한 거부 → 다시 묻지 않음 → 설정 열기 흐름을 보려면 "deny"
const DEV_PERMISSION_SCENARIO: MockPermissionScenario = "allow";

// 기기 저장소 (mock은 메모리). AI 답장 결과도 같은 저장소에 둠
const storage = createMemoryStorage();

// 로그인 토큰 (메모리). HTTP 클라이언트와 SessionProvider가 같이 씀
const tokens = createMemoryTokenStore();

const createAuthService = () =>
  API_CONFIG.mode === "http"
    ? createHttpAuthService(
        createHttpClient({
          baseUrl: API_CONFIG.baseUrl,
          timeoutMs: API_CONFIG.timeoutMs,
          tokens,
        })
      )
    : createMockAuthService();

export const services = {
  auth: createAuthService(),
  tokens,
  permission: createMockPermissionService(DEV_PERMISSION_SCENARIO),
  model: createMockModelService(),
  network: createMockNetworkService(),
  contacts: createMockContactsService(),
  // 빈 상태·오류 확인: createMockConversationService({ empty: true }) / ({ failList: true })
  conversation: createMockConversationService(),
  messenger: createMockMessengerService(),
  // 빈 상태·오류 확인: createMockFriendService({ empty: true }) / ({ failList: true })
  friends: createMockFriendService(),
  storage,
  // AI 답장 (백엔드 PR #36 POST /v1/ai/reply). 서버 연결 시 createHttpAiReplyService로 교체
  ai: createMockAiReplyService(),
  aiReplies: createKeyValueAiReplyStore(storage),
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
export * from "./model/ModelService";
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
