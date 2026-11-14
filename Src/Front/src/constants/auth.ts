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

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DOMAIN_REGEX = /^[^\s@]+\.[^\s@]+$/;

export const AUTH_ERROR = {
  idRequired: "아이디를 입력해주세요.",
  passwordRequired: "비밀번호를 입력해주세요.",
  nameRequired: "이름을 입력해주세요.",
  birthRequired: "생년월일을 모두 선택해주세요.",
  genderRequired: "성별을 선택해주세요.",
  emailRequired: "이메일을 입력해주세요.",
  emailInvalid: "이메일 형식을 확인해주세요.",
  passwordTooShort: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`,
  passwordMismatch: "비밀번호가 일치하지 않아요.",
  termsRequired: "필수 약관에 모두 동의해주세요.",
} as const;
