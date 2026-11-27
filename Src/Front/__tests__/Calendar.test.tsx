import ReactTestRenderer from "react-test-renderer";
import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { createMockConversationService } from "../src/services/conversation/mockConversationService";
import { createMockFriendService } from "../src/services/friend/mockFriendService";
import { CALENDAR_STORAGE_KEYS } from "../src/services/calendar/CalendarService";
import { services, STORAGE_KEYS, type EventInput } from "../src/services";
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

// 07 캘린더 (#80): F01 월 화면 · F03 새 일정 추가 · F02 일정 상세·수정·삭제 · 홈 다가오는 일정
// 오늘을 2026-11-22(일) 오전 10시로 고정 (Date만 가짜, 타이머는 진짜)
const USER_ID = "mock-user-demo";
const TODAY = new Date(2026, 10, 22, 10);

jest.setTimeout(20000);

beforeEach(async () => {
  jest.useFakeTimers({
    now: TODAY,
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
  });
  const login = await services.auth.login(
    MOCK_DEMO_ACCOUNT.loginId,
    MOCK_DEMO_ACCOUNT.password
  );
  services.tokens.set(login.tokens);
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
  );
  // 일정은 사용자별 저장소(user.{id}.calendar.*)에 있음 → 테스트마다 비움
  await Promise.all(
    Object.values(CALENDAR_STORAGE_KEYS).map(key =>
      services.storage.removeItem(`user.${USER_ID}.${key}`)
    )
  );
  services.conversation = createMockConversationService({ latency: 20 });
  services.friends = createMockFriendService({ latency: 20 });
});

afterEach(() => {
  jest.useRealTimers();
});

const start = async () => {
  const root = await renderApp();
  await waitUntil(
    () => root.findAll(n => n.props.accessibilityRole === "tab").length > 0,
    "탭바 표시"
  );
  return root;
};

// 로그인(사용자 지정)이 끝난 뒤에만 사용자별 저장소에 쓸 수 있음
const addEvent = (input: Partial<EventInput> & { title: string }) =>
  ReactTestRenderer.act(async () => {
    await services.calendar.add({
      date: new Date(2026, 10, 22, 13).toISOString(),
      people: [],
      ...input,
    });
  });

const openCalendar = async (root: Instance) => {
  await pressByRole(root, "tab", "캘린더");
  await waitForText(root, "11월 22일 일요일");
};

const dayButton = (root: Instance, label: string) =>
  root.find(
    n =>
      n.props.accessibilityRole === "button" &&
      typeof n.props.onPress === "function" &&
      String(n.props.accessibilityLabel).startsWith(label)
  );

describe("07 캘린더 F01", () => {
  test("첫 화면은 오늘 선택, 그날 일정·다가오는 일정(친구 생일 포함)과 날짜 아래 점", async () => {
    const root = await start();
    await addEvent({ title: "박하늘 결혼식", place: "남산 예식장" });
    await addEvent({
      title: "박소현 청모",
      date: new Date(2026, 10, 29, 13).toISOString(),
    });
    await openCalendar(root);

    await waitForText(root, "박하늘 결혼식");
    expect(findText(root, "일요일 오후 1시 남산 예식장").length).toBe(1);
    expect(findText(root, "다가오는 일정").length).toBeGreaterThan(0);
    expect(findText(root, "박소현 청모").length).toBeGreaterThan(0);
    // mock 친구 김서연 선배 생일 12-03 → 다가오는 일정, 설명은 "생일"
    expect(findText(root, "김서연 선배 생일").length).toBeGreaterThan(0);

    // 일정이 있는 날은 라벨에 "일정 있음" (점)
    expect(dayButton(root, "2026년 11월 29일").props.accessibilityLabel).toContain(
      "일정 있음"
    );
    expect(dayButton(root, "2026년 11월 23일").props.accessibilityLabel).not.toContain(
      "일정 있음"
    );

    // 다른 날을 고르면 빈 상태 문구
    await pressByRole(root, "button", "2026년 11월 23일 월요일");
    await waitForText(root, "11월 23일 월요일");
    expect(
      findText(root, "아직 일정이 없어요.\n오른쪽 아래 + 버튼으로 일정을 추가해 보세요.")
        .length
    ).toBe(1);
  });

  test("+ 버튼 → 새 일정 추가: 날짜·인원 고르고 추가하면 토스트와 함께 그날에 보인다", async () => {
    const root = await start();
    await openCalendar(root);
    await pressByRole(root, "button", "새 일정 추가");
    await waitForText(root, "추가하기");
    expect(findText(root, "날짜 및 시간을 선택해 주세요").length).toBe(1);

    await type(root, "일정 제목", "스터디 모임");
    // 날짜: 고른 날(오늘) 오후 1시로 시작
    await pressByRole(root, "button", "날짜 및 시간 선택");
    await waitForText(root, "11월 22일 일요일 오후 1시 선택하기");
    await press(root, "11월 22일 일요일 오후 1시 선택하기");
    await waitForText(root, "2026.11.22 오후 1시");

    // 인원: 기기 연락(1:1)에서 고름
    await pressByRole(root, "button", "인원 선택");
    await waitForText(root, "인원 설정");
    await type(root, "인원 검색", "민");
    await waitUntil(
      () =>
        root.findAll(
          n =>
            n.props.accessibilityRole === "checkbox" &&
            String(n.props.accessibilityLabel).startsWith("민지")
        ).length > 0,
      "검색 결과 민지"
    );
    await pressByRole(root, "checkbox", "민지, 민지가 이번 주말에 만날 수 있는지 물었어요.");
    await press(root, "선택하기");
    await waitForText(root, "@민지");

    await press(root, "추가하기");
    await waitForText(root, "일정을 등록했어요");
    await waitForText(root, "스터디 모임");
    const saved = await services.calendar.list();
    expect(saved.find(e => e.title === "스터디 모임")).toMatchObject({
      kind: "other",
      people: [{ id: "minji", name: "민지" }],
    });
  });
});

