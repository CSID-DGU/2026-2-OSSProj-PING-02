import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import {
  createMockConversationService,
  createMockMessengerService,
} from "../src/services/conversation/mockConversationService";
import { createMockFriendService } from "../src/services/friend/mockFriendService";
import { formatFriendTime, formatSince } from "../src/constants/friend";
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

// 06 친구 흐름 테스트 (E01 목록 → E02·E03 상세·연결 계정·원문 관리 → E04 동일 인물 → E05 → 15 첫마디 → 10 다듬기)
// 로그인 + 온보딩 완료 상태에서 친구 탭으로 시작. 테스트마다 mock을 새로 만듦
const USER_ID = "mock-user-demo";
const LONG_NAME = "고등학교 축구부에서 함께 뛰던 이도현";
// 06 목록 시간 (시안 형식)
const listTime = (minutesAgo: number) =>
  formatFriendTime(new Date(Date.now() - minutesAgo * 60_000).toISOString());

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

// 06 목록이 보이는지: 밑줄 탭 "NEW"
const LIST_READY = "NEW";

const openFriends = async () => {
  const root = await renderApp();
  await waitForText(root, "오늘의 도움 수준");
  await pressByRole(root, "tab", "친구");
  await waitForText(root, LIST_READY);
  return root;
};

// 06 친구 상세 열기 (친구는 기본 정보, NEW는 E02 질문이 보일 때까지)
const openFriend = async (root: Instance, name: string) => {
  await waitForText(root, name);
  await pressByRole(root, "button", name);
  await waitForText(root, "관계 설명");
};

