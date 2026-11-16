// 서비스 레이어 공통 타입·유틸

// 서버 에러 형식({ error: { code, message } })을 그대로 옮긴 에러
// 화면은 code로 분기하고, message는 사용자에게 보여 줄 수 있는 문장으로 둠
export class ServiceError extends Error {
  code: string;
  // 화면에서 다음 행동에 필요한 값 (예: 인증 전 계정의 이메일)
  data?: Record<string, string>;

  constructor(code: string, message: string, data?: Record<string, string>) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.data = data;
  }
}

export const NETWORK_ERROR = "NETWORK_ERROR";

export const getErrorCode = (error: unknown) =>
  error instanceof ServiceError ? error.code : NETWORK_ERROR;

// mock에서 네트워크·네이티브 호출 지연을 흉내 낼 때 사용
export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
