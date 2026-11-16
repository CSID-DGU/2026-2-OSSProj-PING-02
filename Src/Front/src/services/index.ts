import {
  createMockAuthService,
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "./auth/mockAuthService";
import { createMockContactsService } from "./contacts/ContactsService";
import { createMockModelService } from "./model/mockModelService";
import { createMockNetworkService } from "./network/NetworkService";
import { createMockPermissionService } from "./permission/mockPermissionService";
import { createMemoryStorage } from "./storage/memoryStorage";

// 서비스 교체 지점
// API·네이티브 모듈이 준비되면 여기서 mock 대신 실제 구현을 넣으면 됨. 화면 코드는 바꿀 필요 없음
//
// 실패 화면을 확인하고 싶을 때:
//   model: createMockModelService({ failFirstAttemptAt: 0.4 })
//   network: createMockNetworkService("cellular")
export const services = {
  auth: createMockAuthService(),
  permission: createMockPermissionService(),
  model: createMockModelService(),
  network: createMockNetworkService(),
  contacts: createMockContactsService(),
  storage: createMemoryStorage(),
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
export * from "./storage/KeyValueStorage";