// NEW 줄은 이름이 같은 친구와 헷갈리지 않게 "이름, NEW"로 찾음
const openNew = async (root: Instance, name: string) => {
  await waitForText(root, name);
  const row = root
    .findAll(
      n =>
        typeof n.props.onPress === "function" &&
        typeof n.props.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.startsWith(`${name}, NEW`)
    )
    .at(-1);
  if (!row) throw new Error(`${name} NEW 줄이 없습니다`);
  await pressByRole(root, "button", row.props.accessibilityLabel);
  await waitForText(root, E02_QUESTION);
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

// 하단 탭 "홈"·"연락"이 선택됐는지 (친구 화면의 관계 탭과 이름이 겹치지 않는 것만)
const tabSelected = (root: Instance, label: string) =>
  root.findAll(
    n =>
      n.props.accessibilityRole === "tab" &&
      n.props.accessibilityLabel === label &&
      n.props.accessibilityState?.selected === true
  ).length > 0;

const favoriteChecked = (root: Instance, name: string) =>
  root
    .findAll(
      n =>
        n.props.accessibilityRole === "checkbox" &&
        n.props.accessibilityLabel === `${name} 중요한 친구로 표시` &&
        typeof n.props.onPress === "function"
    )
    .at(-1)?.props.accessibilityState?.checked;

describe("06 E01 친구 목록", () => {
  test("연락 최신순, NEW도 함께, 관계 칩·메신저·시간·확인할 연락을 읽어 줌, 긴 이름은 한 줄", async () => {
    const root = await openFriends();
    await waitForText(root, "민지");

    const labels = friendCardLabels(root);
    // 시간은 mock 데이터 시각으로 계산 (mock 시각은 파일을 불러올 때 정해져서, 테스트가 느리면 지금 기준으로는 1분 어긋남)
    const all = await services.friends.list();
    const timeOf = (name: string) =>
      formatFriendTime(all.find(f => f.person.displayName === name)!.lastContactAt!);
    // 예린(10분 전) → 민지(60분 전) … 얼려둔 지연도 순서대로 (맨 아래로 보내지 않음)
    expect(labels[0]).toBe(`예린, 직장, 카카오톡, ${timeOf("예린")}`);
    expect(labels[1]).toBe(
      `민지, 친구, 카카오톡, 인스타그램, ${timeOf("민지")}, 확인할 연락 있음`
    );
    expect(labels).toContain("유영서, NEW, 카카오톡, 문자 메신저, 일주일 전");
    // 얼려둔 지연(8달 전)이 맨 끝 (화면은 처음에 10줄만 그려서 서비스 순서로 확인)
    expect(all.at(-1)?.person.displayName).toBe("지연");

    expect(findText(root, LONG_NAME)[0].props.numberOfLines).toBe(1);
  });

  test("탭으로 NEW·관계별로 보고, 검색은 지금 탭 안에서 앱 계정 이름으로도 찾음", async () => {
    const root = await openFriends();
    await waitForText(root, "민지");

    await pressByRole(root, "tab", "NEW");
    expect(friendCardLabels(root).map(l => l.split(",")[0])).toEqual(["홍선빈", "유영서"]);
    // NEW는 별·하트가 없음
    expect(favoriteChecked(root, "유영서")).toBeUndefined();

    await pressByRole(root, "tab", "직장");
    expect(friendCardLabels(root).map(l => l.split(",")[0])).toEqual(["예린"]);

    await pressByRole(root, "tab", "전체");
    await type(root, "친구 이름 검색", "minji_daily");
    expect(friendCardLabels(root).map(l => l.split(",")[0])).toEqual(["민지"]);

    await type(root, "친구 이름 검색", "없는사람");
    await waitForText(root, "‘없는사람’ 친구를 찾지 못했어요");
  });

  test("별·하트를 눌러 중요한 친구 표시를 켜고 끔 (직장은 별, 그 밖은 하트)", async () => {
    const root = await openFriends();
    await waitForText(root, "민지");
    expect(favoriteChecked(root, "민지")).toBe(true);
    expect(favoriteChecked(root, "준호")).toBe(false);

    await pressByRole(root, "checkbox", "준호 중요한 친구로 표시");
    await waitUntil(() => favoriteChecked(root, "준호") === true, "준호 색칠");
    await pressByRole(root, "checkbox", "민지 중요한 친구로 표시");
    await waitUntil(() => favoriteChecked(root, "민지") === false, "민지 색칠 끔");
  });

  test("NEW가 없으면 빈 상태: 답장하러 가기 → 연락 탭, 연락하러 가기 → 첫마디 보내기", async () => {
    services.friends = createMockFriendService({ latency: 50, noNew: true });
    const root = await openFriends();
    await waitForText(root, "민지");

    await pressByRole(root, "tab", "NEW");
    await waitForText(
      root,
      "새롭게 발견된 친구가 없어요.\n기존 친구들에게 답장을 해보거나,\n먼저 연락을 해볼까요?"
    );
    await press(root, "답장하러 가기");
    await waitUntil(() => tabSelected(root, "연락"), "연락 탭으로");

    await pressByRole(root, "tab", "친구");
    await waitForText(root, "답장하러 가기");
    await press(root, "연락하러 가기");
    // E05: 친구 탭 안에 쌓임 (뒤로가기 있음)
    await waitForText(root, "첫마디 보내기");
    expect(tabSelected(root, "친구")).toBe(true);
    await pressBack();
    await waitForNoText(root, "첫마디 보내기");
  });

  test("E05 첫마디 보내기: 홈 안부 카드 → 친구 고르기 → 15 첫마디, 뒤로가기로 하나씩 돌아온다", async () => {
    services.friends = createMockFriendService({ latency: 50, noNew: true });
    const root = await renderApp();
    await waitForText(root, "오랜만에 안부 전하기");
    await pressByRole(root, "button", "오랜만에 안부 전하기");
    await waitForText(root, "첫마디 보내기");
    // 홈 탭 안에 쌓임
    expect(tabSelected(root, "홈")).toBe(true);

    await waitForText(root, "민지");
    await pressByRole(root, "button", "민지");
    await waitForText(root, "짧은 안부부터 시작해볼까요?");

    await pressBack();
    await waitForNoText(root, "짧은 안부부터 시작해볼까요?");
    await waitForText(root, "첫마디 보내기");

    // E05에서 NEW가 비어 있으면 "연락하러 가기"는 전체 탭으로 (이미 이 화면이라)
    await pressByRole(root, "tab", "NEW");
    await waitForText(root, "답장하러 가기");
    await press(root, "연락하러 가기");
    await waitForNoText(root, "답장하러 가기");
    await waitForText(root, "민지");

    await pressBack();
    await waitForText(root, "오늘의 도움 수준");
    await waitForNoText(root, "첫마디 보내기");
  });

  test("관계 탭이 비면 한 줄 안내", async () => {
    // 유일한 "기타" 친구(김서연 선배)를 준호에게 합쳐서 기타 탭을 비움
    await services.friends.mergeAccount("p-junho", "seoyeon-김서연 선배");
    const root = await openFriends();
    await waitForText(root, "민지");

    await pressByRole(root, "tab", "기타");
    await waitForText(root, "아직 이 관계의 친구가 없어요");
    expect(friendCardLabels(root)).toEqual([]);
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
    // 친구가 없으면 검색창도 숨김
    expect(
      root.findAll(n => n.props.accessibilityLabel === "친구 이름 검색").length
    ).toBe(0);
  });
});

// 06 상세 맨 위(검색창·6개 탭) 안에서만 찾기 (아래 깔린 목록의 같은 탭과 헷갈리지 않게)
const detailTop = (root: Instance) =>
  root.findAll(n => n.props.testID === "friend-detail-top").at(-1)!;

// 줄 라벨(이름, 칩, …)이 prefix로 시작하는 줄
const rowLabelStartsWith = (root: Instance, prefix: string) =>
  root.findAll(
    n =>
      typeof n.type === "string" &&
      typeof n.props.accessibilityLabel === "string" &&
      n.props.accessibilityLabel.startsWith(prefix)
  ).length > 0;

const inputValue = (root: Instance, label: string) =>
  root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityLabel === label &&
        !!n.props.onChangeText
    )
    .at(-1)?.props.value;

