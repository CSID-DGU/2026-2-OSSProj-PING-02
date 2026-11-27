import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import {
  createMockConversationService,
  createMockMessengerService,
  MOCK_CLIPBOARD_TEXT,
} from "../src/services/conversation/mockConversationService";
import { services, STORAGE_KEYS } from "../src/services";
import {
  deferButtonLabel,
  deferRemindAt,
  formatDeferAt,
  isDeferOptionAvailable,
} from "../src/constants/contact";
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

// 05 연락 흐름 테스트 (D01 목록·D02 분석 대화방·D03 상세·답장·D05 단체방, 잘린 메시지)
// 로그인 + 온보딩 완료 상태에서 연락 탭으로 시작. 테스트마다 연락·메신저 mock을 새로 만듦
const USER_ID = "mock-user-demo";

// 답장 단계·보내기·D04처럼 여러 화면을 거치는 테스트가 많아, 기기가 바쁠 때도 넘치지 않게
jest.setTimeout(15000);

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
  // 오늘의 도움 수준은 테스트마다 "아직 안 고름"으로 (setHelpMode로 바꾼 값이 남지 않게)
  await services.storage.removeItem(`${STORAGE_KEYS.homeHelp}.${USER_ID}`);
  services.conversation = createMockConversationService({ latency: 50 });
  services.messenger = createMockMessengerService();
};

// 자동 로그인(저장 토큰 복구)이 끝나 탭바가 보일 때까지
const waitForTabs = (root: Instance) =>
  waitUntil(
    () => root.findAll(n => n.props.accessibilityRole === "tab").length > 0,
    "탭바 표시"
  );

const openContacts = async () => {
  const root = await renderApp();
  await waitForText(root, "오늘의 도움 수준");
  await pressByRole(root, "tab", "연락");
  await waitForText(root, "인식에 실패한 장문 메시지가 있어요");
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

// 05 연락 D01·D02 목록 줄의 이름 (홈 카드와 섞이지 않게 목록 줄 힌트로 찾음)
const rowNames = (root: Instance) =>
  root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityHint === "눌러서 자세히 봐요"
    )
    .map(n => String(n.props.accessibilityLabel).split(", ")[0]);

const repliedTo = async (id: string) =>
  (await services.conversation.list()).find(i => i.conversation.id === id)
    ?.replied;

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

// 오늘의 도움 수준 저장 (기기 날짜 기준 오늘)
const setHelpMode = (mode: "pick" | "edit" | "write") => {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
  return services.storage.setItem(
    `${STORAGE_KEYS.homeHelp}.${USER_ID}`,
    JSON.stringify({ date, mode })
  );
};

const openDetail = async (name: string) => {
  const root = await openContacts();
  await openCard(root, name);
  await waitForText(root, "최근 연락");
  return root;
};

