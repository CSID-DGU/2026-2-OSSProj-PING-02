// 인증 화면(01-2 ~ 01-5)에서 쓰는 선택지·검증 기준·안내 문구
import {
  AUTH_ERROR_CODE,
  COMMON_ERROR_CODE,
  NETWORK_ERROR,
  ServiceError,
  TIMEOUT_ERROR,
} from "@services";
import { LOGIN_ID_RULE, PASSWORD_RULE } from "./authRules";

// 아이디·비밀번호 규칙은 authRules.ts 한 곳에 (mock과 같이 씀)
export * from "./authRules";

export const EMAIL_DOMAINS = [
  "gmail.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "hanmail.net",
  "nate.com",
] as const;

// TODO(Figma 확인): 백엔드는 OTHER(기타)도 받지만 Figma 01-3에는 여성·남성만 있음
export const GENDER_OPTIONS = [
  { label: "여성", value: "FEMALE" },
  { label: "남성", value: "MALE" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DOMAIN_REGEX = /^[^\s@]+\.[^\s@]+$/;

export const AUTH_ERROR = {
  idRequired: "아이디를 입력해주세요.",
  idInvalid: `아이디는 ${LOGIN_ID_RULE.guide}로 입력해주세요.`,
  idCheckRequired: "아이디 중복 확인을 해주세요.",
  idTaken: "이미 쓰고 있는 아이디예요. 다른 아이디를 입력해 주세요.",
  idAvailable: "사용할 수 있는 아이디예요.",
  passwordRequired: "비밀번호를 입력해주세요.",
  passwordInvalid: `비밀번호는 ${PASSWORD_RULE.guide}로 입력해주세요.`,
  nameRequired: "이름을 입력해주세요.",
  birthRequired: "생년월일을 모두 선택해주세요.",
  genderRequired: "성별을 선택해주세요.",
  emailRequired: "이메일을 입력해주세요.",
  emailInvalid: "이메일 형식을 확인해주세요.",
  // 가입 이메일은 인증하지 않아 오타가 나면 찾기가 안 됨 (백엔드 문서 권장 → 안내 문구)
  emailHelper: "아이디·비밀번호를 찾을 때 이 이메일로 보내드려요. 한 번 더 확인해 주세요.",
  passwordMismatch: "비밀번호가 일치하지 않아요.",
  termsRequired: "필수 약관에 모두 동의해주세요.",
  // 서버 응답에 따른 안내 (탓하지 않고 다음 행동을 알려 주는 문장)
  // 401: 5번 연속 틀리면 5분 잠기지만 서버가 구분해 주지 않아 같은 문장으로 (Doc/API_목록.md 4.5)
  loginFailed:
    "아이디나 비밀번호를 다시 확인해 주세요. 계속 안 되면 잠시 쉬었다가 다시 해 봐도 괜찮아요.",
  codeRequired: "메일로 받은 숫자 6자리를 입력해주세요.",
  codeInvalid: "코드가 맞지 않거나 시간이 지났어요. 새 코드를 받아 볼 수 있어요.",
  checkInput: "입력한 내용을 한 번 더 확인해 주세요.",
  network: "연결이 잠시 불안정해요. 잠시 뒤에 다시 시도해 주세요.",
  timeout: "응답이 늦어지고 있어요. 연결을 확인하고 다시 시도해 주세요.",
  server: "잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.",
  termsLoadFailed: "약관을 불러오지 못했어요.",
} as const;

// 429: 서버가 알려 준 시간(Retry-After, 기본 60초)만큼 쉬었다가 다시
export const rateLimitedMessage = (retryAfterSec = 60) =>
  `요청이 잠시 많았어요. ${
    retryAfterSec >= 60 ? `${Math.ceil(retryAfterSec / 60)}분` : `${retryAfterSec}초`
  }쯤 쉬었다가 다시 해 주세요.`;

// 화면별로 따로 처리하지 않는 에러를 부드러운 문장으로 (네트워크·타임아웃·429·400·5xx)
export const getAuthErrorMessage = (error: unknown): string => {
  if (!(error instanceof ServiceError)) return AUTH_ERROR.network;
  switch (error.code) {
    case NETWORK_ERROR:
      return AUTH_ERROR.network;
    case TIMEOUT_ERROR:
      return AUTH_ERROR.timeout;
    case COMMON_ERROR_CODE.rateLimited:
      return rateLimitedMessage(error.retryAfterSec);
    case COMMON_ERROR_CODE.validationFailed:
      return AUTH_ERROR.checkInput;
    case AUTH_ERROR_CODE.invalidEmailFormat:
      return AUTH_ERROR.emailInvalid;
    default:
      return AUTH_ERROR.server;
  }
};

// 400 VALIDATION_FAILED의 details에서 문제가 된 서버 필드 이름들 (예: ["username"])
export const getInvalidFields = (error: unknown): string[] =>
  error instanceof ServiceError &&
  error.code === COMMON_ERROR_CODE.validationFailed
    ? (error.details ?? []).map(d => d.field)
    : [];

// 메일 코드 (비밀번호 재설정, 숨겨 둔 가입 이메일 인증)
// 백엔드: 6자리, 10분 유효, 같은 주소로 60초에 한 통
export const VERIFICATION_CODE_LENGTH = 6;
export const RESEND_COOLDOWN_SEC = 60;

// 아이디·비밀번호 찾기가 꺼져 있을 때(AUTH_FEATURES.accountRecovery) "아이디 찾기 | 비밀번호 찾기" 자리 안내
export const FIND_ACCOUNT_UNAVAILABLE =
  "아이디·비밀번호 찾기는 아직 준비 중이에요.\n천천히 떠올려 보고, 생각나면 언제든 돌아와 주세요.";