const switchChecked = (root: Instance, label: string) =>
  root
    .findAll(
      n =>
        n.props.accessibilityRole === "switch" &&
        n.props.accessibilityLabel === label &&
        typeof n.props.onPress === "function"
    )
    .at(-1)?.props.accessibilityState?.checked;

// 서비스 값이 바뀔 때까지 (자동 저장은 입력을 멈추고 잠시 뒤)
const eventually = async (check: () => Promise<boolean>, what: string) => {
  for (let i = 0; i < 30; i++) {
    if (await check()) return;
    await waitUntil(() => false, what, 100).catch(() => {});
  }
  throw new Error(`${what}: 되지 않았습니다`);
};

const E02_QUESTION = "기존 친구에게 연결하거나\n새로운 친구로 등록해볼까요?";

describe("06 E02·E03 친구 상세", () => {
  test("기본 정보는 자동 저장 (이름·관계·관계 설명), 전화번호는 보기만, 뒤로가기는 목록으로", async () => {
    const root = await openFriends();
    await openFriend(root, "민지");
    expect(inputValue(root, "이름")).toBe("민지");
    expect(inputValue(root, "관계 설명")).toBe("대학교 친구 · 편하게 안부를 물어볼 수 있음");
    // 전화번호는 보기만 (입력할 수 없음)
    const phone = root
      .findAll(n => typeof n.type === "string" && n.props.value === "010-1234-5678")
      .at(-1);
    expect(phone?.props.editable).toBe(false);

    await type(root, "이름", "김민지");
    await pressByRole(root, "radio", "가족");
    await type(root, "관계 설명", "대학교 친구");
    await eventually(async () => {
      const { person } = await services.friends.get("p-minji");
      return (
        person.displayName === "김민지" &&
        person.relation === "family" &&
        person.memo === "대학교 친구"
      );
    }, "자동 저장");

    await pressBack();
    await waitForNoText(root, "관계 설명");
    await waitUntil(() => rowLabelStartsWith(root, "김민지, 가족"), "목록에 바뀐 이름·관계");
  });

  test("이름을 다 지우면 저장하지 않고, 화면을 떠날 때 남은 변경을 저장", async () => {
    const root = await openFriends();
    await openFriend(root, "준호");
    await type(root, "이름", "");
    await type(root, "관계 설명", "가족 같은 친구");
    await pressBack();
    await eventually(async () => {
      const { person } = await services.friends.get("p-junho");
      return person.memo === "가족 같은 친구";
    }, "떠날 때 저장");
    expect((await services.friends.get("p-junho")).person.displayName).toBe("준호");
  });

  test("상세의 6개 탭은 목록의 그 탭으로, 검색창은 목록 검색칸 포커스로", async () => {
    const root = await openFriends();
    await openFriend(root, "예린");
    // 예린은 직장 탭이 선택돼 보임
    expect(
      detailTop(root).findAll(
        n =>
          n.props.accessibilityRole === "tab" &&
          n.props.accessibilityLabel === "직장" &&
          n.props.accessibilityState?.selected === true
      ).length
    ).toBeGreaterThan(0);

    await pressByRole(detailTop(root), "tab", "가족");
    await waitForNoText(root, "관계 설명");
    expect(tabSelected(root, "가족")).toBe(true);
    expect(friendCardLabels(root).map(l => l.split(",")[0])).toEqual(["준호"]);

    await openFriend(root, "준호");
    await pressByRole(detailTop(root), "button", "친구 이름 검색");
    await waitForNoText(root, "관계 설명");
    const search = root
      .findAll(
        n =>
          typeof n.type === "string" &&
          n.props.accessibilityLabel === "친구 이름 검색" &&
          !!n.props.onChangeText
      )
      .at(-1);
    expect(search?.props.autoFocus).toBe(true);
  });

  test("NEW는 하위 탭과 상관없이 E02, 새 친구 추가하기 → 기본 정보", async () => {
    const root = await openFriends();
    await openNew(root, "유영서");
    await pressByRole(root, "tab", "연결 계정");
    expect(findText(root, E02_QUESTION).length).toBe(1);
    await pressByRole(root, "tab", "원문 관리");
    expect(findText(root, E02_QUESTION).length).toBe(1);

    await press(root, "새 친구 추가하기");
    await waitForText(root, "관계 설명");
    expect(inputValue(root, "이름")).toBe("유영서");
    expect((await services.friends.get("p-new-youngseo")).person.isFriend).toBe(true);
  });

  test("NEW: 다른 친구에게 연결하기 → E04-1에서 한 명 골라 연결하면 그 친구 상세로", async () => {
    const root = await openFriends();
    await openNew(root, "유영서");
    await press(root, "다른 친구에게 연결하기");
    await waitForText(root, "기존 친구에게 연결");
    expect(isDisabled(root, "연결하기")).toBe(true);

    await type(root, "친구 이름 검색", "준");
    const sheetRows = () =>
      root
        .findAll(n => n.props.accessibilityRole === "radio" && typeof n.props.onPress === "function")
        .map(n => n.props.accessibilityLabel as string);
    await waitUntil(
      () => sheetRows().length > 0 && sheetRows().every(l => l.startsWith("준호")),
      "검색으로 준호만"
    );
    await pressByRole(root, "radio", "준호");
    await press(root, "연결하기");

    await waitUntil(
      () => rowLabelStartsWith(root, "준호, 가족, 카카오톡, 문자 메신저"),
      "준호 상세에 문자 계정이 합쳐짐"
    );
    await waitForText(root, "관계 설명");
    await expect(services.friends.get("p-new-youngseo")).rejects.toBeTruthy();
  });

  test("NEW: 연결하지 않고 삭제하기는 확인 팝업을 거쳐 목록에서 빠짐", async () => {
    const root = await openFriends();
    await openNew(root, "유영서");
    await press(root, "연결하지 않고 삭제하기");
    await waitForText(root, "연결하지 않고 삭제할까요?");
    await press(root, "취소");
    await waitForNoText(root, "연결하지 않고 삭제할까요?");

    await press(root, "연결하지 않고 삭제하기");
    await waitForText(root, "연결하지 않고 삭제할까요?");
    await press(root, "삭제하기");
    await waitForNoText(root, E02_QUESTION);
    await waitUntil(() => !rowLabelStartsWith(root, "유영서"), "목록에서 빠짐");
  });

  test("E04: 이름이 같은 친구가 있으면 팝업. 모르겠어요는 다음에 다시, 다른 사람이에요는 다시 묻지 않음", async () => {
    const root = await openFriends();
    await openNew(root, "홍선빈");
    await waitForText(root, "홍선빈님의 계정일까요?");
    expect(findText(root, "@seonbinihong05").length).toBe(1);
    expect(findText(root, "선빈").length).toBe(1);

    await press(root, "모르겠어요");
    await waitForNoText(root, "홍선빈님의 계정일까요?");
    expect(findText(root, E02_QUESTION).length).toBe(1);

    await pressBack();
    await waitForNoText(root, E02_QUESTION);
    await openNew(root, "홍선빈");
    await waitForText(root, "홍선빈님의 계정일까요?");
    await press(root, "다른 사람이에요");
    await waitForNoText(root, "홍선빈님의 계정일까요?");

    await pressBack();
    await waitForNoText(root, E02_QUESTION);
    await openNew(root, "홍선빈");
    await waitUntil(() => false, "팝업이 뜨지 않음", 500).catch(() => {});
    expect(findText(root, "홍선빈님의 계정일까요?").length).toBe(0);
  });

  test("E04: 동일 인물로 연결하면 그 친구에게 합쳐지고 그 친구 상세로", async () => {
    const root = await openFriends();
    await openNew(root, "홍선빈");
    await waitForText(root, "홍선빈님의 계정일까요?");
    await press(root, "동일 인물로 연결하기");
    await waitUntil(
      () => rowLabelStartsWith(root, "홍선빈, 친구, 카카오톡, 인스타그램"),
      "친구 홍선빈에 인스타그램이 합쳐짐"
    );
    await waitForText(root, "관계 설명");
  });
});