describe("05 연락 D03 상세·답장", () => {
  beforeEach(() => seed());

  test("1:1 질문: 입장 → 말투 → 후보 → 수정 → 바로 보내기 팝업, 보내면 토스트 + 목록으로", async () => {
    const root = await openDetail("민지");
    // 프로필 카드: 전화번호·생일(MM.DD), 요약, 장문 안내
    await waitForText(root, "010-1234-5678");
    expect(findText(root, "05.18").length).toBe(1);
    await waitForText(root, "민지가 이번 주말에 만날 수 있는지 물었어요.");
    // 목록(스택 아래)과 상세에 하나씩
    expect(findText(root, "인식에 실패한 장문 메시지가 있어요").length).toBe(2);

    await press(root, "답장 추천 받기");
    await waitForText(root, "어떻게 답하고 싶으세요?");
    expect(findText(root, "이번엔 어렵다고 전하고 싶어요.").length).toBe(1);
    await pressByRole(root, "radio", "거절");

    await waitForText(root, "어떤 말투로 전할까요?");
    // 말투 상자 설명 = 그 말투의 실제 답장
    expect(findText(root, "이번 주말은 어려울 것 같아.").length).toBe(1);
    await pressByRole(root, "radio", "짧게");

    await waitForText(root, "선택한 입장과 말투에 맞는 답장 3개가 준비됐어요.");
    expect(findText(root, "후보3").length).toBe(1);
    // 추천 선택(기본): 복사하기 / 수정하기
    expect(findText(root, "선택한 답장 복사하기").length).toBe(1);
    await press(root, "선택한 답장 수정하기");

    await waitForText(root, "추천 답장을 내 말로 다듬어보세요.");
    expect(inputValue(root, "답장 내용")).toBe("이번 주말은 어려울 것 같아.");
    await type(root, "답장 내용", "이번 주말은 어려워. 다음에 보자!");
    // 민지는 알림의 바로 답장이 되는 대화 → 바로 보내기 팝업 (자동 전송 없음)
    const sendReply = jest.spyOn(services.messenger, "sendReply");
    await press(root, "수정 완료");
    await waitForText(root, "수정한 답장을 지금 바로 보내볼까요?");
    expect(findText(root, "아래 버튼만 누르면 자동으로 답장이 보내져요.").length).toBe(1);
    expect(sendReply).not.toHaveBeenCalled();

    await press(root, "바로 보내기");
    await waitForText(root, "답장을 보냈어요");
    expect(sendReply).toHaveBeenCalledWith("minji", "이번 주말은 어려워. 다음에 보자!");
    await waitForNoText(root, "최근 연락");
    expect(await repliedTo("minji")).toBe(true);
  }, 15000);

  test("바로 답장이 안 되는 대화: 누르면 복사 + 메신저 열기 팝업, 연 뒤 보냈다고 표시하기", async () => {
    const root = await openDetail("하늘");
    const copyText = jest.spyOn(services.messenger, "copyText");
    const openApp = jest.spyOn(services.messenger, "openApp");
    await press(root, "답장 추천 받기");
    await waitForText(root, "어떤 말투로 전할까요?");
    await pressByRole(root, "radio", "다정하게");
    await waitForText(root, "선택한 답장 복사하기");
    await press(root, "선택한 답장 복사하기");

    await waitForText(root, "선택한 답장을 지금 보내볼까요?");
    expect(copyText).toHaveBeenCalledTimes(1);
    // "선택한" 팝업은 시안대로 설명 없음
    expect(
      root.findAll(
        n =>
          typeof n.type === "string" &&
          typeof n.props.children === "string" &&
          n.props.children.includes("메신저에 붙여넣어")
      ).length
    ).toBe(0);
    expect(findText(root, "보냈다고 표시하기").length).toBe(0);

    await press(root, "메신저 열기");
    await waitForNoText(root, "선택한 답장을 지금 보내볼까요?");
    // 가능하면 그 대화방을 바로 열도록 대화 id도 넘김 (#72)
    expect(openApp).toHaveBeenCalledWith("INSTAGRAM", "haneul");
    await press(root, "보냈다고 표시하기");
    await waitForNoText(root, "최근 연락");
    expect(await repliedTo("haneul")).toBe(true);
  });

  test("작성 완료 + 메신저 열기 팝업은 복사 안내 설명, 닫기는 그대로 둔다", async () => {
    await setHelpMode("write");
    services.messenger = createMockMessengerService({ directReplyIds: [] });
    const root = await openDetail("시우");
    await waitForText(root, "보낼 답장을 처음부터 직접 작성해보세요.");
    await type(root, "답장 내용", "ㅋㅋ 귀엽다");
    await press(root, "작성 완료");
    await waitForText(root, "작성한 답장을 지금 보내볼까요?");
    expect(
      findText(
        root,
        "작성한 답장이 복사가 됐어요.\n메신저에 붙여넣어 답장을 보낼 수 있어요."
      ).length
    ).toBe(1);
    await press(root, "닫기");
    await waitForNoText(root, "작성한 답장을 지금 보내볼까요?");
    expect(inputValue(root, "답장 내용")).toBe("ㅋㅋ 귀엽다");
    expect(findText(root, "보냈다고 표시하기").length).toBe(0);
  });

  test("바로 보내기가 실패하면 토스트로 알리고 상세에 남는다", async () => {
    services.messenger = createMockMessengerService({ failSend: true });
    const root = await openDetail("민지");
    await press(root, "답장 추천 받기");
    await pressByRole(root, "radio", "수락");
    await waitForText(root, "어떤 말투로 전할까요?");
    await pressByRole(root, "radio", "짧게");
    await waitForText(root, "선택한 답장 복사하기");
    await press(root, "선택한 답장 복사하기");
    await waitForText(root, "선택한 답장을 지금 바로 보내볼까요?");
    await press(root, "바로 보내기");
    await waitForText(root, "보내지 못했어요. 복사해서 메신저에서 보내 주세요");
    expect(findText(root, "최근 연락").length).toBe(1);
    expect(await repliedTo("minji")).toBeFalsy();
  }, 15000);

  test("뒤로가기는 답장 단계를 한 단계씩 되돌리고, 첫 단계에서 화면을 나간다", async () => {
    const root = await openDetail("민지");
    await press(root, "답장 추천 받기");
    await pressByRole(root, "radio", "수락");
    await waitForText(root, "어떤 말투로 전할까요?");
    await pressByRole(root, "radio", "다정하게");
    await waitForText(root, "선택한 답장 복사하기");

    await pressBack();
    await waitForText(root, "어떤 말투로 전할까요?");
    // 앱바 ←도 같은 동작
    await pressByRole(root, "button", "뒤로 가기");
    await waitForText(root, "어떻게 답하고 싶으세요?");
    await pressBack();
    await waitForText(root, "답장 추천 받기");
    await pressBack();
    await waitForNoText(root, "최근 연락");
  });

  test("입장이 필요 없는 안부는 바로 말투, 설명은 '선택한 말투에'", async () => {
    const root = await openDetail("하늘");
    // 연락처에 없는 친구
    await waitForText(root, "전화번호가 없어요");
    expect(findText(root, "?").length).toBe(1);
    await press(root, "답장 추천 받기");
    await waitForText(root, "어떤 말투로 전할까요?");
    await pressByRole(root, "radio", "다정하게");
    await waitForText(root, "선택한 말투에 맞는 답장 3개가 준비됐어요.");
  });

  test("도움 수준 '추천 수정'이면 후보 아래 버튼이 수정하기 / 직접 답장 쓰기", async () => {
    await setHelpMode("edit");
    const root = await openDetail("하늘");
    await press(root, "답장 추천 받기");
    await waitForText(root, "어떤 말투로 전할까요?");
    await pressByRole(root, "radio", "짧게");
    await waitForText(root, "직접 답장 쓰기");
    expect(findText(root, "선택한 답장 복사하기").length).toBe(0);
    await press(root, "직접 답장 쓰기");
    await waitForText(root, "보낼 답장을 처음부터 직접 작성해보세요.");
    expect(inputValue(root, "답장 내용")).toBe("");
  });

  test("도움 수준 '직접 쓰기'면 처음부터 직접 쓰기 상자, 비어 있으면 작성 완료를 못 누름", async () => {
    await setHelpMode("write");
    const root = await openDetail("시우");
    await waitForText(root, "보낼 답장을 처음부터 직접 작성해보세요.");
    expect(findText(root, "답장 추천 받기").length).toBe(0);
    expect(findText(root, "나중에 답하기").length).toBe(1);
    expect(isDisabled(root, "작성 완료")).toBe(true);
    await type(root, "답장 내용", "ㅋㅋ 귀엽다");
    expect(isDisabled(root, "작성 완료")).toBe(false);
    await pressByRole(root, "button", "답장 복사하기");
    await waitForText(root, "답장을 복사했어요");
  });

  test("답장 준비 실패: 다시 시도하기로 이어지고, 직접 답장 쓰기도 할 수 있다", async () => {
    const base = createMockConversationService({ latency: 50 });
    let fail = true;
    services.conversation = {
      ...base,
      getReplyCandidates: (...args) =>
        fail
          ? Promise.reject(new Error("AI 실패"))
          : base.getReplyCandidates(...args),
    };
    const root = await openDetail("하늘");
    await press(root, "답장 추천 받기");
    await waitForText(root, "다시 시도하기");
    expect(findText(root, "아직 말씨가 답장을 준비하고 있어요.").length).toBe(1);
    expect(findText(root, "직접 답장 쓰기").length).toBe(1);
    fail = false;
    await press(root, "다시 시도하기");
    await waitForText(root, "어떤 말투로 전할까요?");
  });

  test("답장 준비 미완료: 기다리는 동안 직접 답장 쓰기만", async () => {
    const base = createMockConversationService({ latency: 50 });
    services.conversation = {
      ...base,
      getReplyCandidates: () => new Promise(() => {}),
    };
    const root = await openDetail("하늘");
    await press(root, "답장 추천 받기");
    await waitForText(root, "아직 말씨가 답장을 준비하고 있어요.");
    expect(findText(root, "다시 시도하기").length).toBe(0);
    await press(root, "직접 답장 쓰기");
    await waitForText(root, "보낼 답장을 처음부터 직접 작성해보세요.");
  });

  test("원문 확인하기를 누르면 받은 메시지를 펼친다", async () => {
    const root = await openDetail("준호");
    expect(findText(root, "생일 축하해! 잘 지내지?").length).toBe(0);
    await pressByRole(root, "button", "요약 원문 확인하기");
    await waitForText(root, "생일 축하해! 잘 지내지?");
  });

  test("D05 단체방: 전체 대화·나를 언급한 내용·답장 필요, 답장은 1:1과 같은 흐름", async () => {
    const root = await openDetail("2026 봄학기 오픈소스 프로젝트 PING 운영진 방");
    expect(findText(root, "전체 대화").length).toBe(1);
    expect(findText(root, "나를 언급한 내용").length).toBe(1);
    expect(findText(root, "직접 질문 건").length).toBe(1);
    // 단체방은 전화번호·생일 줄 없음, 관계 칩 "직장"
    expect(findText(root, "전화번호가 없어요").length).toBe(0);
    expect(findText(root, "직장").length).toBe(1);

    await pressByRole(root, "button", "나를 언급한 내용 원문 확인하기");
    await waitForText(root, "@말씨 다음 주 발표 자료 금요일까지 올려줄 수 있어?");

    await press(root, "답장 필요 건에 답장하기");
    await waitForText(root, "어떻게 답하고 싶으세요?");
  });

  test("D05 언급이 없는 단체방: '나를 언급한 질문은 없어요', 답장 필요 구역 없음", async () => {
    const root = await openDetail("대학교 친구들");
    await waitForText(root, "나를 언급한 질문은 없어요");
    expect(findText(root, "답장 필요").length).toBe(0);
    expect(findText(root, "답장 추천 받기").length).toBe(1);
  });

  test("관계 탭: 관계를 저장하면 토스트, 목록 꼭 챙길 연락에 반영", async () => {
    const root = await openDetail("하늘");
    await pressByRole(root, "tab", "관계");
    await waitForText(root, "관계 종류");
    await pressByRole(root, "radio", "직장");
    await type(root, "관계 설명", "같은 팀 동료예요.");
    await press(root, "저장하기");
    await waitForText(root, "관계 정보를 저장했어요");

    await pressBack();
    await waitForNoText(root, "최근 연락");
    await pressByRole(root, "tab", "꼭 챙길 연락");
    await waitUntil(() => rowNames(root).includes("하늘"), "하늘이 꼭 챙길 연락에");
  });

  test("관련 일정 탭은 빈 상태만 (일정 추가 없음)", async () => {
    const root = await openDetail("준호");
    await pressByRole(root, "tab", "관련 일정");
    await waitForText(root, "아직 연결된 일정이 없어요");
    expect(findText(root, "아직 지난 일정이 없어요").length).toBe(1);
    expect(findText(root, "일정 추가").length).toBe(0);
  });

  test("나중에 답하기 시트: 기본 내일, 1주일 뒤로 미루면 상세에 남고 토스트, 미뤄둔 답장 탭에 보인다", async () => {
    const root = await openDetail("준호");
    await press(root, "나중에 답하기");
    await waitForText(root, "언제 다시 알려드릴까요?");
    expect(findText(root, "선택한 시간에 이 연락을 다시 알려드릴게요").length).toBe(1);
    expect(findText(root, "내일 다시 알려주기").length).toBe(1);
    await press(root, "취소");
    await waitForNoText(root, "언제 다시 알려드릴까요?");

    await press(root, "나중에 답하기");
    await waitForText(root, "언제 다시 알려드릴까요?");
    await pressByRole(root, "radio", "1주일 뒤");
    await press(root, "1주일 뒤 다시 알려주기");
    const at = deferRemindAt("in1week");
    await waitForText(
      root,
      `${at.getMonth() + 1}월 ${at.getDate()}일 오전 9시에 다시 알려드릴게요`
    );
    // 시안대로 상세에 남음
    expect(findText(root, "언제 다시 알려드릴까요?").length).toBe(0);
    expect(findText(root, "답장 추천 받기").length).toBe(1);

    await pressBack();
    await waitForNoText(root, "최근 연락");
    await pressByRole(root, "tab", "미뤄둔 답장");
    await waitForText(root, "7일 뒤 다시 보기");
    expect(rowNames(root)).toEqual(["준호"]);
  });

  test("날짜와 시간 직접 선택: 취소하면 첫 시트로, 고른 시간으로 미루면 날짜로 토스트", async () => {
    const root = await openDetail("준호");
    await press(root, "나중에 답하기");
    await waitForText(root, "언제 다시 알려드릴까요?");
    await pressByRole(root, "button", "날짜와 시간 직접 선택");
    await waitForText(root, "날짜와 시간을 선택해 주세요");
    // 처음 값은 고른 칩(내일 오전 9시)
    const tomorrow = deferRemindAt("tomorrow");
    const day = `${tomorrow.getMonth() + 1}월 ${tomorrow.getDate()}일`;
    expect(findText(root, `${day} 오전 9시에 다시 알려주기`).length).toBe(1);
    await press(root, "취소");
    await waitForText(root, "언제 다시 알려드릴까요?");

    await pressByRole(root, "button", "날짜와 시간 직접 선택");
    await waitForText(root, "날짜와 시간을 선택해 주세요");
    await pressByRole(root, "radio", "오후 6시");
    await press(root, `${day} 오후 6시에 다시 알려주기`);
    // 직접 고른 날짜는 "내일" 대신 날짜로 (시안 "설정 완료")
    await waitForText(root, `${day} 오후 6시에 다시 알려드릴게요`);
    const deferred = (await services.conversation.list()).find(
      i => i.conversation.id === "junho"
    )?.deferred;
    expect(new Date(deferred!.remindAt!).getHours()).toBe(18);
  });

  test("D04 상세 장문 안내: 그 대화만 2단계부터, 붙여넣기 → 확인 완료하면 상세로 돌아와 요약이 바뀐다", async () => {
    const root = await openDetail("민지");
    await press(root, "인식에 실패한 장문 메시지가 있어요");
    await waitForText(root, "인식에 실패한 장문 메시지 1건 중 1번째 건을 보완해요");
    expect(findText(root, "보완 시작하기").length).toBe(0);
    expect(findText(root, "확인된 내용").length).toBe(1);
    // 시안에 없지만 남긴 작은 텍스트 버튼 (#72)
    expect(findText(root, "카카오톡 열어서 복사하기").length).toBe(1);
    expect(isDisabled(root, "확인 완료")).toBe(true);

    await press(root, "붙여넣기");
    await waitForText(root, "붙여넣기 성공!");
    expect(inputValue(root, "전체 내용")).toBe(MOCK_CLIPBOARD_TEXT);
    // 빈 상자 글자 수는 실제 글자 수
    expect(findText(root, `${MOCK_CLIPBOARD_TEXT.length}/500`).length).toBe(1);

    await press(root, "확인 완료");
    await waitForText(root, "긴 메시지를 모두 보완했어요");
    await waitForText(root, "최근 연락");
    await waitForText(
      root,
      `붙여 넣은 내용을 정리했어요: ${MOCK_CLIPBOARD_TEXT.slice(0, 60)}…`
    );
    // 보완했으니 상세의 장문 안내는 사라짐 (목록 것만 남음)
    expect(findText(root, "인식에 실패한 장문 메시지가 있어요").length).toBe(1);
  });

  test("D04 클립보드가 비어 있으면 토스트, 정리에 실패하면 그 메시지에 머문다", async () => {
    services.messenger = createMockMessengerService({ clipboard: "" });
    const base = createMockConversationService({ latency: 50 });
    services.conversation = {
      ...base,
      summarizePasted: () => Promise.reject(new Error("실패")),
    };
    const root = await openDetail("민지");
    await press(root, "인식에 실패한 장문 메시지가 있어요");
    await waitForText(root, "확인된 내용");
    await press(root, "붙여넣기");
    await waitForText(root, "복사한 내용이 없어요. 메신저에서 먼저 복사해 주세요");
    expect(inputValue(root, "전체 내용")).toBe("");

    await type(root, "전체 내용", "직접 붙여 넣은 긴 메시지");
    await press(root, "확인 완료");
    await waitForText(root, "정리하지 못했어요. 다시 시도해 주세요");
    expect(inputValue(root, "전체 내용")).toBe("직접 붙여 넣은 긴 메시지");
    expect(findText(root, "확인된 내용").length).toBe(1);
  });
});

