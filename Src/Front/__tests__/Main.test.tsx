import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { createMockModelService } from "../src/services/model/mockModelService";
import { services, STORAGE_KEYS } from "../src/services";
import {
  findText,
  pressByRole,
  renderApp,
  waitForText,
} from "../test-utils/app";

// 홈·연락 화면 테스트: 로그인 + 온보딩 완료 상태에서 시작
// - 가리기 모델은 짧은 다운로드로 미리 설치해 둠 (요약이 보이는 상태)
const USER_ID = "mock-user-demo";

const seedSignedIn = async ({ modelInstalled }: { modelInstalled: boolean }) => {
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
  services.model = createMockModelService({ durationMs: 200 });
  if (modelInstalled) {
    const info = await services.model.getLatest();
    await services.model.startDownload(info, () => {}).done;
  }
};

describe("모델이 준비된 경우", () => {
  // 저장 토큰은 테스트마다 비워지므로(test-utils) 매번 준비
  beforeEach(() => seedSignedIn({ modelInstalled: true }));

  test("홈: 꼭 챙길 연락은 최대 3개, 단톡은 접혀 있다가 펼쳐진다", async () => {
    const root = await renderApp();
    await waitForText(root, "오늘의 연락");
    await waitForText(root, "꼭 챙길 연락");

    // 경조사 → 마감 임박 순서, 재촉하지 않는 이유 문장
    await waitForText(root, "12월 12일 오후 1시 결혼식");
    expect(findText(root, "내일 오전 10시 상담 · 변경은 오늘 6시까지").length).toBe(1);
    const highlights = root.findAll(
      n => typeof n.type === "string" && n.props.children === "경조사 · 카카오톡"
    );
    expect(highlights.length).toBe(1);

    // 단톡: 접힌 상태 → 펼치면 긴 방 이름 카드가 보임
    expect(findText(root, "단톡 2개").length).toBe(1);
    expect(
      findText(root, "2026 봄학기 오픈소스 프로젝트 PING 운영진 방").length
    ).toBe(0);
    await pressByRole(root, "button", "단톡 2개, 나를 언급한 곳 1개");
    expect(
      findText(root, "2026 봄학기 오픈소스 프로젝트 PING 운영진 방").length
    ).toBe(1);

    // 오늘의 작은 행동
    await waitForText(root, "한마디 건네 볼게요");
  });

  test("탭: 글자 탭으로 이동하고 선택 상태를 알린다", async () => {
    const root = await renderApp();
    await waitForText(root, "오늘의 연락");
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
});
