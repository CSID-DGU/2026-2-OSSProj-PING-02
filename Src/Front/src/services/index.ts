import {
  createMockAuthService,
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "./auth/mockAuthService";
import { createHttpAuthService } from "./auth/httpAuthService";
import { createTokenStore } from "./auth/tokenStore";
import { API_CONFIG, AUTH_FEATURES } from "./config";
import { createHttpClient } from "./http/httpClient";
import { Linking, PermissionsAndroid, type Permission } from "react-native";
import {
  createDeviceContactsService,
  createMockContactsService,
} from "./contacts/ContactsService";
import Contacts, { isContactsAvailable } from "@native/Contacts";
import { createDevicePermissionService } from "./permission/devicePermissionService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "./conversation/mockConversationService";
import { createMockFriendService } from "./friend/mockFriendService";
import { createDeviceFriendService } from "./friend/deviceFriendService";
import type { FriendService } from "./friend/FriendService";
import { createMockNetworkService } from "./network/NetworkService";
import {
  createMockPermissionService,
  type MockPermissionScenario,
} from "./permission/mockPermissionService";
import { createKeychainStorage } from "./storage/keychainStorage";
import { createSecureKeyValueStorage } from "./storage/secureKeyValueStorage";
import { createUserScopedStorage } from "./storage/userScopedStorage";
import {
  createHttpAiReplyService,
  createMockAiReplyService,
} from "./ai/AiReplyService";
import { createKeyValueAiReplyStore } from "./ai/AiReplyStore";
import { createDeviceConversationService } from "./conversation/deviceConversationService";
import { createDeviceMessengerService } from "./conversation/deviceMessengerService";
import { createMaskNameStore } from "./ai/maskNames";
import NotificationStore, {
  isNotificationStoreAvailable,
} from "@native/NotificationStore";
import {
  createDeviceCollectionService,
  createMockCollectionService,
} from "./collection/CollectionService";
import Messenger, { isMessengerAvailable } from "@native/Messenger";

// 서비스 교체 지점
// API·네이티브 모듈이 준비되면 여기서 mock 대신 실제 구현을 넣으면 됨. 화면 코드는 바꿀 필요 없음
//
// 인증·AI 답장: services/config.ts의 API_CONFIG.mode (테스트 mock / release http / debug DEV_API_MODE)
//   "mock" → 메모리 mock / "http" → API_CONFIG.baseUrl의 실제 백엔드
//
// 실패 화면을 확인하고 싶을 때:
//   network: createMockNetworkService("none") (오프라인이면 AI 답장을 부르지 않음)
// 개발 옵션: 권한 거부 → 다시 묻지 않음 → 설정 열기 흐름을 보려면 "deny"
const DEV_PERMISSION_SCENARIO: MockPermissionScenario = "allow";

// 권한: 연락처는 실제(PermissionsAndroid, #70), 알림 접근은 실제(NotificationStore 설정 화면, #83),
// 앱 알림은 아직 mock. 네이티브 모듈이 없으면(Jest) 모두 mock
const mockPermission = createMockPermissionService(DEV_PERMISSION_SCENARIO);
const permission = isContactsAvailable()
  ? createDevicePermissionService(
      {
        check: p => PermissionsAndroid.check(p as Permission),
        request: p => PermissionsAndroid.request(p as Permission),
        openSettings: () => Linking.openSettings(),
      },
      mockPermission,
      isNotificationStoreAvailable()
        ? {
            isGranted: () => NotificationStore.isPermissionGranted(),
            openSettings: () => NotificationStore.openPermissionSettings(),
          }
        : undefined
    )
  : mockPermission;

// 연락 데이터: 기기에 쌓인 알림(Kotlin 알림 수집 모듈의 로컬 DB)을 씀. 네이티브 모듈이 없으면(Jest) mock
// 화면만 작업하면서 예시 대화를 보고 싶으면 false로 바꿈 (커밋 전에 되돌리기)
const USE_DEVICE_CONVERSATIONS = true;
// AI로 보내기 전에 가릴 이름 (사용자 본인. SessionProvider가 로그인·로그아웃 때 바꿈, #69)
const maskNames = createMaskNameStore();

// 로그인 토큰 (메모리 + 암호화 저장소, 자동 로그인용). HTTP 클라이언트와 SessionProvider가 같이 씀
// mock과 실서버 토큰이 섞이지 않게 모드별로 따로 저장
const tokens = createTokenStore(
  createKeychainStorage(`malssiat.auth.${API_CONFIG.mode}`)
);

// 실서버 HTTP 클라이언트. 인증과 AI가 같이 써서 토큰 갱신(POST /auth/refresh)이 한 번만 나가게 함
// (같은 refreshToken으로 두 번 갱신하면 백엔드가 재사용으로 보고 세션을 끊음)
const httpClient =
  API_CONFIG.mode === "http"
    ? createHttpClient({
        baseUrl: API_CONFIG.baseUrl,
        timeoutMs: API_CONFIG.timeoutMs,
        tokens,
      })
    : null;

// 기기 저장소: 암호화 저장소라 앱을 껐다 켜도 남음. mock과 실서버 데이터가 섞이지 않게 모드별로 따로
// - storage: 온보딩 진행 상황 (키에 사용자 id를 직접 붙여 씀, OnboardingProvider)
// - userStorage: 연락 상태·AI 답장 결과 (로그인한 사용자별로 자동으로 나눔, SessionProvider가 사용자 지정)
const storage = createSecureKeyValueStorage(`malssiat.kv.${API_CONFIG.mode}`);
const userStorage = createUserScopedStorage(storage);
const network = createMockNetworkService();
// AI 답장 (POST /v1/ai/reply). API 모드가 http면 실서버, 아니면 mock
// 요약·답장을 만드는 데 시간이 걸려서 시간 제한은 공통(timeoutMs)이 아니라 AI 서비스 기본값(35초)을 씀
const ai = httpClient
  ? createHttpAiReplyService({
      baseUrl: API_CONFIG.baseUrl,
      getAccessToken: async () => tokens.get()?.accessToken ?? null,
      // 갱신 실패(세션 만료)면 null → 401 오류를 그대로 올림. 토큰 정리는 httpClient가 함
      // 그사이 다른 요청이 이미 갱신했으면 다시 갱신하지 않고 그 토큰을 씀 (httpClient.request와 같은 규칙)
      refreshAccessToken: async sentWith => {
        try {
          const next = sentWith
            ? await httpClient.refreshAfterUnauthorized(sentWith)
            : await httpClient.refreshTokens();
          return next.accessToken;
        } catch {
          return null;
        }
      },
    })
  : createMockAiReplyService();
// AI 답장 결과는 사용자별 저장소에 (#48)
const aiReplies = createKeyValueAiReplyStore(userStorage);

const conversation =
  USE_DEVICE_CONVERSATIONS && isNotificationStoreAvailable()
    ? createDeviceConversationService({
        source: NotificationStore,
        storage: userStorage,
        ai,
        aiReplies,
        network,
        // AI로 보내기 전에 가릴 이름: 사용자 본인 + 친구 이름·별명·계정 이름 (대화방·보낸 사람 이름은 서비스가 더함)
        getMaskNames: async () => [
          ...maskNames.get(),
          ...(await friends.getMaskNames().catch(() => [])),
        ],
        // 1:1 대화의 보낸 사람 → 친구 (연락 상세 "친구 정보 보기")
        getPersonLookup: () => friends.getPersonLookup(),
      })
    : // 빈 상태·오류 확인: createMockConversationService({ empty: true }) / ({ failList: true })
      createMockConversationService();

// 친구: 기기 알림의 보낸 사람 + 온보딩 09에서 고른 연락처, 사용자별 기기 저장소 (실기기)
// 네이티브 알림 모듈이 없으면(Jest) 예시 친구 mock
// 빈 상태·오류 확인: createMockFriendService({ empty: true }) / ({ failList: true })
const friends: FriendService =
  USE_DEVICE_CONVERSATIONS && isNotificationStoreAvailable()
    ? createDeviceFriendService({
        storage: userStorage,
        conversation,
        getRetentionDays: () => NotificationStore.getRetentionDays(),
      })
    : createMockFriendService();

const createAuthService = () =>
  httpClient
    ? createHttpAuthService(httpClient)
    : createMockAuthService({ tokens });

export const services = {
  auth: createAuthService(),
  tokens,
  permission,
  network,
  // 기기 연락처 (Kotlin Contacts 모듈, #70). 네이티브 모듈이 없으면(Jest) mock 42명
  contacts: isContactsAvailable()
    ? createDeviceContactsService(Contacts)
    : createMockContactsService(),
  conversation,
  // 알림을 모을 앱 목록 (#83). OnboardingProvider가 연동 앱(05)에 맞추고 로그아웃하면 비움. 네이티브가 없으면(Jest) mock
  collection: isNotificationStoreAvailable()
    ? createDeviceCollectionService(NotificationStore)
    : createMockCollectionService(),
  // 복사·메신저 열기: Kotlin Messenger 모듈 (#69). 네이티브 모듈이 없으면(Jest) mock
  messenger: isMessengerAvailable()
    ? createDeviceMessengerService(Messenger)
    : createMockMessengerService(),
  friends,
  storage,
  userStorage,
  ai,
  aiReplies,
  maskNames,
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
export * from "./collection/CollectionService";
export * from "./friend/FriendService";
export * from "./storage/KeyValueStorage";
export * from "./storage/userScopedStorage";
export * from "./ai/AiReplyService";
export * from "./ai/AiReplyStore";
export * from "./ai/classifyMessage";
export * from "./ai/requestAiReply";
export * from "./ai/maskNames";
