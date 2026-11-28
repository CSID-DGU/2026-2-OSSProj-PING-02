import { COMMON_ERROR_CODE, ServiceError } from "../common";
import { AUTH_FEATURES } from "../config";
import type { HttpClient } from "../http/httpClient";
import type {
  AuthResult,
  AuthService,
  AuthTokens,
  AuthUser,
  Terms,
} from "./AuthService";

// 실제 인증 API (백엔드 main의 Doc/API_목록.md 4.2 ~ 4.7)
// 서버의 username ↔ 화면의 loginId만 바꾸고 나머지는 그대로 전달

interface ServerUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  birthdate?: string;
  createdAt?: string;
}

interface ServerAuthResult {
  user: ServerUser;
  tokens: AuthTokens;
}

const toUser = ({
  id,
  username,
  name,
  email,
  birthdate,
  createdAt,
}: ServerUser): AuthUser => ({
  id,
  loginId: username,
  name,
  email,
  birthdate,
  createdAt,
});

const toResult = ({ user, tokens }: ServerAuthResult): AuthResult => ({
  user: toUser(user),
  tokens,
});

export const createHttpAuthService = (http: HttpClient): AuthService => ({
  async getTerms() {
    const { terms } = await http.request<{ terms: Terms[] }>("GET", "/terms");
    return terms;
  },

  checkLoginId(loginId) {
    return http.request<{ available: boolean }>("POST", "/auth/username/check", {
      body: { username: loginId },
    });
  },

  async signup({ loginId, ...rest }) {
    // 백엔드는 정의되지 않은 필드가 오면 400으로 거부 → SignupDto 필드만 보냄
    const res = await http.request<ServerAuthResult | { user: ServerUser }>(
      "POST",
      "/auth/signup",
      { body: { username: loginId, ...rest } }
    );
    if ("tokens" in res && res.tokens) {
      return { status: "signedIn", result: toResult(res) };
    }
    // 가입 이메일 인증 방식(지금 백엔드에는 없음): 응답에 토큰이 없고, 메일 코드를 확인해야 함
    if (!AUTH_FEATURES.emailVerification) {
      throw new ServiceError(COMMON_ERROR_CODE.internal, "가입 응답에 토큰이 없습니다.");
    }
    return { status: "verificationRequired", email: rest.email };
  },

  async login(loginId, password) {
    // TODO(팀 결정): 기기별 세션을 나누려면 deviceId(선택)를 함께 보냄
    const res = await http.request<ServerAuthResult>("POST", "/auth/login", {
      body: { username: loginId, password },
    });
    return toResult(res);
  },

  async logout(refreshToken) {
    await http.request<void>("POST", "/auth/logout", {
      body: { refreshToken },
      auth: true,
    });
  },

  // 앱 시작 때마다 refresh를 먼저 보냄 (Doc/API_목록.md 2. 쓸 때마다 만료일이 30일로 다시 계산됨)
  // 갱신은 httpClient.refreshTokens() 한 곳에서만
  async restoreSession() {
    await http.refreshTokens();
    const me = await http.request<ServerUser>("GET", "/users/me", { auth: true });
    return toUser(me);
  },

  // 회원 탈퇴 (Doc/API_목록.md 4.9). 204
  async deleteAccount(password) {
    await http.request<void>("DELETE", "/users/me", {
      body: { password },
      auth: true,
    });
  },

  // 아이디·비밀번호 찾기 (Doc/API_목록.md 4.5-1 ~ 4.5-3). 모두 204
  async findLoginId(email) {
    await http.request<void>("POST", "/auth/username/find", { body: { email } });
  },

  async requestPasswordReset(loginId, email) {
    await http.request<void>("POST", "/auth/password/forgot", {
      body: { username: loginId, email },
    });
  },

  async resetPassword(loginId, code, newPassword) {
    await http.request<void>("POST", "/auth/password/reset", {
      body: { username: loginId, code, newPassword },
    });
  },

  // 가입 이메일 인증: 백엔드에 없음 (#25 이전 경로 기준, AUTH_FEATURES.emailVerification이 false면 쓰지 않음)
  async verifyEmail(email, code) {
    const res = await http.request<ServerAuthResult>("POST", "/auth/email/verify", {
      body: { email, code },
    });
    return toResult(res);
  },

  async resendVerification(email) {
    await http.request<void>("POST", "/auth/email/resend", { body: { email } });
  },
});
