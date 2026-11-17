import { AUTH_FEATURES } from "../config";
import type { HttpClient } from "../http/httpClient";
import type {
  AuthResult,
  AuthService,
  AuthTokens,
  AuthUser,
  Terms,
} from "./AuthService";

// 실제 인증 API (Doc/API_목록.md 4.2 ~ 4.7)
// 서버의 username ↔ 화면의 loginId만 바꾸고 나머지는 그대로 전달

interface ServerUser {
  id: string;
  username: string;
  name: string;
  email?: string;
}

interface ServerAuthResult {
  user: ServerUser;
  tokens: AuthTokens;
}

const toUser = ({ id, username, name, email }: ServerUser): AuthUser => ({
  id,
  loginId: username,
  name,
  email,
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

  async signup({ loginId, email, ...rest }) {
    const emailEnabled = AUTH_FEATURES.emailEnabled;
    // 백엔드는 정의되지 않은 필드(email)가 오면 400으로 거부 → 이메일 기능이 꺼져 있으면 보내지 않음
    const body = {
      username: loginId,
      ...rest,
      ...(emailEnabled && email ? { email } : {}),
    };
    const res = await http.request<ServerAuthResult | { user: ServerUser }>(
      "POST",
      "/auth/signup",
      { body }
    );
    if ("tokens" in res && res.tokens) {
      return { status: "signedIn", result: toResult(res) };
    }
    // 이메일 인증 방식: 가입 응답에 토큰이 없고, 메일로 받은 코드를 확인해야 함
    return { status: "verificationRequired", email: email ?? "" };
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

  // 아래는 이메일 기능 (백엔드 #25에서 제거됨. 제거 전 경로 기준)
  async verifyEmail(email, code) {
    const res = await http.request<ServerAuthResult>("POST", "/auth/email/verify", {
      body: { email, code },
    });
    return toResult(res);
  },

  async resendVerification(email) {
    await http.request<void>("POST", "/auth/email/resend", { body: { email } });
  },

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
});