describe("05 연락 D01 목록·D02 분석 대화방 관리", () => {
  beforeEach(() => seed());

  test("꼭 챙길 연락 탭은 별 친구·직장·경조사만, 이름 앞에 꼭 챙길 연락 표시", async () => {
    const root = await openContacts();
    expect(rowNames(root)).toContain("하늘");
    const label = (name: string) =>
      root.find(
        n =>
          typeof n.type === "string" &&
          n.props.accessibilityHint === "눌러서 자세히 봐요" &&
          String(n.props.accessibilityLabel).startsWith(`${name}, `)
      ).props.accessibilityLabel as string;
    expect(label("민지")).toContain("꼭 챙길 연락");
    expect(label("하늘")).not.toContain("꼭 챙길 연락");
    await pressByRole(root, "tab", "꼭 챙길 연락");
    await waitUntil(() => !rowNames(root).includes("하늘"), "꼭 챙길 연락만");
    expect([...rowNames(root)].sort()).toEqual(
      ["2026 봄학기 오픈소스 프로젝트 PING 운영진 방", "김서연 선배", "민지"].sort()
    );
  });

  test("관계 필터는 하나만 고르고, 고른 관계 이름이 필터에 보인다", async () => {
    const root = await openContacts();
    expect(findText(root, "관계").length).toBe(1);
    await pressByRole(root, "button", "관계 필터, 전체");
    await pressByRole(root, "menuitem", "가족");
    await waitForText(root, "가족");
    expect(findText(root, "관계").length).toBe(0);
    expect(rowNames(root)).toEqual(["준호"]);

    await pressByRole(root, "button", "관계 필터, 가족");
    await pressByRole(root, "menuitem", "전체");
    await waitForText(root, "관계");
    expect(rowNames(root)).toContain("하늘");
  });

  test("D04 목록 장문 안내: 모든 잘린 메시지를 시작 화면부터, 확인 완료하면 다음 씨앗·다음 메시지로", async () => {
    const root = await openContacts();
    await press(root, "인식에 실패한 장문 메시지가 있어요");
    await waitForText(root, "인식에 실패한 장문 메시지가 5건 있어요");
    const progress = () =>
      root.find(
        n => typeof n.type === "string" && n.props.accessibilityRole === "progressbar"
      ).props.accessibilityValue;
    expect(progress()).toEqual({ min: 0, max: 5, now: 0 });

    await press(root, "보완 시작하기");
    await waitForText(root, "인식에 실패한 장문 메시지 5건 중 1번째 건을 보완해요");
    expect(progress()).toEqual({ min: 0, max: 5, now: 1 });
    // 최근 순: 민지(1시간 전) → 마음숲 상담센터(3시간 전)
    expect(findText(root, "민지").length).toBeGreaterThan(0);

    await type(root, "전체 내용", "민지의 긴 메시지 전체");
    await press(root, "확인 완료");
    await waitForText(root, "인식에 실패한 장문 메시지 5건 중 2번째 건을 보완해요");
    expect(progress()).toEqual({ min: 0, max: 5, now: 2 });
    expect(findText(root, "마음숲 상담센터").length).toBeGreaterThan(0);
    expect(inputValue(root, "전체 내용")).toBe("");
    expect(findText(root, "문자 메신저 열어서 복사하기").length).toBe(1);
  });

  test("D04 홈 빠른 기능 '긴 메시지 붙여넣기'로도 연다", async () => {
    const root = await renderApp();
    // 홈 내용(연락)을 불러온 뒤 빠른 기능이 보임
    await waitForText(root, "빠른 기능");
    await pressByRole(root, "button", "긴 메시지 붙여넣기");
    await waitForText(root, "인식에 실패한 장문 메시지가 5건 있어요");
  });

  test("D04 잘린 메시지가 없으면 안내 상자만", async () => {
    services.conversation = createMockConversationService({ empty: true });
    const root = await renderApp();
    await waitForText(root, "아직 모인 연락이 없어요");
    await pressByRole(root, "button", "긴 메시지 붙여넣기");
    await waitForText(root, "지금은 보완할 메시지가 없어요");
    expect(findText(root, "보완 시작하기").length).toBe(0);
  });

  test("상태 바꾸기는 홈과 같은 도움 수준 화면을 연다", async () => {
    const root = await openContacts();
    await press(root, "상태 바꾸기");
    await waitForText(root, "오늘은 어느 정도 도움이 필요하세요?");
  });

  test("D02: 분석을 끈 대화방은 저장하면 목록에서 빠지고, 전체 선택·해제가 바뀐다", async () => {
    const root = await openContacts();
    await pressByRole(root, "button", "분석 대화방 관리");
    await waitForText(root, "변경 사항 저장하기");

    const checked = () =>
      root
        .findAll(
          n =>
            typeof n.type === "string" &&
            n.props.accessibilityRole === "checkbox" &&
            typeof n.props.onPress === "function"
        )
        .map(n => n.props.accessibilityState.checked);

    // 처음엔 모두 분석 중 → "전체 해제"
    expect(checked().every(Boolean)).toBe(true);
    expect(findText(root, "전체 해제").length).toBe(1);
    await press(root, "전체 해제");
    expect(checked().some(Boolean)).toBe(false);
    await press(root, "전체 선택");
    expect(checked().every(Boolean)).toBe(true);

    await pressByRole(root, "checkbox", "하늘");
    expect(findText(root, "전체 선택").length).toBe(1);
    await press(root, "변경 사항 저장하기");
    await waitForText(root, "저장했어요");
    await waitForNoText(root, "변경 사항 저장하기");
    await waitUntil(() => !rowNames(root).includes("하늘"), "하늘 빠짐");
    expect(rowNames(root)).toContain("민지");
  });

  test("D02: 저장하지 않고 뒤로가면 바뀌지 않는다", async () => {
    const root = await openContacts();
    await pressByRole(root, "button", "분석 대화방 관리");
    await waitForText(root, "변경 사항 저장하기");
    await pressByRole(root, "checkbox", "하늘");
    await pressBack();
    await waitForNoText(root, "변경 사항 저장하기");
    expect(rowNames(root)).toContain("하늘");
    expect(await services.conversation.getAnalysisOffIds()).toEqual([]);
  });
});

