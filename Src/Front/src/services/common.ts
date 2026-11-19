// 서비스 레이어 공통 타입·유틸

// 입력값 오류 상세 (서버 details: [{ field, reason }])
export interface ErrorDetail {
  field: string;
  reason: string;
}

interface ServiceErrorExtra {
  // 화면에서 다음 행동에 필요한 값 (예: 인증 전 계정의 이메일)
  data?: Record<string, string>;
  status?: number;
  details?: ErrorDetail[];
  // 429일 때 다시 시도해도 되는 시간(초). Retry-After 헤더
  retryAfterSec?: number;
}

// 서버 에러 형식({ error: { code, message, details } })을 그대로 옮긴 에러
// 화면은 code로 분기하고, message는 사용자에게 보여 줄 수 있는 문장으로 둠
export class ServiceError extends Error {
  code: string;
  data?: Record<string, string>;
  status?: number;
  details?: ErrorDetail[];
  retryAfterSec?: number;

  constructor(code: string, message: string, extra: ServiceErrorExtra = {}) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.data = extra.data;
    this.status = extra.status;
    this.details = extra.details;
    this.retryAfterSec = extra.retryAfterSec;
  }
}

// 서버에 닿지 못한 경우 (앱에서 만드는 코드)
export const NETWORK_ERROR = "NETWORK_ERROR";
export const TIMEOUT_ERROR = "TIMEOUT_ERROR";

// 서버 공통 에러 코드 (Doc/API_목록.md 5. 에러 코드 목록)
export const COMMON_ERROR_CODE = {
  validationFailed: "VALIDATION_FAILED",
  unauthorized: "UNAUTHORIZED",
  rateLimited: "RATE_LIMITED",
  internal: "INTERNAL_ERROR",
  upstreamUnavailable: "UPSTREAM_UNAVAILABLE",
} as const;

export const getErrorCode = (error: unknown) =>
  error instanceof ServiceError ? error.code : NETWORK_ERROR;

// mock에서 네트워크·네이티브 호출 지연을 흉내 낼 때 사용
export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
