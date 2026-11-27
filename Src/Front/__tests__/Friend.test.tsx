import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "../src/services/conversation/mockConversationService";
import { createMockFriendService } from "../src/services/friend/mockFriendService";
import { formatSince } from "../src/constants/friend";
import { mergeMemos, services, STORAGE_KEYS } from "../src/services";
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

// 05 친구 흐름 테스트 (13 목록 → 14 상세 → 15 첫마디 → 10 다듬기, 계정 합치기·분리, 얼려두기)
// 로그인 + 온보딩 완료 상태에서 친구 탭으로 시작. 테스트마다 mock을 새로 만듦
const USER_ID = "mock-user-demo";
const LONG_NAME = "고등학교 축구부에서 함께 뛰던 이도현";
// 자정 근처에도 깨지지 않게 mock 시각(N분 전)으로 기대 문구를 만듦
const since = (minutesAgo: number) =>
  formatSince(new Date(Date.now() - minutesAgo * 60_000).toISOString());
const MINJI = since(60); // 민지 대화: 60분 전
const YERIN = since(10); // 예린 대화: 10분 전

const seed = async () => {
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
  services.conversation = createMockConversationService({ latency: 50 });
  services.messenger = createMockMessengerService();
  services.friends = createMockFriendService({ latency: 50 });
};

const openFriends = async () => {
  const root = await renderApp();
  await waitForText(root, "오늘의 도움 수준");
  await pressByRole(root, "tab", "친구");
  await waitForText(root, "다시 연락하고 싶은 관계를 천천히 살펴봐요.");
  return root;
};

const openFriend = async (root: Instance, name: string) => {
  await waitForText(root, name);
  await pressByRole(root, "button", name);
  await waitForText(root, "관계 기록은 평가가 아니라 다시 시작하기 위한 메모예요.");
};

const friendCardLabels = (root: Instance) =>
  root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityHint === "눌러서 친구 정보를 봐요"
    )
    .map(n => n.props.accessibilityLabel as string);

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

const hasTextContaining = (root: Instance, text: string) =>
  root.findAll(
    n =>
      typeof n.type === "string" &&
      typeof n.props.children === "string" &&
      n.props.children.includes(text)
  ).length > 0;

beforeEach(seed);

describe("13 친구 목록", () => {
  test("최근 연락 순서, 얼려둔 관계는 맨 아래, 긴 이름은 한 줄 말줄임", async () => {
    const root = await openFriends();
    await waitForText(root, "민지");

    const labels = friendCardLabels(root);
    expect(labels[0]).toBe(`예린, 최근 연락: ${YERIN}`);
    expect(labels.at(-1)).toBe("지연, 얼려둔 관계");
    expect(labels).toContain(`${LONG_NAME}, 최근 연락: 2개월 전`);

    const longName = findText(root, LONG_NAME);
    expect(longName[0].props.numberOfLines).toBe(1);
  });

  test("이름 검색: 앱 계정 이름으로도 찾고, 없으면 안내", async () => {
    const root = await openFriends();
    await waitForText(root, "민지");

    await type(root, "친구 이름 검색", "minji_daily");
    expect(friendCardLabels(root)).toEqual([`민지, 최근 연락: ${MINJI}`]);

    await type(root, "친구 이름 검색", "없는사람");
    await waitForText(root, "‘없는사람’ 친구를 찾지 못했어요");
  });

  test("불러오지 못하면 다시 불러오기, 친구가 없으면 빈 상태", async () => {
    services.friends = createMockFriendService({ latency: 50, failList: true });
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    await pressByRole(root, "tab", "친구");
    await waitForText(root, "친구 목록을 불러오지 못했어요");
    expect(findText(root, "다시 불러오기").length).toBeGreaterThan(0);

    services.friends = createMockFriendService({ latency: 50, empty: true });
    await press(root, "다시 불러오기");
    await waitForText(root, "아직 친구가 없어요");
    expect(findText(root, "친구 이름 검색").length).toBe(0);
  });
});

