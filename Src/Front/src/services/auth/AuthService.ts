// 인증 API 인터페이스 (기준: 백엔드 main의 Doc/API_목록.md 4.2 ~ 4.7)
// - 아이디(username) + 비밀번호로 가입·로그인. 가입하면 바로 토큰을 받음
// - 이메일은 가입할 때 필수지만 인증하지 않고, 아이디·비밀번호 찾기에만 씀
// - 가입 이메일 인증(verifyEmail·resendVerification)은 백엔드에 없음 → AUTH_FEATURES.emailVerification(false)
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
  birthdate?: string; // YYYY-MM-DD (GET /users/me. 로그인 응답에는 없을 수 있음)
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
  // 인증하지 않음. 아이디·비밀번호 찾기에만 쓰여서 오타가 나면 찾기가 안 됨 (가입 화면에서 안내)
  email: string;
  password: string;
  termsAgreements: { termsId: string; agreed: boolean }[];
}

// 가입 결과: 바로 로그인(지금 백엔드) / 메일 인증 필요(emailVerification이 켜졌을 때만)
export type SignupResult =
  | { status: "signedIn"; result: AuthResult }
  | { status: "verificationRequired"; email: string };

// 서버 에러 코드 중 화면에서 분기하는 것 (공통 코드는 common.ts의 COMMON_ERROR_CODE)
export const AUTH_ERROR_CODE = {
  // 아이디 또는 비밀번호 불일치. 5번 연속 틀려 5분 잠긴 계정도 같은 코드 (구분하지 않음)
  invalidCredentials: "INVALID_CREDENTIALS",
  refreshTokenInvalid: "REFRESH_TOKEN_INVALID",
  usernameAlreadyExists: "USERNAME_ALREADY_EXISTS",
  requiredTermsNotAgreed: "REQUIRED_TERMS_NOT_AGREED",
  invalidEmailFormat: "INVALID_EMAIL_FORMAT",
  // 비밀번호 재설정 코드가 틀림·만료·5번 넘게 틀림·없는 아이디 (구분하지 않음)
  verificationCodeInvalid: "VERIFICATION_CODE_INVALID",
  // 가입 이메일 인증용 (백엔드에 없음, emailVerification이 켜졌을 때만)
  // data.email: 인증 코드를 다시 보낼 이메일
  emailNotVerified: "EMAIL_NOT_VERIFIED",
} as const;

export interface AuthService {
  getTerms(): Promise<Terms[]>;
  checkLoginId(loginId: string): Promise<{ available: boolean }>;
  signup(input: SignupInput): Promise<SignupResult>;
  login(loginId: string, password: string): Promise<AuthResult>;
  // 서버 세션을 끝냄 (그 세션의 액세스 토큰도 바로 무효)
  logout(refreshToken: string): Promise<void>;
  // 자동 로그인: 토큰 보관소(services.tokens)에 불러온 refreshToken으로 갱신(POST /auth/refresh)한 뒤
  // 내 정보(GET /users/me)를 받음. 갱신된 토큰은 보관소에 바로 저장됨
  // 갱신 토큰이 만료·재사용이면 401 REFRESH_TOKEN_INVALID (보관소 토큰도 지워짐)
  restoreSession(): Promise<AuthUser>;
  // 회원 탈퇴 (DELETE /users/me). 서버 데이터는 바로 지워지고 이 토큰도 무효
  // 비밀번호가 틀리면 401 INVALID_CREDENTIALS. 기기 데이터는 부르는 쪽에서 지움
  deleteAccount(password: string): Promise<void>;

  // 아이디·비밀번호 찾기 (AUTH_FEATURES.accountRecovery)
  // 가입한 이메일로 아이디를 보냄. 계정이 있는지는 알려 주지 않음 (항상 성공)
  findLoginId(email: string): Promise<void>;
  // 비밀번호 재설정 1단계: 아이디+이메일이 맞으면 메일로 6자리 코드를 보냄 (항상 성공, 10분 유효)
  requestPasswordReset(loginId: string, email: string): Promise<void>;
  // 2단계: 코드 확인 후 새 비밀번호로 바꿈. 성공하면 이 계정의 모든 기기 세션이 끊김
  resetPassword(loginId: string, code: string, newPassword: string): Promise<void>;

  // 가입 이메일 인증 (AUTH_FEATURES.emailVerification, 백엔드에 없음)
  verifyEmail(email: string, code: string): Promise<AuthResult>;
  resendVerification(email: string): Promise<void>;
}
