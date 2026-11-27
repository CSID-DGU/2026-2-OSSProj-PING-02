import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { services, STORAGE_KEYS } from "../src/services";
import {
  findText,
  press,
  pressBack,
  pressByRole,
  renderApp,
  waitForNoText,
  waitForText,
  type Instance,
} from "../test-utils/app";

// 홈·연락 화면 테스트: 로그인 + 온보딩 완료 상태에서 시작
const USER_ID = "mock-user-demo";

const seedSignedIn = async () => {
  const login = await services.auth.login(
    MOCK_DEMO_ACCOUNT.loginId,
    MOCK_DEMO_ACCOUNT.password
  );
  // 저장된 토큰 → 앱을 켜면 자동 로그인
  services.tokens.set(login.tokens);
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
  );
  // 오늘의 도움 수준은 테스트마다 "아직 선택하지 않음"에서 시작 (앞 테스트가 고른 모드가 남지 않게)
  await services.storage.removeItem(`${STORAGE_KEYS.homeHelp}.${USER_ID}`);
};

describe("홈·연락", () => {
  // 저장 토큰은 테스트마다 비워지므로(test-utils) 매번 준비
  beforeEach(() => seedSignedIn());

  test("홈(C01): 챙길 연락 최신순 3개 · 단체방 요약 · 다가오는 일정 · 안부 · 빠른 기능", async () => {
    const root = await renderApp();
    // 오늘 아직 고르지 않음 → 홈 히어로 문구
    await waitForText(root, "오늘은 어떻게 도와드릴까요?");
    await waitForText(root, "오늘 챙길 연락");

    // 최신순: 상담센터(3시간 전) → 서연 선배(5시간 전) → 하늘(5일 전), 요약 표시
    const names = root
      .findAll(
        n =>
          typeof n.type === "string" &&
          ["마음숲 상담센터", "김서연 선배", "하늘", "민지"].includes(
            n.props.children
          )
      )
      .map(n => n.props.children);
    expect(names).toEqual(["마음숲 상담센터", "김서연 선배", "하늘"]);
    expect(findText(root, "하늘이 안부를 물었어요.").length).toBe(1);

    // 단체방: 요약이 있는 가장 최근 방 하나
    expect(
      findText(
        root,
        "2026 봄학기 오픈소스 프로젝트 PING 운영진 방 대화가 정리됐어요"
      ).length
    ).toBe(1);

    // 다가오는 일정: 가장 가까운 일정 (내일 상담 예약)
    await waitForText(root, "다가오는 일정");
    expect(findText(root, "상담 예약").length).toBe(1);

    expect(findText(root, "지금 확인하면 좋은 것").length).toBe(1);
    expect(findText(root, "오랜만에 안부 전하기").length).toBe(1);
    expect(findText(root, "빠른 기능").length).toBe(1);
    // 가리기 모델 안내는 홈에서 뺌
    expect(
      root.findAll(
        n =>
          typeof n.type === "string" &&
          typeof n.props.children === "string" &&
          n.props.children.includes("가리기 모델")
      ).length
    ).toBe(0);
  });

  test("도움 수준: 고르면 모드 화면, 홈 히어로가 바뀌고, 건너뛰면 원래대로", async () => {
    const root = await renderApp();
    await waitForText(root, "오늘은 어떻게 도와드릴까요?");

    // C02: 처음에는 '추천을 수정할래요'가 선택돼 있음
    await pressByRole(root, "button", "상태 바꾸기");
    await waitForText(root, "오늘은 어느 정도 도움이 필요하세요?");
    const radio = (title: string) =>
      root
        .findAll(
          n =>
            typeof n.type === "string" &&
            n.props.accessibilityRole === "radio" &&
            n.props.accessibilityLabel?.startsWith(title)
        )
        .at(-1);
    expect(radio("추천을 수정할래요")?.props.accessibilityState).toMatchObject({
      selected: true,
    });

    // 골라서 보내기 → C03
    await pressByRole(root, "radio", "골라서 보내고 싶어요, 완성 답장 후보 중 선택");
    await press(root, "이대로 시작");
    await waitForText(root, "오늘은 고르기만 해도 충분해요");
    await waitForText(root, "꼭 챙길 연락 3개");
    // 미뤄둔 답장이 없으면 그 줄은 숨김
    expect(findText(root, "미뤄둔 답장").length).toBe(0);

    // 뒤로 → 홈 히어로가 모드 문구로
    await pressBack();
    await waitForText(root, "준비된 답장 중 골라볼래요");

    // 오늘은 미루기: C06이 없어 바로 홈으로
    await pressByRole(root, "button", "상태 바꾸기");
    await waitForText(root, "오늘은 어느 정도 도움이 필요하세요?");
    await pressByRole(root, "radio", "오늘은 미루고 싶어요, 답장을 만들지 않고 다시 볼 시간 선택");
    await press(root, "이대로 시작");
    await waitForText(root, "오늘은 답장을 미뤄둘게요");
    expect(findText(root, "오늘은 어느 정도 도움이 필요하세요?").length).toBe(0);

    // 건너뛰기 → 아직 선택하지 않음
    await pressByRole(root, "button", "상태 바꾸기");
    await waitForText(root, "오늘은 어느 정도 도움이 필요하세요?");
    await press(root, "오늘은 건너뛰기");
    await waitForText(root, "오늘은 어떻게 도와드릴까요?");
  });

  test("모드 화면의 버튼은 고른 줄에 따라 연락 탭·친구 탭으로 간다", async () => {
    const root = await renderApp();
    await waitForText(root, "오늘은 어떻게 도와드릴까요?");
    await pressByRole(root, "button", "상태 바꾸기");
    await waitForText(root, "오늘은 어느 정도 도움이 필요하세요?");
    await press(root, "이대로 시작");
    // 기본 선택(추천 수정) → C04
    await waitForText(root, "한 줄 뼈대부터 시작해요");
    await waitForText(root, "꼭 챙길 연락 3개");
    await press(root, "추천 답장 수정하기");
    expect(selectedTab(root)).toEqual(["연락"]);
  });

  test("탭: 글자 탭으로 이동하고 선택 상태를 알린다", async () => {
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    await pressByRole(root, "tab", "설정");
    await waitForText(root, "설정 화면을 준비하고 있어요");
    const settings = root
      .findAll(
        n =>
          typeof n.type === "string" &&
          n.props.accessibilityRole === "tab" &&
          n.props.accessibilityLabel === "설정"
      )
      .at(-1);
    expect(settings?.props.accessibilityState).toMatchObject({ selected: true });
  });

  // 탭 안 스택 (#44): 상세 화면에서도 탭바가 보이고 🔔가 있음
  // 하단 탭바만 봄 (연락 목록의 밑줄 탭도 role이 tab)
  const BOTTOM_TABS = ["홈", "연락", "친구", "캘린더", "설정"];
  const selectedTab = (root: Instance) =>
    root
      .findAll(
        n =>
          typeof n.type === "string" &&
          n.props.accessibilityRole === "tab" &&
          n.props.accessibilityState?.selected &&
          BOTTOM_TABS.includes(n.props.accessibilityLabel)
      )
      .map(n => n.props.accessibilityLabel);

  test("연락 상세에서도 탭바가 보이고, 탭 다시 누르기·뒤로가기로 돌아온다", async () => {
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    await pressByRole(root, "tab", "연락");
    await waitForText(root, "인식에 실패한 장문 메시지가 있어요");
    await waitForText(root, "민지");
    await pressByRole(root, "button", "민지");
    await waitForText(root, "최근 연락");
    expect(selectedTab(root)).toEqual(["연락"]);

    // 앱바 🔔 → 알림 센터(자리만), 뒤로가기로 상세에 돌아옴
    await pressByRole(root, "button", "알림");
    await waitForText(root, "알림 센터를 준비하고 있어요");
    expect(selectedTab(root)).toEqual(["연락"]);
    await pressBack();
    await waitForNoText(root, "알림 센터를 준비하고 있어요");
    expect(findText(root, "최근 연락").length).toBe(1);

    // 선택된 탭을 다시 누르면 그 탭 첫 화면(목록)으로
    await pressByRole(root, "tab", "연락");
    await waitForNoText(root, "최근 연락");
    expect(selectedTab(root)).toEqual(["연락"]);

    // 홈이 아닌 탭에서 뒤로가기 → 홈 탭
    await pressBack();
    expect(selectedTab(root)).toEqual(["홈"]);
  });

  test("홈에서 연 연락 상세는 홈 탭 안에 쌓이고, 뒤로가기로 홈에 돌아온다", async () => {
    const root = await renderApp();
    await waitForText(root, "하늘이 안부를 물었어요.");
    await pressByRole(root, "button", "하늘, 하늘이 안부를 물었어요.");
    await waitForText(root, "최근 연락");
    expect(selectedTab(root)).toEqual(["홈"]);
    await pressBack();
    await waitForNoText(root, "최근 연락");
    expect(selectedTab(root)).toEqual(["홈"]);
    expect(findText(root, "오늘 챙길 연락").length).toBe(1);
  });
});
