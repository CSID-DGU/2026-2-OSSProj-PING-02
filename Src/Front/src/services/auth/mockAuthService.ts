import { isValidLoginId, isValidPassword } from "@constants/authRules";
import { COMMON_ERROR_CODE, delay, ServiceError } from "../common";
import { AUTH_FEATURES } from "../config";
import {
  AUTH_ERROR_CODE,
  type AuthResult,
  type AuthService,
  type AuthUser,
  type Terms,
} from "./AuthService";

// mock 인증: 서버 대신 메모리에 회원을 저장 (백엔드 #25 동작을 따름)
// - 이메일 꺼짐(기본): 가입하면 바로 로그인
// - 이메일 켜짐: 가입 → 인증 코드 확인 → 로그인. 인증 코드는 항상 MOCK_VERIFICATION_CODE
//   인증 전 계정은 같은 아이디·이메일로 다시 가입하면 덮어씀
//   (백엔드는 만든 지 60초가 지난 미인증 계정만 덮어씀. mock은 시간 조건 없이 바로)
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

const validationError = (field: string) =>
  new ServiceError(COMMON_ERROR_CODE.validationFailed, "입력값이 올바르지 않습니다.", {
    status: 400,
    details: [{ field, reason: "matches" }],
  });

const codeInvalid = () =>
  new ServiceError(
    AUTH_ERROR_CODE.verificationCodeInvalid,
    "인증 코드가 올바르지 않습니다.",
    { status: 400 }
  );

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
  let nextId = 1;

  const findByEmail = (email: string) =>
    [...users.values()].find(u => u.email === email.toLowerCase());

  // 이메일 기능이 켜져 있을 때 인증 전 계정은 다시 가입하면 덮어쓸 수 있음
  const isReplaceable = (user?: MockUser) =>
    !!user && AUTH_FEATURES.emailEnabled && !user.verified;

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
      if (!isValidLoginId(loginId)) throw validationError("username");
      const user = users.get(loginId);
      return { available: !user || isReplaceable(user) };
    },

    async signup(input) {
      await delay(LATENCY);
      const emailEnabled = AUTH_FEATURES.emailEnabled;
      if (!isValidLoginId(input.loginId)) throw validationError("username");
      if (!isValidPassword(input.password)) throw validationError("password");

      const sameId = users.get(input.loginId);
      if (sameId && !isReplaceable(sameId)) {
        throw new ServiceError(
          AUTH_ERROR_CODE.usernameAlreadyExists,
          "이미 사용 중인 아이디입니다.",
          { status: 409 }
        );
      }
      const email = emailEnabled ? input.email?.toLowerCase() : undefined;
      if (emailEnabled && !email) throw validationError("email");
      const sameEmail = email ? findByEmail(email) : undefined;
      if (sameEmail && !isReplaceable(sameEmail)) {
        throw new ServiceError(
          AUTH_ERROR_CODE.emailAlreadyExists,
          "이미 가입된 이메일입니다.",
          { status: 409 }
        );
      }
      const agreed = new Set(
        input.termsAgreements.filter(t => t.agreed).map(t => t.termsId)
      );
      if (MOCK_TERMS.some(t => t.required && !agreed.has(t.id))) {
        throw new ServiceError(
          AUTH_ERROR_CODE.requiredTermsNotAgreed,
          "필수 약관에 동의해야 합니다.",
          { status: 422 }
        );
      }

      // 인증 전 계정을 덮어씀 (같은 아이디·같은 이메일 모두)
      if (sameId) users.delete(sameId.loginId);
      if (sameEmail) users.delete(sameEmail.loginId);

      const user: MockUser = {
        id: `mock-user-${nextId++}`,
        loginId: input.loginId,
        name: input.name,
        email,
        password: input.password,
        verified: !emailEnabled,
      };
      users.set(user.loginId, user);
      return emailEnabled && email
        ? { status: "verificationRequired", email }
        : { status: "signedIn", result: issue(user) };
    },

    async login(loginId, password) {
      await delay(LATENCY);
      const user = users.get(loginId);
      if (!user || user.password !== password) {
        throw new ServiceError(
          AUTH_ERROR_CODE.invalidCredentials,
          "아이디 또는 비밀번호가 올바르지 않습니다.",
          { status: 401 }
        );
      }
      if (!user.verified && AUTH_FEATURES.emailEnabled && user.email) {
        throw new ServiceError(
          AUTH_ERROR_CODE.emailNotVerified,
          "이메일 인증이 필요합니다.",
          { status: 403, data: { email: user.email } }
        );
      }
      return issue(user);
    },

    async logout() {
      await delay(200);
    },

    async verifyEmail(email, code) {
      await delay(LATENCY);
      const user = findByEmail(email);
      if (!user || user.verified || code !== MOCK_VERIFICATION_CODE) {
        throw codeInvalid();
      }
      user.verified = true;
      return issue(user);
    },

    async resendVerification() {
      await delay(LATENCY);
    },

    // 계정이 있는지 알려 주지 않으려고 항상 성공 (있으면 메일로 보냄)
    async findLoginId() {
      await delay(LATENCY);
    },

    async requestPasswordReset() {
      await delay(LATENCY);
    },

    async resetPassword(loginId, code, newPassword) {
      await delay(LATENCY);
      if (!isValidPassword(newPassword)) throw validationError("newPassword");
      const user = users.get(loginId);
      if (!user || code !== MOCK_VERIFICATION_CODE) throw codeInvalid();
      user.password = newPassword;
    },
  };
};
