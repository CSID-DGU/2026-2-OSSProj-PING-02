import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { createMockModelService } from "../src/services/model/mockModelService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "../src/services/conversation/mockConversationService";
import { services, STORAGE_KEYS } from "../src/services";
import {
  findText,
  press,
  pressBack,
  pressByRole,
  renderApp,
  type,
  waitForNoText,
  waitForText,
  waitUntil,
  type Instance,
} from "../test-utils/app";

// 04 연락 흐름 테스트 (08 → 09-A·B·C → 10 → 11, 잘린 메시지)
// 로그인 + 온보딩 완료 상태에서 연락 탭으로 시작. 테스트마다 연락·메신저 mock을 새로 만듦
const USER_ID = "mock-user-demo";

const seed = async ({ modelInstalled }: { modelInstalled: boolean }) => {
  const login = await services.auth.login(
    MOCK_DEMO_ACCOUNT.loginId,
    MOCK_DEMO_ACCOUNT.password
  );
  await services.storage.setItem(STORAGE_KEYS.session, JSON.stringify(login));
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
  );
  services.conversation = createMockConversationService({ latency: 50 });
  services.messenger = createMockMessengerService();
  services.model = createMockModelService({ durationMs: 50 });
  if (modelInstalled) {
    const info = await services.model.getLatest();
    await services.model.startDownload(info, () => {}).done;
  }
};

const openContacts = async () => {
  const root = await renderApp();
  await waitForText(root, "오늘의 연락");
  await pressByRole(root, "tab", "연락");
  await waitForText(root, "편한 순서대로 천천히 살펴봐도 괜찮아요.");
  return root;
};

const openCard = async (root: Instance, name: string) => {
  await waitForText(root, name);
  await pressByRole(root, "button", name);
};

const inputValue = (root: Instance, label: string) =>
  root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityLabel === label &&
        !!n.props.onChangeText
    )
    .at(-1)?.props.value;

const isDisabled = (root: Instance, text: string) =>
  root
    .findAll(
      n =>
        n.props.accessibilityRole === "button" &&
        typeof n.props.onPress === "function" &&
        findText(n, text).length > 0
    )
    .map(n => n.props.accessibilityState?.disabled ?? n.props.disabled)
    .at(-1);

