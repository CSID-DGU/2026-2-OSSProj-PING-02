// 아이디·비밀번호 규칙 (화면·mock이 같이 씀. 규칙은 여기 한 곳에서만 바꿈)
// 기준: 백엔드 Src/Back/src/modules/auth/dto/auth.dto.ts (PR #25)
//   USERNAME_RULE = /^[a-z][a-z0-9_]{3,19}$/, 비밀번호 8~72자 + 영문·숫자 포함
// 백엔드도 "확정 전"이라 표시해 둔 규칙 → 바뀌면 여기만 고침

export const LOGIN_ID_RULE = {
  minLength: 4,
  maxLength: 20,
  pattern: /^[a-z][a-z0-9_]{3,19}$/,
  guide: "영문 소문자로 시작하는 4~20자(영문 소문자·숫자·밑줄)",
} as const;

export const PASSWORD_RULE = {
  minLength: 8,
  maxLength: 72, // bcrypt 입력 한계
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  guide: "영문과 숫자를 섞어 8자 이상",
} as const;

// 서버가 아이디를 소문자·앞뒤 공백 제거로 맞추므로 화면에서도 같게 맞춰서 보냄
export const normalizeLoginId = (id: string) => id.trim().toLowerCase();

export const isValidLoginId = (id: string) =>
  LOGIN_ID_RULE.pattern.test(normalizeLoginId(id));

export const isValidPassword = (password: string) =>
  password.length >= PASSWORD_RULE.minLength &&
  password.length <= PASSWORD_RULE.maxLength &&
  PASSWORD_RULE.pattern.test(password);
