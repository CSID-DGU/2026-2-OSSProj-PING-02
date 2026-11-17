import {
  findText,
  press,
  renderApp,
  type,
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

test("회원가입 아이디는 규칙(임시)과 중복을 확인한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "회원가입");

  // 규칙에 맞지 않으면 서버에 묻지 않고 안내
  await type(root, "아이디", "Ab");
  await press(root, "중복 확인");
  expect(
    findText(root, "아이디는 영문 소문자와 숫자 4~20자로 입력해주세요.").length
  ).toBe(1);

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

test("비밀번호 찾기는 아이디와 이메일이 맞을 때만 임시 비밀번호를 보낸다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "비밀번호 찾기");

  await type(root, "아이디", "malssiat");
  await type(root, "이메일", "other@example.com");
  await press(root, "임시 비밀번호 받기");
  await waitForText(
    root,
    "아이디와 이메일이 맞는 계정을 찾지 못했어요. 다시 확인해 주세요."
  );

  await type(root, "이메일", "demo@malssiat.app");
  await press(root, "임시 비밀번호 받기");
  await waitForText(root, "이메일 전송을 완료했어요");
});

test("아이디 찾기에 정보를 입력하면 결과 다이얼로그를 띄운다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "아이디 찾기");

  await type(root, "이메일", "hello@");
  await press(root, "아이디 찾기");
  expect(findText(root, "이름을 입력해주세요.").length).toBe(1);
  expect(findText(root, "이메일 형식을 확인해주세요.").length).toBe(1);

  await type(root, "이름", "김말씨");
  await type(root, "이메일", "hello@example.com");
  await press(root, "아이디 찾기");

  expect(findText(root, "아이디를 찾았어요").length).toBe(1);
  expect(findText(root, "mals****").length).toBe(1);
});