describe("가리기 모델이 준비된 경우", () => {
  beforeEach(() => seed({ modelInstalled: true }));

  test("1:1 질문: 08 → 09-A 입장 → 10 말투 조절 → 확인 팝업을 거쳐 보낸다", async () => {
    const root = await openContacts();
    await openCard(root, "민지");

    // 08: 요약 + 받은 메시지 + 잘린 메시지 버튼
    await waitForText(root, "민지와의 연락");
    await waitForText(root, "민지가 이번 주말에 만날 수 있는지 물었어요.");
    await waitForText(root, "답장 후보 살펴보기");
    expect(findText(root, "메시지가 잘린 상태 보기").length).toBe(1);
    await press(root, "답장 후보 살펴보기");

    // 09-A: 미리 골라 두지 않음 → 고르기 전에는 계속 버튼이 비활성
    await waitForText(root, "어떻게 답하고 싶으세요?");
    await waitForText(root, "거절");
    expect(isDisabled(root, "선택한 입장으로 계속")).toBe(true);
    await pressByRole(root, "radio", "거절");
    await press(root, "선택한 입장으로 계속");

    // 10: 고른 입장의 다정한 문장 → 말투를 짧게 바꾸면 문장이 바뀜
    await waitForText(root, "보내기 전에 말투를 다듬어보세요");
    await waitForText(root, "확인하고 보내기");
    expect(inputValue(root, "답장 내용")).toBe(
      "연락 줘서 고마워. 이번 주말은 조금 어려울 것 같아. 다음에 편한 날 보자."
    );
    await pressByRole(root, "radio", "짧게");
    await waitUntil(
      () => inputValue(root, "답장 내용") === "이번 주말은 어려울 것 같아.",
      "짧은 말투로 바뀜"
    );

    // 바로 보내기는 확인 팝업 필수: "조금 더 볼게요"면 보내지 않음
    await press(root, "확인하고 보내기");
    await waitForText(root, "이 답장을 보낼까요?");
    await press(root, "조금 더 볼게요");
    await waitForNoText(root, "이 답장을 보낼까요?");
    expect(findText(root, "보내기 전에 말투를 다듬어보세요").length).toBe(1);

    await press(root, "확인하고 보내기");
    await press(root, "보내기");
    // 보내면 목록으로 돌아가고 "답장함" 표시
    await waitForText(root, "답장함");
  });

  test("바로 답장이 안 되면 보내기 버튼 없이 안내하고, 복사하고 메신저 열기로 보낸다 (09-B)", async () => {
    const root = await openContacts();
    await openCard(root, "하늘");
    // 가리기 모델 상태를 불러온 뒤에 답장 후보 버튼이 나타남
    await waitForText(root, "답장 후보 살펴보기");
    await press(root, "답장 후보 살펴보기");

    await waitForText(root, "어떤 말투가 편하세요?");
    await waitForText(root, "안부·축하 메시지");
    await pressByRole(root, "radio", "다정하게");
    await press(root, "선택한 말투로 계속");

    await waitForText(
      root,
      "알림이 남아 있지 않아 여기서 바로 보낼 수는 없어요."
    );
    expect(findText(root, "확인하고 보내기").length).toBe(0);
    await press(root, "복사하고 인스타그램 열기");
    await waitForText(root, "답장을 복사했어요");
    await press(root, "보냈다고 표시하기");
    await waitForText(root, "답장함");
  });

  test("단톡은 08 없이 09-C로 가고, 나를 언급한 메시지를 강조한다", async () => {
    const root = await openContacts();
    await openCard(root, "2026 봄학기 오픈소스 프로젝트 PING 운영진 방");

    await waitForText(root, "나에게 온 질문이 있어요");
    expect(findText(root, "단체 대화 요약").length).toBe(1);
    expect(findText(root, "나를 언급한 메시지가 1개 있어요.").length).toBe(1);
    // 언급한 메시지 줄: "나를 언급" 글자 + 굵은 글씨 (색만으로 구분하지 않음)
    const mentioned = root.findAll(
      n =>
        typeof n.type === "string" &&
        typeof n.props.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.startsWith("나를 언급. 도윤:")
    );
    expect(mentioned.length).toBe(1);
    expect(findText(mentioned[0], "나를 언급").length).toBe(1);
    expect(findText(root, "민지와의 연락").length).toBe(0);

    // 확인만: 고르기 전에는 버튼 비활성 → 고르면 목록으로
    expect(isDisabled(root, "확인했어요")).toBe(true);
    await pressByRole(root, "radio", "답장 없이 확인만 할게요.");
    await press(root, "확인했어요");
    await waitForText(root, "편한 순서대로 천천히 살펴봐도 괜찮아요.");
    await waitForNoText(root, "나에게 온 질문이 있어요");
  });

  test("정보만 있는 단톡은 언급이 없다고 알려 주고, 원하면 답장을 만들 수 있다", async () => {
    const root = await openContacts();
    await openCard(root, "대학교 친구들");

    await waitForText(root, "지금은 답장이 꼭 필요하지 않아요");
    await waitForText(root, "나를 언급한 질문은 없어요.");
    await pressByRole(root, "radio", "그래도 짧은 답장을 만들고 싶어요.");
    await press(root, "답장 만들기");
    await waitForText(root, "어떤 말투가 편하세요?");
  });

  test("11 나중에 답하기: 3일 뒤로 보관하면 목록에 다시 볼 때가 붙고, 뒤로가기는 08로", async () => {
    const root = await openContacts();
    await openCard(root, "준호");
    await waitForText(root, "준호와의 연락");
    await press(root, "나중에 답하기");

    await waitForText(root, "언제 다시 볼까요?");
    expect(findText(root, "선택: 3일 뒤").length).toBe(1);
    // 안드로이드 뒤로가기 → 08
    await pressBack();
    await waitForNoText(root, "언제 다시 볼까요?");
    expect(findText(root, "준호와의 연락").length).toBe(1);

    await press(root, "나중에 답하기");
    await pressByRole(root, "radio", "1주 뒤");
    expect(findText(root, "선택: 1주 뒤").length).toBe(1);
    await press(root, "1주 뒤 다시 보기");
    await waitForText(root, "7일 뒤 다시 보기");
  });

  test("분석 실패: 요약 없이 기본 카드, 직접 답장 쓰기에는 말투 조절이 없다", async () => {
    const root = await openContacts();
    await openCard(root, "시우");
    await waitForText(
      root,
      "이번 메시지는 정리하지 못했어요. 받은 메시지는 그대로 볼 수 있어요."
    );
    expect(findText(root, "요약").length).toBe(0);
    expect(findText(root, "답장 후보 살펴보기").length).toBe(0);

    await press(root, "직접 답장 쓰기");
    await waitForText(root, "편하게 답장을 써 보세요");
    expect(findText(root, "말투 조절").length).toBe(0);
    // 빈 답장은 보낼 수 없음
    await waitForText(root, "확인하고 보내기");
    expect(isDisabled(root, "확인하고 보내기")).toBe(true);
    await type(root, "답장 내용", "ㅋㅋ 귀엽다");
    expect(isDisabled(root, "확인하고 보내기")).toBe(false);
  });

  test("잘린 메시지(16): 붙여 넣은 내용을 정리하고 답장 후보로, 돌아오면 정리한 내용", async () => {
    const root = await openContacts();
    await openCard(root, "민지");
    await waitForText(root, "메시지가 잘린 상태 보기");
    await press(root, "메시지가 잘린 상태 보기");

    await waitForText(root, "긴 메시지를 붙여넣어 주세요");
    expect(
      findText(root, "분석할 내용만 사용하고 원문은 저장하지 않아요.").length
    ).toBe(1);
    expect(isDisabled(root, "요약하고 답장 찾기")).toBe(true);
    await type(
      root,
      "붙여넣을 메시지",
      "이번 주말에 성수에서 밥 먹자. 토요일 1시 어때?"
    );
    await press(root, "요약하고 답장 찾기");

    // 민지는 묻는 말 → 09-A
    await waitForText(root, "어떻게 답하고 싶으세요?");
    await pressBack();
    await waitForText(root, "정리한 내용");
  });
});

