// 인증 API 인터페이스 (기준: 백엔드 PR #25의 Doc/API_목록.md)
// - 아이디(username) + 비밀번호로 가입·로그인. 가입하면 바로 토큰을 받음 (이메일 없음)
// - 이메일 관련(인증 코드·아이디 찾기·비밀번호 재설정)은 AUTH_FEATURES.emailEnabled가 true일 때만 씀
//   백엔드 #25에서 빠진 API라, 다시 생기면 경로를 확인할 것 (빠지기 전 경로 기준으로 구현해 둠)
// 구현: mockAuthService(메모리), httpAuthService(실제 API). 교체는 services/index.ts

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
  // 백엔드 이름은 username. 화면에서는 "아이디"라 loginId로 씀 (httpAuthService에서 바꿈)
  loginId: string;
  name: string;
  email?: string;
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
  // 이메일 기능이 켜져 있을 때만 (인증 코드·아이디 찾기·비밀번호 재설정용)
  email?: string;
  password: string;
  termsAgreements: { termsId: string; agreed: boolean }[];
}

// 가입 결과: 바로 로그인(이메일 꺼짐) / 메일 인증 필요(이메일 켜짐)
export type SignupResult =
  | { status: "signedIn"; result: AuthResult }
  | { status: "verificationRequired"; email: string };

// 서버 에러 코드 중 화면에서 분기하는 것 (공통 코드는 common.ts의 COMMON_ERROR_CODE)
export const AUTH_ERROR_CODE = {
  // 아이디 또는 비밀번호 불일치. 5번 연속 틀려 잠긴 계정도 같은 코드 (구분하지 않음)
  invalidCredentials: "INVALID_CREDENTIALS",
  refreshTokenInvalid: "REFRESH_TOKEN_INVALID",
  usernameAlreadyExists: "USERNAME_ALREADY_EXISTS",
  requiredTermsNotAgreed: "REQUIRED_TERMS_NOT_AGREED",
  // 아래는 이메일 기능용 (백엔드 #25에서 제거됨)
  // data.email: 인증 코드를 다시 보낼 이메일
  emailNotVerified: "EMAIL_NOT_VERIFIED",
  emailAlreadyExists: "EMAIL_ALREADY_EXISTS",
  verificationCodeInvalid: "VERIFICATION_CODE_INVALID",
} as const;

export interface AuthService {
  getTerms(): Promise<Terms[]>;
  checkLoginId(loginId: string): Promise<{ available: boolean }>;
  signup(input: SignupInput): Promise<SignupResult>;
  login(loginId: string, password: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;

  // 이메일 기능 (AUTH_FEATURES.emailEnabled)
  verifyEmail(email: string, code: string): Promise<AuthResult>;
  resendVerification(email: string): Promise<void>;
  // 가입한 이메일로 아이디를 보냄 (계정이 있는지는 알려 주지 않음)
  findLoginId(email: string): Promise<void>;
  // 비밀번호 재설정 1단계: 아이디+이메일이 맞으면 메일로 코드를 보냄
  requestPasswordReset(loginId: string, email: string): Promise<void>;
  // 2단계: 코드 확인 후 새 비밀번호로 바꿈
  resetPassword(loginId: string, code: string, newPassword: string): Promise<void>;
}
