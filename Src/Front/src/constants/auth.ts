// 인증 화면(01-2 ~ 01-5)에서 쓰는 선택지·검증 기준·안내 문구

export const EMAIL_DOMAINS = [
  "gmail.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "hanmail.net",
  "nate.com",
] as const;

export const GENDER_OPTIONS = [
  { label: "여성", value: "FEMALE" },
  { label: "남성", value: "MALE" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

export const PASSWORD_MIN_LENGTH = 8;

// 아이디 규칙 (로그인·회원가입·비밀번호 찾기에서 같이 씀)
// TODO(Figma 확정 후 수정): 팀에서 아직 규칙 미확정. 임시로 "영문 소문자+숫자, 4~20자"
export const LOGIN_ID_RULE = {
  minLength: 4,
  maxLength: 20,
  pattern: /^[a-z0-9]{4,20}$/,
  guide: "영문 소문자와 숫자 4~20자",
} as const;

export const isValidLoginId = (id: string) => LOGIN_ID_RULE.pattern.test(id);

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DOMAIN_REGEX = /^[^\s@]+\.[^\s@]+$/;

export const AUTH_ERROR = {
  idRequired: "아이디를 입력해주세요.",
  idInvalid: `아이디는 ${LOGIN_ID_RULE.guide}로 입력해주세요.`,
  idCheckRequired: "아이디 중복 확인을 해주세요.",
  idTaken: "이미 쓰고 있는 아이디예요. 다른 아이디를 입력해 주세요.",
  idAvailable: "사용할 수 있는 아이디예요.",
  accountNotFound: "아이디와 이메일이 맞는 계정을 찾지 못했어요. 다시 확인해 주세요.",
  passwordRequired: "비밀번호를 입력해주세요.",
  nameRequired: "이름을 입력해주세요.",
  birthRequired: "생년월일을 모두 선택해주세요.",
  genderRequired: "성별을 선택해주세요.",
  emailRequired: "이메일을 입력해주세요.",
  emailInvalid: "이메일 형식을 확인해주세요.",
  passwordTooShort: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`,
  passwordMismatch: "비밀번호가 일치하지 않아요.",
  termsRequired: "필수 약관에 모두 동의해주세요.",
  // 서버 응답에 따른 안내 (탓하지 않고 다음 행동을 알려 주는 문장)
  loginFailed: "아이디나 비밀번호가 맞지 않아요. 천천히 다시 확인해 주세요.",
  emailTaken: "이미 가입된 이메일이에요. 로그인해 보시겠어요?",
  codeRequired: "메일로 받은 숫자 6자리를 입력해주세요.",
  codeInvalid: "코드가 맞지 않거나 시간이 지났어요. 새 코드를 받아 볼 수 있어요.",
  network: "연결이 잠시 불안정해요. 잠시 뒤에 다시 시도해 주세요.",
  termsLoadFailed: "약관을 불러오지 못했어요.",
} as const;

// 이메일 인증 코드 (Doc/API_목록.md 4.4-1)
export const VERIFICATION_CODE_LENGTH = 6;
export const RESEND_COOLDOWN_SEC = 30;