describe("06 E03-1 연결 계정 · E03-3/4 연결 관리 시트", () => {
  const openAccounts = async (name: string) => {
    const root = await openFriends();
    await openFriend(root, name);
    await pressByRole(root, "tab", "연결 계정");
    await waitForText(root, "연결된 계정");
    return root;
  };

  test("앱마다 한 줄 (연결됨 · 연결 안 됨 · 문자는 연락처 기반), 이름이 비슷한 계정은 연결이 필요한 계정에", async () => {
    const root = await openAccounts("민지");
    expect(rowLabelStartsWith(root, "카카오톡, 연결됨, 민지")).toBe(true);
    expect(rowLabelStartsWith(root, "인스타그램, 연결됨, minji_daily")).toBe(true);
    expect(rowLabelStartsWith(root, "문자, 연결 안 됨")).toBe(true);

    await waitUntil(() => rowLabelStartsWith(root, "문자, 연결 안 됨, 김민지"), "합치기 후보");
    await pressByRole(root, "button", "문자, 연결 안 됨, 김민지");
    await waitForText(root, "이 친구의 계정으로 연결할까요?");
    await press(root, "연결하기");
    await waitUntil(
      () => rowLabelStartsWith(root, "문자, 연락처 기반, 010-1234-5678"),
      "문자 계정 연결됨 (번호로 보임)"
    );
    await waitForText(root, "연결이 필요해보이는 계정을 찾지 못했어요.");
  });

  test("카카오톡 시트: 분석 끄기 · 연결 해지(확인 팝업, NEW로) · 계정이 하나면 해지할 수 없음", async () => {
    const root = await openAccounts("민지");
    await pressByRole(root, "button", "카카오톡, 연결됨, 민지");
    await waitForText(root, "카카오톡 연결 관리");
    expect(switchChecked(root, "이 계정의 연락 분석")).toBe(true);
    await pressByRole(root, "switch", "이 계정의 연락 분석");
    await waitUntil(() => switchChecked(root, "이 계정의 연락 분석") === false, "분석 꺼짐");
    expect((await services.friends.get("p-minji")).analysisOff).toEqual(["minji-민지"]);

    await press(root, "연결 해지하기");
    await waitForText(root, "연결을 해지할까요?");
    await press(root, "연결 해지하기");
    await waitUntil(() => rowLabelStartsWith(root, "카카오톡, 연결 안 됨"), "카카오톡 연결 해지");
    // 남은 계정이 하나(인스타그램)라 더 해지할 수 없음
    await pressByRole(root, "button", "인스타그램, 연결됨, minji_daily");
    await waitForText(root, "인스타그램 연결 관리");
    expect(isDisabled(root, "연결 해지하기")).toBe(true);
  });

  test("문자 시트 문구, 기본 정보 체크를 끄면 모든 계정 분석이 꺼짐", async () => {
    await services.friends.mergeAccount("p-minji", "sms-김민지");
    const root = await openFriends();
    await openFriend(root, "민지");
    await pressByRole(root, "checkbox", "이 친구의 연락을 분석해요");
    await eventually(
      async () => (await services.friends.get("p-minji")).analysisOff.length === 3,
      "모든 계정 분석 꺼짐"
    );

    await pressByRole(root, "tab", "연결 계정");
    await waitUntil(() => rowLabelStartsWith(root, "문자, 연락처 기반"), "문자 줄");
    await pressByRole(root, "button", "문자, 연락처 기반, 010-1234-5678");
    await waitForText(root, "문자 메신저 연결 관리");
    await waitForText(root, "이 번호로 오는 알림을 분석해요");
    expect(switchChecked(root, "이 번호의 연락 분석")).toBe(false);
  });

  test("다른 친구에게 연결: 계정 하나를 옮기고, 마지막 계정이면 그 친구 상세로", async () => {
    const root = await openAccounts("민지");
    await pressByRole(root, "button", "인스타그램, 연결됨, minji_daily");
    await waitForText(root, "인스타그램 연결 관리");
    await press(root, "다른 친구에게 연결");
    await waitForText(root, "기존 친구에게 연결");
    await pressByRole(root, "radio", "예린");
    await press(root, "연결하기");
    await waitUntil(() => rowLabelStartsWith(root, "인스타그램, 연결 안 됨"), "민지에서 빠짐");
    expect((await services.friends.get("p-yerin")).accounts.map(a => a.id)).toContain(
      "ig-minji_daily"
    );

    await pressByRole(root, "button", "카카오톡, 연결됨, 민지");
    await waitForText(root, "카카오톡 연결 관리");
    await press(root, "다른 친구에게 연결");
    await waitForText(root, "기존 친구에게 연결");
    await pressByRole(root, "radio", "예린");
    await press(root, "연결하기");
    await waitUntil(
      () => rowLabelStartsWith(root, "예린, 직장, 카카오톡, 인스타그램"),
      "민지가 예린에 합쳐져 예린 상세로"
    );
  });

  test("연결 안 됨 앱 줄: 다른 NEW의 그 앱 계정을 이 친구에게 연결", async () => {
    const root = await openAccounts("준호");
    await pressByRole(root, "button", "인스타그램, 연결 안 됨");
    await waitForText(root, "인스타그램 계정 연결");
    await pressByRole(root, "radio", "홍선빈");
    await press(root, "연결하기");
    await waitUntil(() => rowLabelStartsWith(root, "인스타그램, 연결됨, 선빈"), "인스타그램 연결됨");
  });
});