describe("나중에 답하기 시각", () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 27, h, m);

  test("오늘 저녁은 오후 6시, 나머지는 오전 9시", () => {
    expect(deferRemindAt("tonight", at(10))).toEqual(at(18));
    expect(deferRemindAt("tomorrow", at(10))).toEqual(new Date(2026, 10, 28, 9));
    expect(deferRemindAt("in3days", at(10))).toEqual(new Date(2026, 10, 30, 9));
    // 달이 넘어가도
    expect(deferRemindAt("in1week", at(10))).toEqual(new Date(2026, 11, 4, 9));
  });

  test("오후 6시가 지나면 오늘 저녁은 고를 수 없다", () => {
    expect(isDeferOptionAvailable("tonight", at(17, 59))).toBe(true);
    expect(isDeferOptionAvailable("tonight", at(18))).toBe(false);
    expect(isDeferOptionAvailable("tomorrow", at(23))).toBe(true);
  });

  test("토스트 문구: 오늘·내일은 말로, 나머지와 직접 선택은 날짜로", () => {
    expect(formatDeferAt(at(18), "tonight")).toBe("오늘 오후 6시");
    expect(formatDeferAt(new Date(2026, 10, 28, 9), "tomorrow")).toBe("내일 오전 9시");
    expect(formatDeferAt(new Date(2026, 10, 30, 9), "in3days")).toBe("11월 30일 오전 9시");
    expect(formatDeferAt(new Date(2026, 10, 28, 18))).toBe("11월 28일 오후 6시");
    expect(deferButtonLabel("in1week")).toBe("1주일 뒤 다시 알려주기");
  });
});

describe("오류·빈 상태", () => {
  test("목록을 불러오지 못하면 다시 불러오기를 보여 준다", async () => {
    await seed();
    services.conversation = createMockConversationService({ failList: true });
    const root = await renderApp();
    await waitForTabs(root);
    await pressByRole(root, "tab", "연락");
    await waitForText(root, "연락을 불러오지 못했어요");
    expect(findText(root, "다시 불러오기").length).toBeGreaterThan(0);
  });

  test("연락이 없으면 빈 상태 안내", async () => {
    await seed();
    services.conversation = createMockConversationService({ empty: true });
    const root = await renderApp();
    await waitForTabs(root);
    await pressByRole(root, "tab", "연락");
    await waitForText(root, "아직 모인 연락이 없어요");
  });
});
