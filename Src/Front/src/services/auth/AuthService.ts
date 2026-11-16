// 인증 API 인터페이스 (Doc/API_목록.md 4.2 ~ 4.7 기준)
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
  name: string;
  birthdate: string; // YYYY-MM-DD
  gender: Gender;
  email: string;
  password: string;
  termsAgreements: { termsId: string; agreed: boolean }[];
}

export interface SignupResult {
  user: AuthUser;
  verificationRequired: boolean;
}

// 서버 에러 코드 중 화면에서 분기하는 것
export const AUTH_ERROR_CODE = {
  invalidCredentials: "INVALID_CREDENTIALS",
  emailNotVerified: "EMAIL_NOT_VERIFIED",
  emailAlreadyExists: "EMAIL_ALREADY_EXISTS",
  requiredTermsNotAgreed: "REQUIRED_TERMS_NOT_AGREED",
  verificationCodeInvalid: "VERIFICATION_CODE_INVALID",
} as const;

export interface AuthService {
  getTerms(): Promise<Terms[]>;
  signup(input: SignupInput): Promise<SignupResult>;
  verifyEmail(email: string, code: string): Promise<AuthResult>;
  resendVerification(email: string): Promise<void>;
  login(email: string, password: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
}
