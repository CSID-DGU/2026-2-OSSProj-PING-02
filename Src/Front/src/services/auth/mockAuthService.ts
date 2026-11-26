import { isValidLoginId, isValidPassword, normalizeLoginId } from "@constants/authRules";
import { COMMON_ERROR_CODE, delay, ServiceError } from "../common";
import { AUTH_FEATURES } from "../config";
import {
  AUTH_ERROR_CODE,
  type AuthResult,
  type AuthService,
  type AuthUser,
  type Terms,
} from "./AuthService";
import { createTokenStore, type TokenStore } from "./tokenStore";

// mock 인증: 서버 대신 메모리에 회원을 저장 (백엔드 main의 auth.service.ts 동작을 따름)
// - 가입: 입력값 검사(400) → 필수 약관(422) → 아이디 중복(409). 이메일은 필수지만 인증하지 않고 중복도 허용
//   가입하면 바로 로그인 (emailVerification을 켜면 인증 코드 화면으로, 코드는 MOCK_VERIFICATION_CODE)
// - 로그인: 아이디 없음·비밀번호 틀림·잠김을 구분하지 않고 401. 5번 연속 틀리면 5분 잠김
// - 아이디 찾기·비밀번호 코드 요청: 계정이 있는지와 관계없이 항상 성공
//   비밀번호 재설정 코드는 항상 MOCK_VERIFICATION_CODE, 10분 유효, 5번 틀리면 무효, 한 번만 사용
// - 자동 로그인(restoreSession): 갱신 토큰은 한 번 쓰면 바뀌고, 쓴 토큰·로그아웃한 토큰은 401
//   토큰에 아이디를 넣어 둬서 앱을 다시 켜도 테스트 계정은 복구됨 (새로 가입한 계정은 앱을 끄면 사라져 401)
// - 메일 발송 제한(같은 주소 60초에 한 통)·IP 요청 제한(429)은 흉내 내지 않음
// - 바로 로그인해 볼 수 있는 테스트 계정: MOCK_DEMO_ACCOUNT
export const MOCK_VERIFICATION_CODE = "123456";
export const MOCK_DEMO_ACCOUNT = {
  loginId: "malssiat",
  password: "abcd1234",
  name: "말씨",
  email: "demo@malssiat.app",
  birthdate: "1997-02-12",
};

// 백엔드 시드와 같은 3건 (AI_TRANSFER는 초안·선택 동의)
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
    title: "개인정보 수집 및 이용 동의",
    url: "https://example.com/terms/privacy",
  },
  {
    id: "terms-ai-transfer",
    type: "AI_TRANSFER",
    version: "1.0.0",
    required: false,
    title: "외부 AI 서버 전송·국외 이전 동의",
    url: "https://example.com/terms/ai-transfer",
  },
];

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTHDATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const LOCK_AFTER_FAILURES = 5;
const LOCK_MS = 5 * 60_000;
const CODE_TTL_MS = 10 * 60_000;
const CODE_MAX_ATTEMPTS = 5;

interface MockUser extends AuthUser {
  email: string;
  password: string;
  verified: boolean;
  failedLogins: number;
  lockedUntil: number | null;
}

