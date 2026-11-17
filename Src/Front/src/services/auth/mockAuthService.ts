import { delay, ServiceError } from "../common";
import {
  AUTH_ERROR_CODE,
  type AuthResult,
  type AuthService,
  type AuthUser,
  type Terms,
} from "./AuthService";

// mock 인증: 서버 대신 메모리에 회원을 저장 (아이디 기준)
// - 인증 코드는 항상 MOCK_VERIFICATION_CODE
// - 바로 로그인해 볼 수 있는 테스트 계정: MOCK_DEMO_ACCOUNT
export const MOCK_VERIFICATION_CODE = "123456";
export const MOCK_DEMO_ACCOUNT = {
  loginId: "malssiat",
  password: "abcd1234",
  name: "말씨",
  email: "demo@malssiat.app",
};

const MOCK_TERMS: Terms[] = [
  {
    id: "terms-service",
    type: "SERVICE",
    version: "1.0.0",
    required: true,
    title: "서비스 이용약관 동의",
    url: "https://example.com/terms/service",
  },
  {
    id: "terms-privacy",
    type: "PRIVACY",
    version: "1.0.0",
    required: true,
    title: "개인정보 수집·이용 동의",
    url: "https://example.com/terms/privacy",
  },
  {
    id: "terms-marketing",
    type: "MARKETING",
    version: "1.0.0",
    required: false,
    title: "새 기능 소식 받기",
    url: "https://example.com/terms/marketing",
  },
];

interface MockUser extends AuthUser {
  password: string;
  verified: boolean;
}

const LATENCY = 600;

const mask = (loginId: string) =>
  loginId.slice(0, 4) + "*".repeat(Math.max(loginId.length - 4, 4));

export const createMockAuthService = (): AuthService => {
  // key: 아이디
  const users = new Map<string, MockUser>([
    [
      MOCK_DEMO_ACCOUNT.loginId,
      {
        id: "mock-user-demo",
        loginId: MOCK_DEMO_ACCOUNT.loginId,
        name: MOCK_DEMO_ACCOUNT.name,
        email: MOCK_DEMO_ACCOUNT.email,
        password: MOCK_DEMO_ACCOUNT.password,
        verified: true,
      },
    ],
  ]);

  const findByEmail = (email: string) =>
    [...users.values()].find(u => u.email === email.toLowerCase());

  const toUser = ({ id, loginId, name, email }: MockUser): AuthUser => ({
    id,
    loginId,
    name,
    email,
  });

  const issue = (user: MockUser): AuthResult => ({
    user: toUser(user),
    tokens: {
      accessToken: `mock-access-${user.id}-${Date.now()}`,
      refreshToken: `mock-refresh-${user.id}-${Date.now()}`,
      expiresIn: 1800,
    },
  });

  return {
    async getTerms() {
      await delay(LATENCY);
      return MOCK_TERMS;
    },

    async checkLoginId(loginId) {
      await delay(400);
      return { available: !users.has(loginId) };
    },

    async signup(input) {
      await delay(LATENCY);
      const email = input.email.toLowerCase();
      if (users.has(input.loginId)) {
        throw new ServiceError(
          AUTH_ERROR_CODE.loginIdAlreadyExists,
          "이미 사용 중인 아이디입니다."
        );
      }
      if (findByEmail(email)) {
        throw new ServiceError(
          AUTH_ERROR_CODE.emailAlreadyExists,
          "이미 가입된 이메일입니다."
        );
      }
      const agreed = new Set(
        input.termsAgreements.filter(t => t.agreed).map(t => t.termsId)
      );
      if (MOCK_TERMS.some(t => t.required && !agreed.has(t.id))) {
        throw new ServiceError(
          AUTH_ERROR_CODE.requiredTermsNotAgreed,
          "필수 약관에 동의해야 합니다."
        );
      }
      const user: MockUser = {
        id: `mock-user-${users.size + 1}`,
        loginId: input.loginId,
        name: input.name,
        email,
        password: input.password,
        verified: false,
      };
      users.set(user.loginId, user);
      return { user: toUser(user), verificationRequired: true };
    },

    async verifyEmail(email, code) {
      await delay(LATENCY);
      const user = findByEmail(email);
      if (!user || user.verified || code !== MOCK_VERIFICATION_CODE) {
        throw new ServiceError(
          AUTH_ERROR_CODE.verificationCodeInvalid,
          "인증 코드가 올바르지 않습니다."
        );
      }
      user.verified = true;
      return issue(user);
    },

    async resendVerification() {
      await delay(LATENCY);
    },

    async login(loginId, password) {
      await delay(LATENCY);
      const user = users.get(loginId);
      if (!user || user.password !== password) {
        throw new ServiceError(
          AUTH_ERROR_CODE.invalidCredentials,
          "아이디 또는 비밀번호가 올바르지 않습니다."
        );
      }
      if (!user.verified) {
        throw new ServiceError(
          AUTH_ERROR_CODE.emailNotVerified,
          "이메일 인증이 필요합니다.",
          { email: user.email }
        );
      }
      return issue(user);
    },

    async logout() {
      await delay(200);
    },

    async findLoginId(input) {
      await delay(LATENCY);
      // TODO(팀 결정): 전화번호 방식은 회원 정보에 전화번호가 없어 mock에서 항상 못 찾음
      const user =
        input.method === "email" ? findByEmail(input.email) : undefined;
      if (!user || user.name !== input.name) {
        throw new ServiceError(
          AUTH_ERROR_CODE.accountNotFound,
          "일치하는 계정이 없습니다."
        );
      }
      return { maskedLoginId: mask(user.loginId) };
    },

    async requestPasswordReset(loginId, email) {
      await delay(LATENCY);
      const user = users.get(loginId);
      if (!user || user.email !== email.toLowerCase()) {
        throw new ServiceError(
          AUTH_ERROR_CODE.accountNotFound,
          "일치하는 계정이 없습니다."
        );
      }
    },
  };
};
