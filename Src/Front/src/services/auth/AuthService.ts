// 인증 API 인터페이스
// - 기존 API(Doc/API_목록.md 4.2 ~ 4.7)는 이메일 로그인 기준
// - 팀 결정으로 아이디를 따로 받는 구조로 변경 → 아이디 관련 API는 백엔드에서 새로 만들 예정 (지금은 mock)
// 실제 연결 시 이 인터페이스를 구현한 httpAuthService를 만들어 services/index.ts에서 교체

export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Terms {
  id: string;
  type: string;
  version: string;
  required: boolean;
  title: string;
  url: string;
}

export interface AuthUser {
  id: string;
  loginId: string;
  name: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface SignupInput {
  loginId: string;
  name: string;
  birthdate: string; // YYYY-MM-DD
  gender: Gender;
  email: string; // 아이디 찾기·비밀번호 재설정·인증 코드용
  password: string;
  termsAgreements: { termsId: string; agreed: boolean }[];
}

export interface SignupResult {
  user: AuthUser;
  verificationRequired: boolean;
}

// TODO(팀 결정): 아이디 찾기 방식 미확정 (이메일 / 전화번호). 화면은 아직 연결하지 않음
export type FindLoginIdInput =
  | { method: "email"; name: string; email: string }
  | { method: "phone"; name: string; phone: string };

export interface FindLoginIdResult {
  maskedLoginId: string; // 예: mals****
}

// 서버 에러 코드 중 화면에서 분기하는 것
export const AUTH_ERROR_CODE = {
  invalidCredentials: "INVALID_CREDENTIALS",
  // data.email: 인증 코드를 다시 보낼 이메일
  emailNotVerified: "EMAIL_NOT_VERIFIED",
  emailAlreadyExists: "EMAIL_ALREADY_EXISTS",
  loginIdAlreadyExists: "LOGIN_ID_ALREADY_EXISTS",
  accountNotFound: "ACCOUNT_NOT_FOUND",
  requiredTermsNotAgreed: "REQUIRED_TERMS_NOT_AGREED",
  verificationCodeInvalid: "VERIFICATION_CODE_INVALID",
} as const;

export interface AuthService {
  getTerms(): Promise<Terms[]>;
  // 아이디 중복 확인 (새 API 예정)
  checkLoginId(loginId: string): Promise<{ available: boolean }>;
  signup(input: SignupInput): Promise<SignupResult>;
  verifyEmail(email: string, code: string): Promise<AuthResult>;
  resendVerification(email: string): Promise<void>;
  login(loginId: string, password: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  // 아이디 찾기 (새 API 예정, 방식 미확정)
  findLoginId(input: FindLoginIdInput): Promise<FindLoginIdResult>;
  // 비밀번호 찾기: 아이디+이메일이 맞으면 임시 비밀번호를 메일로 보냄 (새 API 예정)
  requestPasswordReset(loginId: string, email: string): Promise<void>;
}
