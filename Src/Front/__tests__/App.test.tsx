import * as Keychain from "react-native-keychain";
import { AUTH_ERROR } from "../src/constants/auth";
import {
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "../src/services/auth/mockAuthService";
import { services, STORAGE_KEYS } from "../src/services";
import {
  closeApp,
  findText,
  press,
  pressByRole,
  renderApp,
  type,
  waitForNoText,
  waitForText,
} from "../test-utils/app";

// 인증 화면 테스트 (온보딩 흐름은 Onboarding.test.tsx)

const savedTokens = async () => {
  const saved = await Keychain.getGenericPassword({ service: "malssiat.auth.mock" });
  return saved ? JSON.parse(saved.password) : null;
};

describe("자동 로그인", () => {
  test("로그인하면 토큰을 암호화 저장소에 두고, 앱을 다시 켜면 갱신된 토큰으로 이어서 쓴다", async () => {
    let root = await renderApp();
    await press(root, "시작하기");
    await press(root, "로그인");
    await type(root, "아이디", MOCK_DEMO_ACCOUNT.loginId);
    await type(root, "비밀번호", MOCK_DEMO_ACCOUNT.password);
    await press(root, "로그인");
    await waitForText(root, "작은 한마디가,\n다시 이어질 씨앗이 되도록");
    const first = await savedTokens();
    expect(first?.refreshToken).toBeTruthy();

    // 앱을 끄고 다시 켬 → 시작하기 없이 멈춘 단계(온보딩)로
    await closeApp();
    root = await renderApp();
    await waitForText(root, "작은 한마디가,\n다시 이어질 씨앗이 되도록");
    expect(findText(root, "시작하기").length).toBe(0);
    // 시작할 때 refresh → 새 토큰으로 교체 저장
    const second = await savedTokens();
    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  test("로그아웃하면 저장 토큰을 지우고, 다시 켜도 로그인 화면부터", async () => {
    const login = await services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password);
    services.tokens.set(login.tokens);
    await services.storage.setItem(
      `${STORAGE_KEYS.onboarding}.${login.user.id}`,
      JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
    );

    let root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    await pressByRole(root, "tab", "설정");
    await press(root, "로그아웃 (개발용)");
    await waitForText(root, "시작하기");
    // 서버 로그아웃 요청(mock 200ms)이 끝나면 저장소에서도 지워짐
    await new Promise<void>(resolve => setTimeout(() => resolve(), 400));
    expect(await savedTokens()).toBeNull();

    await closeApp();
    root = await renderApp();
    await waitForText(root, "시작하기");
  });

  test("저장된 토큰이 만료·재사용이면 지우고 시작하기를 보여 준다", async () => {
    services.tokens.set({ accessToken: "old", refreshToken: "mock-refresh.malssiat.0.0", expiresIn: 1800 });
    // 이미 쓴 토큰처럼: 한 번 복구해 교체된 뒤 옛 토큰을 다시 넣음
    await services.auth.restoreSession();
    services.tokens.set({ accessToken: "old", refreshToken: "mock-refresh.malssiat.0.0", expiresIn: 1800 });

    const root = await renderApp();
    await waitForText(root, "시작하기");
    expect(await savedTokens()).toBeNull();
  });
});

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
