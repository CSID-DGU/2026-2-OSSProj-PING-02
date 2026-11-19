import { AUTH_ERROR } from "../src/constants/auth";
import { MOCK_VERIFICATION_CODE } from "../src/services/auth/mockAuthService";
import {
  findText,
  press,
  renderApp,
  type,
  waitForNoText,
  waitForText,
} from "../test-utils/app";

// 인증 화면 테스트 (온보딩 흐름은 Onboarding.test.tsx)

test("스플래시에서 시작하기를 누르면 계정 시작 화면으로 이동한다", async () => {
  const root = await renderApp();
  expect(findText(root, "말씨앗").length).toBeGreaterThan(0);

  await press(root, "시작하기");

  expect(findText(root, "로그인").length).toBeGreaterThan(0);
  expect(findText(root, "회원가입").length).toBeGreaterThan(0);
});

test("로그인 화면에서 빈 값으로 로그인하면 오류 문구를 보여준다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "로그인");

  expect(findText(root, "다시 만나서 반가워요").length).toBe(1);
  await press(root, "로그인");

  expect(findText(root, "아이디를 입력해주세요.").length).toBe(1);
  expect(findText(root, "비밀번호를 입력해주세요.").length).toBe(1);

  await type(root, "아이디", "malssiat");
  expect(findText(root, "아이디를 입력해주세요.").length).toBe(0);
});

test("회원가입은 필수 항목과 비밀번호 확인을 검사한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "회원가입");

  expect(findText(root, "말씨앗을 함께 시작해요").length).toBe(1);
  // 약관은 서비스에서 받아 오므로 목록이 나타난 뒤에 검사
  await waitForText(root, "[필수] 서비스 이용약관 동의");
  await type(root, "비밀번호", "12345678");
  await type(root, "비밀번호 확인", "12345679");
  await press(root, "회원가입");

  expect(findText(root, "이름을 입력해주세요.").length).toBe(1);
  expect(findText(root, "생년월일을 모두 선택해주세요.").length).toBe(1);
  expect(findText(root, "성별을 선택해주세요.").length).toBe(1);
  expect(findText(root, "이메일을 입력해주세요.").length).toBe(1);
  expect(findText(root, "비밀번호가 일치하지 않아요.").length).toBe(1);
  expect(findText(root, "필수 약관에 모두 동의해주세요.").length).toBe(1);
  expect(findText(root, "아이디를 입력해주세요.").length).toBe(1);
  expect(
    findText(root, "비밀번호는 8자 이상 입력해주세요.").length
  ).toBe(0);
});

test("회원가입 이메일 칸에는 찾기용이라는 안내가 있다 (인증하지 않음)", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "회원가입");
  expect(findText(root, AUTH_ERROR.emailHelper).length).toBe(1);
});

test("회원가입 아이디는 규칙(백엔드 기준)과 중복을 확인한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "회원가입");

  // 규칙에 맞지 않으면 서버에 묻지 않고 안내
  await type(root, "아이디", "1ab");
  await press(root, "중복 확인");
  expect(findText(root, AUTH_ERROR.idInvalid).length).toBe(1);

  // mock 테스트 계정과 같으면 이미 쓰는 아이디
  await type(root, "아이디", "malssiat");
  await press(root, "중복 확인");
  await waitForText(
    root,
    "이미 쓰고 있는 아이디예요. 다른 아이디를 입력해 주세요."
  );

  // 새 아이디는 사용 가능, 아이디를 고치면 다시 확인해야 함
  await type(root, "아이디", "newseed01");
  await press(root, "중복 확인");
  await waitForText(root, "사용할 수 있는 아이디예요.");
  expect(findText(root, "확인 완료").length).toBe(1);
  await type(root, "아이디", "newseed02");
  expect(findText(root, "중복 확인").length).toBe(1);
});

test("비밀번호 찾기: 이메일이 달라도 같은 안내, 코드가 맞을 때만 바뀌고 새 비밀번호로 로그인한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "비밀번호 찾기");

  // 아이디와 이메일이 맞지 않아도 가입 여부를 알려 주지 않음 (코드는 보내지 않음)
  await type(root, "아이디", "malssiat");
  await type(root, "이메일", "other@example.com");
  await press(root, "코드 받기");
  await waitForText(root, "가입된 정보라면 코드를 보냈어요");
  await type(root, "인증 코드", MOCK_VERIFICATION_CODE);
  await type(root, "새 비밀번호", "newseed5678");
  await type(root, "새 비밀번호 확인", "newseed5678");
  await press(root, "새 비밀번호로 바꾸기");
  await waitForText(root, AUTH_ERROR.codeInvalid);

  // 이메일을 고쳐 다시 받으면 코드가 맞음
  await press(root, "아이디·이메일 다시 입력하기");
  await type(root, "이메일", "demo@malssiat.app");
  await press(root, "코드 받기");
  await waitForText(root, "가입된 정보라면 코드를 보냈어요");
  await type(root, "인증 코드", MOCK_VERIFICATION_CODE);
  await type(root, "새 비밀번호", "newseed5678");
  await type(root, "새 비밀번호 확인", "newseed5678");
  await press(root, "새 비밀번호로 바꾸기");
  await waitForText(root, "비밀번호를 바꿨어요");

  // 로그인 화면으로 → 새 비밀번호로 로그인
  await press(root, "로그인");
  await waitForText(root, "다시 만나서 반가워요");
  await type(root, "아이디", "malssiat");
  await type(root, "비밀번호", "newseed5678");
  await press(root, "로그인");
  await waitForNoText(root, "다시 만나서 반가워요");
});

test("아이디 찾기는 이메일만 받고, 가입 여부와 관계없이 메일 확인 안내를 띄운다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "아이디 찾기");

  await type(root, "이메일", "hello@");
  await press(root, "아이디 받기");
  expect(findText(root, "이메일 형식을 확인해주세요.").length).toBe(1);

  await type(root, "이메일", "hello@example.com");
  await press(root, "아이디 받기");
  await waitForText(root, "메일을 확인해 주세요");
  expect(findText(root, "가입된 이메일이라면 아이디를 보냈어요.").length).toBe(1);
});