describe("14 친구 상세", () => {
  test("메모·마지막 대화·생일을 보여 주고, 마지막 대화는 08로, 08에서 다시 친구로", async () => {
    const root = await openFriends();
    await openFriend(root, "민지");

    expect(findText(root, "대학교 친구 · 편하게 안부를 물어볼 수 있음").length).toBe(1);
    expect(findText(root, "생일: 5월 18일").length).toBe(1);
    const last = `${MINJI} · 민지가 이번 주말에 만날 수 있는지 물었어요.`;
    await waitForText(root, last);

    await pressByRole(root, "button", `마지막 대화. ${last}`);
    await waitForText(root, "최근 연락");
    await press(root, "친구 정보 보기");
    await waitForText(root, "생일: 5월 18일");
  });

  test("안드로이드 뒤로가기는 친구 목록으로", async () => {
    const root = await openFriends();
    await openFriend(root, "준호");
    await pressBack();
    await waitForNoText(root, "관계 기록은 평가가 아니라 다시 시작하기 위한 메모예요.");
    expect(findText(root, "다시 연락하고 싶은 관계를 천천히 살펴봐요.").length).toBe(1);
  });

  test("다른 앱 계정을 같은 사람으로 합치고, 확인 팝업을 거쳐 따로 볼 수 있다", async () => {
    const root = await openFriends();
    await openFriend(root, "민지");
    await waitForText(root, "인스타그램 · minji_daily");

    // 합치기: 아직 연결 안 된 문자 "김민지"를 먼저 보여 줌
    await press(root, "같은 사람의 다른 계정 합치기");
    expect(isDisabled(root, "고른 계정 합치기")).toBe(true);
    await waitForText(root, "김민지 (아직 친구와 연결되지 않았어요)");
    await pressByRole(
      root,
      "radio",
      "문자 메신저, 김민지 (아직 친구와 연결되지 않았어요)"
    );
    await press(root, "고른 계정 합치기");
    await waitForText(root, "같은 사람으로 합칠까요?");
    // 연결 안 된 발신자라 합쳐지는 친구·메모 안내는 없음
    expect(hasTextContaining(root, "메모는 합쳐서 남겨요")).toBe(false);
    await press(root, "합치기");
    await waitForText(root, "문자 메신저 · 김민지");

    // 따로 보기: "그대로 둘게요"면 바뀌지 않음
    await pressByRole(root, "button", "minji_daily 계정 따로 보기");
    await waitForText(root, "이 계정을 따로 볼까요?");
    await press(root, "그대로 둘게요");
    await waitForNoText(root, "이 계정을 따로 볼까요?");
    expect(findText(root, "인스타그램 · minji_daily").length).toBe(1);

    await pressByRole(root, "button", "minji_daily 계정 따로 보기");
    await waitForText(root, "이 계정을 따로 볼까요?");
    await press(root, "따로 보기");
    await waitForNoText(root, "인스타그램 · minji_daily");

    // 목록에 분리한 계정이 새 친구로
    await pressBack();
    await waitForText(root, "minji_daily");
  });

  test("다른 친구를 통째로 합치면 확인 팝업에서 알리고, 두 사람의 메모를 이어 붙여 남긴다", async () => {
    const root = await openFriends();
    await openFriend(root, "민지");
    await press(root, "같은 사람의 다른 계정 합치기");
    await waitForText(root, "준호 (지금은 ‘준호’으로 보고 있어요)");
    await pressByRole(root, "radio", "카카오톡, 준호 (지금은 ‘준호’으로 보고 있어요)");
    await press(root, "고른 계정 합치기");

    await waitForText(root, "같은 사람으로 합칠까요?");
    expect(
      hasTextContaining(root, "‘준호’ 친구는 민지에 합쳐지고, 메모는 합쳐서 남겨요.")
    ).toBe(true);
    await press(root, "합치기");

    await waitForText(root, "카카오톡 · 준호");
    expect(
      findText(root, "대학교 친구 · 편하게 안부를 물어볼 수 있음\n고등학교 친구 · 생일을 먼저 챙겨 줌")
        .length
    ).toBe(1);

    // 준호는 민지에 합쳐져 목록에서 빠짐
    await pressBack();
    await waitForText(root, "다시 연락하고 싶은 관계를 천천히 살펴봐요.");
    await waitUntil(
      () => !friendCardLabels(root).some(label => label.startsWith("준호,")),
      "준호가 목록에서 빠짐"
    );
  });

  test("얼려두면 목록 아래로 가고, 다시 꺼낼 수 있다", async () => {
    const root = await openFriends();
    await openFriend(root, "준호");
    await press(root, "잠시 얼려두기");
    await waitForText(root, "얼려둔 관계예요");

    // 목록으로 돌아오면 다시 불러와서 준호가 얼려둔 관계로 아래쪽에
    await pressBack();
    await waitUntil(
      () =>
        friendCardLabels(root).slice(-2).join("|") ===
        "준호, 얼려둔 관계|지연, 얼려둔 관계",
      "얼려둔 친구가 목록 아래로"
    );

    await openFriend(root, "지연");
    await press(root, "다시 꺼내기");
    await waitForText(root, "잠시 얼려두기");
  });
});