describe("06 E03-2 원문 관리", () => {
  test("최근 한 달 개수·다음 자동 삭제 날짜, 저장된 원문은 최근 대화로", async () => {
    const root = await openFriends();
    await openFriend(root, "민지");
    await pressByRole(root, "tab", "원문 관리");
    await waitForText(root, "다음 자동 삭제 날짜");
    expect(hasTextContaining(root, "최근 한 달 간")).toBe(true);
    expect(findText(root, "아직 삭제된 이력이 존재하지 않아요.").length).toBe(1);
    expect(hasTextContaining(root, "아직 저장된 원문이 없어요.")).toBe(false);

    const { rawStats } = await services.friends.get("p-minji");
    await pressByRole(root, "button", `저장된 원문, 최근 한 달 간 ${rawStats.recentCount}개`);
    await waitForText(root, "민지와의 연락");
  });

  test("원문이 없는 친구는 누를 수 없음", async () => {
    const root = await openFriends();
    await openFriend(root, "홍선빈");
    await pressByRole(root, "tab", "원문 관리");
    await waitForText(root, "최근 한 달 간 0개");
    await waitForText(root, "아직 저장된 원문이 없어요.");
    expect(
      root.findAll(n => n.props.accessibilityHint === "눌러서 최근 대화를 봐요").length
    ).toBe(0);
  });
});