interface ResetCode {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface MockOptions {
  latency?: number;
  // 잠금·코드 만료 시간을 테스트에서 바꿀 수 있게
  now?: () => number;
  // 자동 로그인 때 갱신 토큰을 읽고 새 토큰을 넣는 곳 (실제 구현의 httpClient와 같은 역할)
  tokens?: TokenStore;
}

const validationError = (field: string, reason = "matches") =>
  new ServiceError(COMMON_ERROR_CODE.validationFailed, "입력값이 올바르지 않습니다.", {
    status: 400,
    details: [{ field, reason }],
  });

const emailFormatError = () =>
  new ServiceError(AUTH_ERROR_CODE.invalidEmailFormat, "이메일 형식이 올바르지 않습니다.", {
    status: 400,
    details: [{ field: "email", reason: "isEmail" }],
  });

const invalidCredentials = () =>
  new ServiceError(
    AUTH_ERROR_CODE.invalidCredentials,
    "아이디 또는 비밀번호가 올바르지 않습니다.",
    { status: 401 }
  );

const codeInvalid = () =>
  new ServiceError(
    AUTH_ERROR_CODE.verificationCodeInvalid,
    "인증 코드가 올바르지 않습니다.",
    { status: 400 }
  );

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const createMockAuthService = ({
  latency = 600,
  now = Date.now,
  tokens = createTokenStore(),
}: MockOptions = {}): AuthService => {
  // key: 아이디
  const users = new Map<string, MockUser>([
    [
      MOCK_DEMO_ACCOUNT.loginId,
      {
        id: "mock-user-demo",
        loginId: MOCK_DEMO_ACCOUNT.loginId,
        name: MOCK_DEMO_ACCOUNT.name,
        email: MOCK_DEMO_ACCOUNT.email,
        birthdate: MOCK_DEMO_ACCOUNT.birthdate,
        password: MOCK_DEMO_ACCOUNT.password,
        verified: true,
        failedLogins: 0,
        lockedUntil: null,
      },
    ],
  ]);
  // key: 아이디. 비밀번호 재설정 코드 (새로 받으면 이전 코드는 무효)
  const resetCodes = new Map<string, ResetCode>();
  // 이미 쓴(갱신·로그아웃) 갱신 토큰
  const revoked = new Set<string>();
  let nextId = 1;
  let issued = 0;

  const toUser = ({ id, loginId, name, email, birthdate }: MockUser): AuthUser => ({
    id,
    loginId,
    name,
    email,
    birthdate,
  });

  // 갱신 토큰: mock-refresh.<아이디>.<시각>.<번호> (아이디에는 '.'이 없음)
  const issueTokens = (user: MockUser) => {
    issued += 1;
    return {
      accessToken: `mock-access.${user.id}.${now()}.${issued}`,
      refreshToken: `mock-refresh.${user.loginId}.${now()}.${issued}`,
      expiresIn: 1800,
    };
  };

  const issue = (user: MockUser): AuthResult => ({
    user: toUser(user),
    tokens: issueTokens(user),
  });

  const refreshTokenInvalid = () =>
    new ServiceError(
      AUTH_ERROR_CODE.refreshTokenInvalid,
      "리프레시 토큰이 유효하지 않습니다.",
      { status: 401 }
    );

  const assertEmail = (email: string) => {
    if (!EMAIL_FORMAT.test(email) || email.length > 255) throw emailFormatError();
  };

  return {
    async getTerms() {
      await delay(latency);
      return MOCK_TERMS;
    },

    async checkLoginId(loginId) {
      await delay(latency / 2);
      const id = normalizeLoginId(loginId);
      if (!isValidLoginId(id)) throw validationError("username");
      return { available: !users.has(id) };
    },

    async signup(input) {
      await delay(latency);
      // 1) 입력값 (400)
      const loginId = normalizeLoginId(input.loginId);
      if (!isValidLoginId(loginId)) throw validationError("username");
      const name = input.name ?? "";
      if (name.length < 1 || name.length > 50) throw validationError("name", "length");
      if (!BIRTHDATE_FORMAT.test(input.birthdate)) throw validationError("birthdate");
      const email = normalizeEmail(input.email ?? "");
      assertEmail(email);
      if (!isValidPassword(input.password)) throw validationError("password");
      // 2) 필수 약관 (422)
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
      // 3) 아이디 중복 (409). 같은 이메일로 여러 계정을 만들 수 있음
      if (users.has(loginId)) {
        throw new ServiceError(
          AUTH_ERROR_CODE.usernameAlreadyExists,
          "이미 사용 중인 아이디입니다.",
          { status: 409, details: [{ field: "username", reason: "duplicate" }] }
        );
      }

      const verify = AUTH_FEATURES.emailVerification;
      const user: MockUser = {
        id: `mock-user-${nextId++}`,
        loginId,
        name,
        email,
        birthdate: input.birthdate,
        password: input.password,
        verified: !verify,
        failedLogins: 0,
        lockedUntil: null,
      };
      users.set(loginId, user);
      return verify
        ? { status: "verificationRequired", email }
        : { status: "signedIn", result: issue(user) };
    },

    async login(loginId, password) {
      await delay(latency);
      const user = users.get(normalizeLoginId(loginId));
      const locked = !!user?.lockedUntil && user.lockedUntil > now();
      if (!user || user.password !== password || locked) {
        // 잠겨 있는 동안의 시도는 횟수에 더하지 않음
        if (user && !locked) {
          user.failedLogins += 1;
          if (user.failedLogins >= LOCK_AFTER_FAILURES) {
            user.lockedUntil = now() + LOCK_MS;
            user.failedLogins = 0;
          }
        }
        throw invalidCredentials();
      }
      user.failedLogins = 0;
      user.lockedUntil = null;
      if (AUTH_FEATURES.emailVerification && !user.verified) {
        throw new ServiceError(
          AUTH_ERROR_CODE.emailNotVerified,
          "이메일 인증이 필요합니다.",
          { status: 403, data: { email: user.email } }
        );
      }
      return issue(user);
    },

    async logout(refreshToken) {
      await delay(200);
      revoked.add(refreshToken);
    },

    async restoreSession() {
      await delay(latency / 2);
      const refreshToken = tokens.get()?.refreshToken;
      const [prefix, loginId] = refreshToken?.split(".") ?? [];
      const user = loginId ? users.get(loginId) : undefined;
      if (!refreshToken || prefix !== "mock-refresh" || !user || revoked.has(refreshToken)) {
        // httpClient와 같이: 세션이 끝났으면 보관소 토큰을 지움
        tokens.set(null);
        throw refreshTokenInvalid();
      }
      revoked.add(refreshToken);
      tokens.set(issueTokens(user));
      return toUser(user);
    },

    async deleteAccount(password) {
      await delay(latency);
      // 지금 세션의 계정 (갱신 토큰에 아이디가 들어 있음)
      const refreshToken = tokens.get()?.refreshToken;
      const [, loginId] = refreshToken?.split(".") ?? [];
      const user = loginId ? users.get(loginId) : undefined;
      if (!refreshToken || !user || revoked.has(refreshToken)) {
        throw new ServiceError(COMMON_ERROR_CODE.unauthorized, "로그인이 필요합니다.", {
          status: 401,
        });
      }
      if (user.password !== password) throw invalidCredentials();
      users.delete(user.loginId);
      revoked.add(refreshToken);
    },

    async findLoginId(email) {
      await delay(latency);
      assertEmail(normalizeEmail(email));
      // 가입 여부와 관계없이 같은 결과 (있으면 메일로 아이디를 보냈다고 봄)
    },

    async requestPasswordReset(loginId, email) {
      await delay(latency);
      const id = normalizeLoginId(loginId);
      if (!isValidLoginId(id)) throw validationError("username");
      const address = normalizeEmail(email);
      assertEmail(address);
      const user = users.get(id);
      if (!user || user.email !== address) return; // 맞지 않아도 같은 응답
      resetCodes.set(id, {
        code: MOCK_VERIFICATION_CODE,
        expiresAt: now() + CODE_TTL_MS,
        attempts: 0,
      });
    },

    async resetPassword(loginId, code, newPassword) {
      await delay(latency);
      const id = normalizeLoginId(loginId);
      if (!isValidLoginId(id)) throw validationError("username");
      if (!/^\d{6}$/.test(code)) throw validationError("code");
      if (!isValidPassword(newPassword)) throw validationError("newPassword");
      const user = users.get(id);
      const saved = resetCodes.get(id);
      if (!user || !saved || saved.expiresAt <= now()) throw codeInvalid();
      if (saved.code !== code) {
        saved.attempts += 1;
        if (saved.attempts >= CODE_MAX_ATTEMPTS) resetCodes.delete(id);
        throw codeInvalid();
      }
      // 한 번만 사용. 비밀번호를 바꾸면 잠금도 풀림 (모든 세션 끊김은 mock에 세션이 없어 생략)
      resetCodes.delete(id);
      user.password = newPassword;
      user.failedLogins = 0;
      user.lockedUntil = null;
    },

    async verifyEmail(email, code) {
      await delay(latency);
      const user = [...users.values()].find(
        u => u.email === normalizeEmail(email) && !u.verified
      );
      if (!user || code !== MOCK_VERIFICATION_CODE) throw codeInvalid();
      user.verified = true;
      return issue(user);
    },

    async resendVerification() {
      await delay(latency);
    },
  };
};