describe("15 첫마디 → 10 다듬기", () => {
  test("고르기 전에는 비활성, 고르면 10에서 앱을 골라 복사하고 보냈다고 표시한다 (바로 보내기 없음)", async () => {
    const root = await openFriends();
    await openFriend(root, "민지");
    await press(root, "첫마디 함께 찾기");

    await waitForText(root, "짧은 안부부터 시작해볼까요?");
    await waitForText(root, "잘 지내는지 궁금했어. 요즘 어때?");
    expect(isDisabled(root, "선택한 첫마디 수정하기")).toBe(true);
    await pressByRole(root, "radio", "잘 지내는지 궁금했어. 요즘 어때?");
    await press(root, "선택한 첫마디 수정하기");

    await waitForText(root, "첫마디를 편하게 다듬어 보세요");
    expect(findText(root, "확인하고 보내기").length).toBe(0);
    expect(findText(root, "나중에 답하기").length).toBe(0);
    expect(findText(root, "알림이 남아 있지 않아 여기서 바로 보낼 수는 없어요.").length).toBe(0);

    // 계정이 두 앱에 있으면 보낼 앱을 고름
    await pressByRole(root, "radio", "인스타그램");
    await press(root, "복사하고 인스타그램 열기");
    await waitForText(root, "첫마디를 복사했어요");
    await press(root, "보냈다고 표시하기");
    // 15·10을 닫고 14로 돌아감
    await waitForNoText(root, "첫마디를 편하게 다듬어 보세요");
    await waitForNoText(root, "짧은 안부부터 시작해볼까요?");
    expect(findText(root, "생일: 5월 18일").length).toBe(1);
  });

  test("대화가 없는 친구도 첫마디를 보내고 나면 마지막 연락이 오늘로", async () => {
    const root = await openFriends();
    await openFriend(root, LONG_NAME);
    await waitForText(root, "2개월 전 · 여기에 모인 대화는 아직 없어요");

    await press(root, "첫마디 함께 찾기");
    await waitForText(root, "도현아, 문득 축구하던 때가 생각나서 연락해봤어.");
    await press(root, "직접 쓰기");
    await waitForText(root, "편하게 첫마디를 써 보세요");
    expect(isDisabled(root, "복사하고 카카오톡 열기")).toBe(true);
    await type(root, "첫마디 내용", "도현아 잘 지내?");
    await press(root, "복사하고 카카오톡 열기");
    await waitForText(root, "첫마디를 복사했어요");
    await press(root, "보냈다고 표시하기");
    await waitForText(root, "오늘 · 여기에 모인 대화는 아직 없어요");
  });
});

describe("친구 합치기 (서비스)", () => {
  test.each([
    ["둘 다 있으면 줄바꿈으로", "대학교 친구", "동아리 선배", "대학교 친구\n동아리 선배"],
    ["한쪽만 있으면 그 메모", undefined, "동아리 선배", "동아리 선배"],
    ["합쳐지는 쪽이 없으면 그대로", "대학교 친구", undefined, "대학교 친구"],
    ["같은 메모는 한 번만", "대학교 친구", " 대학교 친구 ", "대학교 친구"],
    ["둘 다 비면 없음", " ", undefined, undefined],
  ])("mergeMemos: %s", (_, keep, merged, expected) => {
    expect(mergeMemos(keep, merged)).toBe(expected);
  });

  test("마지막 계정을 합치면 그 친구가 합쳐지며 메모를 이어 붙이고, 생일은 없을 때만 가져온다", async () => {
    const friends = createMockFriendService({ latency: 0 });
    const candidates = await friends.getMergeCandidates("p-junho");
    expect(candidates.find(c => c.account.id === "seoyeon-김서연 선배")).toMatchObject({
      ownerName: "김서연 선배",
      mergesOwner: true,
    });

    await friends.mergeAccount("p-junho", "seoyeon-김서연 선배");
    const junho = await friends.get("p-junho");
    expect(junho.person.memo).toBe("고등학교 친구 · 생일을 먼저 챙겨 줌\n동아리 선배");
    expect(junho.person.birthday).toBe("12-03");
    expect((await friends.list()).map(f => f.person.id)).not.toContain("p-seoyeon");

    // 생일이 이미 있으면 그대로 (민지 05-18 ← 지연 09-02)
    await friends.mergeAccount("p-minji", "sms-지연");
    const minji = await friends.get("p-minji");
    expect(minji.person.birthday).toBe("05-18");
    expect(minji.person.memo).toBe("대학교 친구 · 편하게 안부를 물어볼 수 있음\n중학교 친구");
  });

  test("계정이 더 남는 친구에서 하나만 가져오면 그 친구와 메모는 그대로", async () => {
    const friends = createMockFriendService({ latency: 0 });
    const candidates = await friends.getMergeCandidates("p-junho");
    expect(candidates.find(c => c.account.id === "ig-minji_daily")?.mergesOwner).toBe(false);

    await friends.mergeAccount("p-junho", "ig-minji_daily");
    expect((await friends.get("p-minji")).person.memo).toBe(
      "대학교 친구 · 편하게 안부를 물어볼 수 있음"
    );
    expect((await friends.get("p-junho")).person.memo).toBe("고등학교 친구 · 생일을 먼저 챙겨 줌");
  });
});

describe("formatSince", () => {
  const now = new Date(2026, 10, 18, 12);
  const at = (y: number, m: number, d: number) => new Date(y, m, d, 9).toISOString();
  test.each([
    [at(2026, 10, 18), "오늘"],
    [at(2026, 10, 17), "어제"],
    [at(2026, 10, 13), "5일 전"],
    [at(2026, 10, 1), "2주 전"],
    [at(2026, 8, 10), "2개월 전"],
    [at(2025, 0, 1), "1년 전"],
  ])("%s → %s", (iso, expected) => {
    expect(formatSince(iso, now)).toBe(expected);
  });
});