describe("15 첫마디 → 10 다듬기 (E05에서)", () => {
  const openPick = async () => {
    const root = await renderApp();
    await waitForText(root, "오랜만에 안부 전하기");
    await pressByRole(root, "button", "오랜만에 안부 전하기");
    await waitForText(root, "첫마디 보내기");
    return root;
  };

  test("고르기 전에는 비활성, 고르면 10에서 앱을 골라 복사하고 보냈다고 표시한다 (바로 보내기 없음)", async () => {
    const root = await openPick();
    await waitForText(root, "민지");
    await pressByRole(root, "button", "민지");

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
    // 15·10을 닫고 E05 친구 고르기로 돌아감
    await waitForNoText(root, "첫마디를 편하게 다듬어 보세요");
    await waitForNoText(root, "짧은 안부부터 시작해볼까요?");
    await waitForText(root, "첫마디 보내기");
  });

  test("대화가 없는 친구도 첫마디를 보내고 나면 마지막 연락이 오늘로", async () => {
    const root = await openPick();
    await waitUntil(() => rowLabelStartsWith(root, `${LONG_NAME}, 친구, 카카오톡, 2달 전`), "2달 전");
    await pressByRole(root, "button", LONG_NAME);

    await waitForText(root, "도현아, 문득 축구하던 때가 생각나서 연락해봤어.");
    await press(root, "직접 쓰기");
    await waitForText(root, "편하게 첫마디를 써 보세요");
    expect(isDisabled(root, "복사하고 카카오톡 열기")).toBe(true);
    await type(root, "첫마디 내용", "도현아 잘 지내?");
    await press(root, "복사하고 카카오톡 열기");
    await waitForText(root, "첫마디를 복사했어요");
    await press(root, "보냈다고 표시하기");
    await waitUntil(
      () => rowLabelStartsWith(root, `${LONG_NAME}, 친구, 카카오톡, ${listTime(0)}`),
      "마지막 연락이 오늘"
    );
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