describe("07 캘린더 F02 일정 상세", () => {
  test("수정하기 → 저장, 일정 삭제는 확인 팝업을 거쳐 지운다", async () => {
    const root = await start();
    await addEvent({ title: "박하늘 결혼식", place: "신라호텔 영빈관" });
    await openCalendar(root);
    await waitForText(root, "박하늘 결혼식");
    await pressByRole(root, "button", "11월 22일 박하늘 결혼식, 일요일 오후 1시 신라호텔 영빈관");

    await waitForText(root, "일정 상세");
    expect(findText(root, "2026.11.22 오후 1시").length).toBe(1);
    // 직접 추가한 일정은 원문이 없어 답장 보내기·원문 연락 버튼 없음
    expect(findText(root, "답장 보내기").length).toBe(0);
    expect(findText(root, "일정 삭제").length).toBe(0);

    await press(root, "수정하기");
    await waitForText(root, "저장하기");
    await type(root, "일정 제목", "박하늘 결혼식 (2부)");
    await press(root, "저장하기");
    await waitForText(root, "일정을 저장했어요");
    const mine = (await services.calendar.list()).filter(e => !e.readOnly);
    expect(mine.map(e => e.title)).toEqual(["박하늘 결혼식 (2부)"]);

    // 수정 중 뒤로가기는 보기로 돌아감
    await press(root, "수정하기");
    await waitForText(root, "일정 삭제");
    await pressBack();
    await waitForNoText(root, "일정 삭제");
    expect(findText(root, "일정 상세").length).toBe(1);

    await press(root, "수정하기");
    await press(root, "일정 삭제");
    await waitForText(root, "이 일정을 지울까요?");
    await press(root, "지우기");
    await waitForText(root, "일정을 지웠어요");
    await waitForNoText(root, "일정 상세");
    expect(await services.calendar.list()).not.toContainEqual(
      expect.objectContaining({ title: "박하늘 결혼식 (2부)" })
    );
  });

  test("메시지에서 찾은 일정은 원문 연락으로 가고, 친구 생일은 고칠 수 없다", async () => {
    const root = await start();
    await addEvent({
      title: "민지 모임",
      source: { conversationId: "minji", messageId: "minji-m1" },
    });
    await openCalendar(root);
    await waitForText(root, "민지 모임");
    await pressByRole(root, "button", "11월 22일 민지 모임, 일요일 오후 1시");
    await waitForText(root, "답장 보내기");
    await press(root, "원문 연락 확인하러 가기");
    await waitForText(root, "민지와의 연락");

    await pressBack();
    await waitForText(root, "일정 상세");
    await pressBack();
    await waitForText(root, "김서연 선배 생일");
    await pressByRole(root, "button", "12월 3일 김서연 선배 생일, 생일");
    await waitForText(root, "일정 상세");
    expect(findText(root, "수정하기").length).toBe(0);
  });
});

describe("04 홈 다가오는 일정", () => {
  test("캘린더에 저장한 일정이 홈에도 보인다", async () => {
    const root = await start();
    await addEvent({
      title: "박소현 청모",
      date: new Date(2026, 10, 29, 13).toISOString(),
    });
    // 홈은 화면에 올 때 다시 읽음 → 다른 탭에 갔다 오기
    await openCalendar(root);
    await pressByRole(root, "tab", "홈");
    await waitForText(root, "박소현 청모");
  });
});
