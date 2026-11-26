import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { AUTH_ERROR_CODE, services, STORAGE_KEYS } from "../src/services";
import {
  findText,
  press,
  pressByRole,
  renderApp,
  type,
  waitForNoText,
  waitForText,
} from "../test-utils/app";

// 08 설정 (#60): H01 설정 메인 + H08 로그아웃·회원 탈퇴

const ONBOARDING_KEY = `${STORAGE_KEYS.onboarding}.mock-user-demo`;

// 로그인 + 온보딩을 마친 상태로 설정 탭을 엶
const openSettings = async () => {
  const login = await services.auth.login(
    MOCK_DEMO_ACCOUNT.loginId,
    MOCK_DEMO_ACCOUNT.password
  );
  services.tokens.set(login.tokens);
  await services.storage.setItem(
    ONBOARDING_KEY,
    JSON.stringify({
      completed: true,
      lastStep: "OnboardingDone",
      linkedApps: ["KAKAOTALK", "SMS"],
    })
  );
  const root = await renderApp();
  await waitForText(root, "오늘의 도움 수준");
  await pressByRole(root, "tab", "설정");
  await waitForText(root, "내 계정");
  return root;
};

describe("설정 메인", () => {
  test("프로필 카드와 시안의 메뉴 묶음을 보여 준다", async () => {
    const root = await openSettings();

    // 앱을 켤 때 받은 내 정보(GET /users/me)의 이름·아이디·생년월일
    expect(findText(root, MOCK_DEMO_ACCOUNT.name).length).toBeGreaterThan(0);
    expect(findText(root, MOCK_DEMO_ACCOUNT.loginId).length).toBe(1);
    expect(findText(root, "1997.02.12").length).toBe(1);
    const profile = root.find(
      n =>
        typeof n.props.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.includes("연결한 앱")
    );
    expect(profile.props.accessibilityLabel).toContain("카카오톡, 문자 메신저");

    for (const title of [
      "내 계정",
      "연락 설정",
      "AI 맞춤 설정",
      "알림",
      "데이터 및 개인정보",
      "계정 관리",
      "내 정보",
      "연락처 불러오기",
      "확인할 메신저 앱",
      "내 상황과 답장 기준",
      "알림 설정",
      "저장된 데이터",
      "로그아웃",
      "회원 탈퇴",
    ]) {
      expect(findText(root, title).length).toBeGreaterThan(0);
    }
  });

  test("뒤로가기를 누르면 홈 탭으로 간다", async () => {
    const root = await openSettings();
    await pressByRole(root, "button", "뒤로 가기");
    await waitForText(root, "오늘의 도움 수준");
  });
});

describe("로그아웃", () => {
  test("취소하면 그대로 있고, 로그아웃하면 스플래시로 간다", async () => {
    const root = await openSettings();

    await press(root, "로그아웃");
    await waitForText(root, "이 기기에서 로그아웃 할까요?");
    await press(root, "취소");
    await waitForNoText(root, "이 기기에서 로그아웃 할까요?");

    await press(root, "로그아웃");
    await pressByRole(root, "button", "닫기");
    await waitForNoText(root, "이 기기에서 로그아웃 할까요?");

    await press(root, "로그아웃");
    await press(root, "로그아웃");
    await waitForText(root, "시작하기");
    expect(services.tokens.get()).toBeNull();
  });
});

describe("회원 탈퇴", () => {
  test("확인 팝업에서 계속해서 사용하기를 누르면 닫힌다", async () => {
    const root = await openSettings();
    await press(root, "회원 탈퇴");
    await waitForText(root, "계정을 삭제할까요?");
    await press(root, "계속해서 사용하기");
    await waitForNoText(root, "계정을 삭제할까요?");
    expect(findText(root, "회원 탈퇴하기").length).toBe(0);
  });

  test("비밀번호 확인이 다르면 안내만, 같으면 탈퇴하기가 보이고 틀린 비밀번호는 칸에 알려 준다", async () => {
    const root = await openSettings();
    await press(root, "회원 탈퇴");
    await press(root, "탈퇴 진행하기");
    await waitForText(root, "회원 탈퇴하기");
    expect(findText(root, "탈퇴하기").length).toBe(0);

    await type(root, "비밀번호", "wrong1234");
    await type(root, "비밀번호 확인", "wrong12");
    expect(findText(root, "비밀번호가 일치하지 않아요.").length).toBe(1);
    expect(findText(root, "탈퇴하기").length).toBe(0);

    await type(root, "비밀번호 확인", "wrong1234");
    expect(findText(root, "비밀번호가 일치해요.").length).toBe(1);
    await press(root, "탈퇴하기");
    await waitForText(root, "비밀번호가 맞지 않아요. 다시 확인해주세요.");

    // 계정은 그대로
    await expect(
      services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password)
    ).resolves.toBeTruthy();
  });

  // mock 계정을 지우므로 이 파일의 마지막 테스트
  test("탈퇴하면 계정과 기기 데이터를 지우고 스플래시로 간다", async () => {
    const root = await openSettings();
    await press(root, "회원 탈퇴");
    await press(root, "탈퇴 진행하기");
    await type(root, "비밀번호", MOCK_DEMO_ACCOUNT.password);
    await type(root, "비밀번호 확인", MOCK_DEMO_ACCOUNT.password);
    await press(root, "탈퇴하기");
    await waitForText(root, "시작하기");

    expect(services.tokens.get()).toBeNull();
    expect(await services.storage.getItem(ONBOARDING_KEY)).toBeNull();
    await expect(
      services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password)
    ).rejects.toMatchObject({ code: AUTH_ERROR_CODE.invalidCredentials });
  });
});