describe("가리기 모델이 없는 경우", () => {
  beforeEach(() => seed({ modelInstalled: false }));

  test("08은 요약 없이 받은 메시지만 보여 주고 직접 답장 쓰기를 둔다", async () => {
    const root = await openContacts();
    await openCard(root, "민지");
    await waitForText(root, "받은 메시지를 그대로 보여 드려요.");
    await waitForText(root, "요약은 가리기 모델을 받은 뒤에 보여요");
    expect(findText(root, "답장 후보 살펴보기").length).toBe(0);
    expect(findText(root, "직접 답장 쓰기").length).toBe(1);
  });
});

describe("오류·빈 상태", () => {
  test("목록을 불러오지 못하면 다시 불러오기를 보여 준다", async () => {
    await seed({ modelInstalled: true });
    services.conversation = createMockConversationService({ failList: true });
    const root = await renderApp();
    await pressByRole(root, "tab", "연락");
    await waitForText(root, "연락을 불러오지 못했어요");
    expect(findText(root, "다시 불러오기").length).toBeGreaterThan(0);
  });

  test("연락이 없으면 빈 상태 안내", async () => {
    await seed({ modelInstalled: true });
    services.conversation = createMockConversationService({ empty: true });
    const root = await renderApp();
    await pressByRole(root, "tab", "연락");
    await waitForText(root, "아직 모인 연락이 없어요");
  });
});
