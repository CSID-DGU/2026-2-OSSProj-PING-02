import ReactTestRenderer from "react-test-renderer";
import { createMockPermissionService } from "../src/services/permission/mockPermissionService";
import { services, STORAGE_KEYS } from "../src/services";
import { resolveSavedStep } from "../src/constants/onboarding";
import {
  findText,
  press,
  pressBack,
  pressByRole,
  renderApp,
  toggle,
  type,
  waitForNoText,
  waitForRequestDone,
  waitForText,
  type Instance,
} from "../test-utils/app";

// 온보딩 흐름 테스트
// - 기본(권한 허용) 흐름: 단계마다 안드로이드 뒤로가기 → 이전 단계, 다시 앞으로
// - 거부 흐름: services/index.ts의 개발 옵션("deny")과 같은 mock으로 따로 확인
const USER_ID = "mock-user-demo";

// 진행 상황을 지우고 권한 mock을 새로 만듦 (테스트끼리 영향 없게. 저장 토큰은 test-utils가 비움)
const reset = async (scenario: "allow" | "deny") => {
  await services.storage.removeItem(`${STORAGE_KEYS.onboarding}.${USER_ID}`);
  services.permission = createMockPermissionService(scenario);
};

const login = async (root: Instance) => {
  await press(root, "시작하기");
  await press(root, "로그인");
  await type(root, "아이디", "malssiat");
  await type(root, "비밀번호", "abcd1234");
  await press(root, "로그인");
};

const TITLE = {
  intro1: "작은 한마디가,\n다시 이어질 씨앗이 되도록",
  intro5: "내 생활을 담아,\n내 말처럼",
  privacy: "원문은 기기에,\nAI에는 가린 내용만",
  access: "알림에 온 연락을\n함께 살펴볼게요",
  apps: "도움을 받을 앱을 선택해요",
  types: "받을 알림을\n선택해 주세요",
  contacts: "연락처로 친구 목록을\n만들어볼까요?",
  select: "친구로 추가할 연락처를\n선택해요",
  friends: "친구 목록을\n준비했어요",
  memory: "내 상황을 조금\n알려주실래요?",
  done: "이제 준비가\n모두 끝났어요",
};

// 11-1 건너뛰기 확인 시트
const SKIP_SHEET = "작성하지 않고 넘어갈까요?";

// 11에서 건너뛰기 → 시트의 건너뛰기 (시트 버튼이 화면 버튼보다 뒤에 있어 press가 시트 것을 누름)
const skipMemory = async (root: Instance) => {
  await press(root, "건너뛰기");
  await waitForText(root, SKIP_SHEET);
  await press(root, "건너뛰기");
};

// 06 스위치 줄의 켜짐 상태 (스택 아래 화면 것 말고 맨 위 화면 것)
const switchOn = (root: Instance, title: string) =>
  root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityRole === "switch" &&
        String(n.props.accessibilityLabel).startsWith(title)
    )
    .at(-1)?.props.accessibilityState?.checked;

// 지금 단계에서 안드로이드 뒤로가기 → 이전 단계로 돌아가고(지금 단계는 사라짐),
// 이전 단계의 버튼으로 다시 지금 단계에 옴
const checkBack = async (
  root: Instance,
  current: string,
  previous: string,
  forward: () => Promise<void>
) => {
  await pressBack();
  await waitForNoText(root, current);
  expect(findText(root, previous).length).toBeGreaterThan(0);
  await forward();
  await waitForText(root, current);
};

// 글자가 text인 버튼이 비활성인지 (맨 위 화면 것)
const isDisabledButton = (root: Instance, text: string) =>
  root
    .findAll(
      n =>
        n.props.accessibilityRole === "button" &&
        typeof n.props.onPress === "function" &&
        findText(n, text).length > 0
    )
    .map(n => n.props.accessibilityState?.disabled ?? n.props.disabled)
    .at(-1);

beforeEach(() => reset("allow"));

test("없어진 단계(AI 모델·배터리)가 저장돼 있으면 그다음 단계부터 이어서 한다", () => {
  expect(resolveSavedStep("ModelDownload")).toBe("NotificationTypes");
  expect(resolveSavedStep("BatteryOptimization")).toBe("ContactsImport");
  expect(resolveSavedStep("AiMemory")).toBe("AiMemory");
  expect(resolveSavedStep("없는단계")).toBe("ServiceIntro");
  expect(resolveSavedStep(undefined)).toBe("ServiceIntro");
});

test("이어서 하기: AI 모델 단계에서 멈췄던 사용자는 06 받을 알림부터", async () => {
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: false, lastStep: "ModelDownload" })
  );
  const root = await renderApp();
  await login(root);
  await waitForText(root, TITLE.types);
});

test("06: 알림을 모두 끄면 권한을 묻지 않고 07로 간다", async () => {
  await reset("deny");
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: false, lastStep: "NotificationTypes" })
  );
  const request = jest.spyOn(services.permission, "request");
  const root = await renderApp();
  await login(root);
  await waitForText(root, TITLE.types);
  await pressByRole(root, "switch", "전체 알림");
  await press(root, "확인했어요");
  await waitForText(root, TITLE.contacts);
  expect(request).not.toHaveBeenCalledWith("postNotifications");
  request.mockRestore();
});

test("08 불러오는 중 → 09: 검색은 목록만 거르고 전체 선택은 전체 기준, 0명이면 저장 비활성 + 건너뛰기", async () => {
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: false, lastStep: "ContactsSelect" })
  );
  const root = await renderApp();
  await login(root);
  // 08 진행 막대 → 다 받으면 09
  await waitForText(root, "연락처를 불러오고 있어요");
  expect(
    root.findAll(n => n.props.accessibilityRole === "progressbar").length
  ).toBeGreaterThan(0);
  await waitForText(root, TITLE.select);
  expect(findText(root, "42명").length).toBe(1);
  await waitForText(root, "42명 친구로 저장하기");

  // 검색: 목록만 거름, 결과가 없으면 한 줄 안내
  await type(root, "연락처 검색", "없는이름");
  await waitForText(root, "검색 결과가 없어요");
  // 전체 선택은 검색과 상관없이 전체 연락처 기준 → 모두 해제
  await pressByRole(root, "checkbox", "전체 선택, 연락처 42명 중 42명 선택됨");
  await waitForText(root, "0명 친구로 저장하기");
  expect(isDisabledButton(root, "0명 친구로 저장하기")).toBe(true);

  // 0명이면 건너뛰기 → 11
  await press(root, "건너뛰기");
  await waitForText(root, TITLE.memory);
});

test("08: 연락처를 못 불러오면 이 화면에서 다시 불러오기", async () => {
  const original = services.contacts;
  let fail = true;
  services.contacts = {
    getAll: async () => {
      if (fail) throw new Error("읽기 실패");
      return original.getAll();
    },
  };
  try {
    await services.storage.setItem(
      `${STORAGE_KEYS.onboarding}.${USER_ID}`,
      JSON.stringify({ completed: false, lastStep: "ContactsSelect" })
    );
    const root = await renderApp();
    await login(root);
    await waitForText(root, "연락처를 불러오지 못했어요");
    fail = false;
    await press(root, "다시 불러오기");
    await waitForText(root, TITLE.select);
  } finally {
    services.contacts = original;
  }
});

test("11: 비어 있으면 저장하기도 확인 시트, 쓰고 칩을 고르면 저장하고 12로", async () => {
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: false, lastStep: "AiMemory" })
  );
  const root = await renderApp();
  await login(root);
  await waitForText(root, TITLE.memory);

  // 비어 있을 때 저장하기 → 11-1 시트
  await press(root, "저장하기");
  await waitForText(root, SKIP_SHEET);
  await press(root, "계속 작성하기");
  await waitForNoText(root, SKIP_SHEET);

  // 내 상황 입력 + 칩 두 개 + 직접 입력
  const inputs = (label: string) =>
    root.findAll(
      n =>
        typeof n.type === "string" &&
        !!n.props.onChangeText &&
        n.props.accessibilityLabel === label
    );
  const input = (label: string) => inputs(label).at(-1)!;
  // 칩: 바깥 View는 스크린리더용 버튼, 실제 누르는 곳은 안쪽 ChoiceGroup 항목
  const chip = (label: string) => pressByRole(root, "radio", label);
  await ReactTestRenderer.act(async () =>
    input("답장에 사용해도 되는 내 상황").props.onChangeText("시험 준비 중이에요")
  );
  await chip("건강");
  await chip("취업");
  await chip("건강"); // 다시 누르면 빠짐
  expect(inputs("먼저 꺼내지 않을 이야기 직접 입력")).toHaveLength(0);
  await chip("직접 입력");
  await ReactTestRenderer.act(async () =>
    input("먼저 꺼내지 않을 이야기 직접 입력").props.onChangeText("이사 이야기")
  );
  await press(root, "저장하기");
  await waitForText(root, TITLE.done);

  const saved = JSON.parse(
    (await services.storage.getItem(`${STORAGE_KEYS.onboarding}.${USER_ID}`))!
  );
  expect(saved.memory).toEqual({
    status: "시험 준비 중이에요",
    avoid: "이사 이야기",
    avoidTopics: ["취업"],
  });
});

test("기본(허용): Figma 순서대로 진행하고, 단계마다 뒤로가기는 이전 단계로 간다", async () => {
  const root = await renderApp();
  await login(root);

  // 02 서비스 소개: 쪽 안에서는 이전 쪽으로, 첫 쪽에서는 쉬어 가기 팝업 → 팝업만 닫힘
  await waitForText(root, TITLE.intro1);
  await press(root, "다음");
  const dots = (n: number) =>
    root.findAll(
      node =>
        typeof node.type === "string" &&
        node.props.accessibilityLabel === `서비스 소개 5쪽 중 ${n}쪽`
    ).length;
  expect(dots(2)).toBe(1);
  await pressBack();
  expect(dots(1)).toBe(1);
  await pressBack();
  await waitForText(root, "여기서 잠시 쉬어 갈까요?");
  // 팝업이 열린 상태의 뒤로가기는 팝업만 닫음
  // (실기기에서는 Modal이 뒤로가기를 네이티브로 먼저 받아 onRequestClose를 부름)
  const modal = root
    .findAll(n => n.props.visible === true && !!n.props.onRequestClose)
    .at(-1)!;
  await ReactTestRenderer.act(async () => {
    modal.props.onRequestClose();
  });
  await waitForNoText(root, "여기서 잠시 쉬어 갈까요?");
  expect(findText(root, TITLE.intro1).length).toBe(1);
  for (let i = 0; i < 5; i += 1) await press(root, "다음");

  // 03 → 뒤로가기면 02 마지막 쪽
  await waitForText(root, TITLE.privacy);
  await checkBack(root, TITLE.privacy, TITLE.intro5, () => press(root, "다음"));

  // 헤더의 뒤로가기 화살표도 안드로이드 뒤로가기와 같음
  await pressByRole(root, "button", "뒤로 가기");
  await waitForNoText(root, TITLE.privacy);
  await press(root, "다음");
  await waitForText(root, TITLE.privacy);
  await press(root, "확인했어요");

  // 04 알림 접근 (허용)
  await waitForText(root, TITLE.access);
  await checkBack(root, TITLE.access, TITLE.privacy, () =>
    press(root, "확인했어요")
  );
  await waitForText(root, "알림 접근 허용하기");
  await press(root, "알림 접근 허용하기");
  await waitForText(root, "알림 접근 권한이 켜져 있어요");
  await press(root, "다음");

  // 05 연동 앱: 고른 값은 뒤 단계에서 돌아와도 유지
  await waitForText(root, TITLE.apps);
  await checkBack(root, TITLE.apps, TITLE.access, () => press(root, "다음"));
  await toggle(root, "카카오톡");
  await press(root, "다음");

  // 06 받을 알림 → 뒤로가기면 05, 카카오톡 선택이 그대로
  await waitForText(root, TITLE.types);
  await pressBack();
  await waitForNoText(root, TITLE.types);
  const kakao = root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityRole === "checkbox" &&
        n.props.accessibilityLabel === "카카오톡"
    )
    .at(-1);
  expect(kakao?.props.accessibilityState).toMatchObject({ checked: true });
  await press(root, "다음");

  // 06 받을 알림: 모두 켜짐이 기본, 전체 알림으로 모두 끄고 켜기
  await waitForText(root, TITLE.types);
  expect(switchOn(root, "전체 알림")).toBe(true);
  await pressByRole(root, "switch", "전체 알림");
  expect(switchOn(root, "오늘의 상태 확인")).toBe(false);
  expect(switchOn(root, "일정 알림")).toBe(false);
  await pressByRole(root, "switch", "전체 알림");
  expect(switchOn(root, "일정 알림")).toBe(true);

  // 하나 끄면 전체 알림도 꺼짐 → 확인했어요(허용) → 07, 뒤로가면 06 선택이 그대로
  await pressByRole(root, "switch", "새 친구·계정 발견 알림");
  expect(switchOn(root, "전체 알림")).toBe(false);
  await waitForRequestDone(root);
  await press(root, "확인했어요");

  // 07 연락처 → 뒤로가기면 06
  await waitForText(root, TITLE.contacts);
  await pressBack();
  await waitForNoText(root, TITLE.contacts);
  expect(switchOn(root, "새 친구·계정 발견 알림")).toBe(false);
  await press(root, "확인했어요"); // 앱 알림은 이미 허용 → 바로 07

  // 07 연락처 (허용) → 09
  await waitForText(root, TITLE.contacts);
  await waitForText(root, "연락처 가져오기");
  await press(root, "연락처 가져오기");

  // 09 친구 선택
  await waitForText(root, TITLE.select);
  await checkBack(root, TITLE.select, TITLE.contacts, () =>
    press(root, "연락처 가져오기")
  );
  await waitForText(root, "42명 친구로 저장하기");
  await press(root, "42명 친구로 저장하기");

  // 10 친구 목록 완료
  await waitForText(root, TITLE.friends);
  await checkBack(root, TITLE.friends, TITLE.select, () =>
    press(root, "42명 친구로 저장하기")
  );
  expect(findText(root, "친구 42명 추가 완료").length).toBe(1);
  await press(root, "다음");

  // 11 AI 메모리: 건너뛰기 → 11-1 확인 시트 → 계속 작성하기면 그대로, 건너뛰기면 12
  await waitForText(root, TITLE.memory);
  await checkBack(root, TITLE.memory, TITLE.friends, () => press(root, "다음"));
  await press(root, "건너뛰기");
  await waitForText(root, SKIP_SHEET);
  await press(root, "계속 작성하기");
  await waitForNoText(root, SKIP_SHEET);
  await skipMemory(root);

  // 12 완료: 말씨앗의 약속, 뒤로가기면 11
  await waitForText(root, TITLE.done);
  expect(findText(root, "말씨앗의 약속").length).toBe(1);
  await checkBack(root, TITLE.done, TITLE.memory, () => skipMemory(root));
  await press(root, "말씨앗 시작하기");
  await waitForText(root, "오늘의 도움 수준");
}, 90000);

test("거부(개발 옵션): 거부 안내 → 다시 요청 → 설정 열기, 상태 화면에서 뒤로가면 그 단계는 처음 상태로", async () => {
  await reset("deny");
  const root = await renderApp();
  await login(root);

  // 06까지 빠르게 이동
  await waitForText(root, TITLE.intro1);
  for (let i = 0; i < 5; i += 1) await press(root, "다음");
  await press(root, "확인했어요");
  await waitForText(root, "알림 접근 허용하기");
  await press(root, "알림 접근 허용하기");
  await waitForText(root, "알림 접근 권한이 켜져 있어요");
  await press(root, "다음");
  await waitForText(root, TITLE.apps);
  await toggle(root, "카카오톡");
  await press(root, "다음");

  // 06: 확인했어요 → 06-1 시스템 팝업 거절 → 부드러운 안내 (팝업 전에는 안내 없음)
  await waitForText(root, TITLE.types);
  expect(findText(root, "괜찮아요, 나중에 켜도 돼요").length).toBe(0);
  await press(root, "확인했어요");
  await waitForText(root, "괜찮아요, 나중에 켜도 돼요");
  await waitForRequestDone(root);
  expect(findText(root, "이대로 넘어갈게요").length).toBe(1);

  // 상태 화면에서 뒤로가기 → 05로, 다시 오면 06은 처음 상태
  await pressBack();
  await waitForNoText(root, TITLE.types);
  await press(root, "다음");
  await waitForText(root, TITLE.types);
  expect(findText(root, "괜찮아요, 나중에 켜도 돼요").length).toBe(0);
  expect(findText(root, "이대로 넘어갈게요").length).toBe(0);

  // 다시 요청 → "다시 묻지 않음" → 설정 열기 → 허용되면 07
  await press(root, "확인했어요"); // 두 번째 요청: 다시 묻지 않음
  await waitForText(
    root,
    "이제는 휴대폰 설정에서만 켤 수 있어요. 꺼 두면 선택한 알림을 받을 수 없고, 앱을 열었을 때만 확인할 수 있어요."
  );
  await waitForRequestDone(root);
  await press(root, "설정 열기");
  await waitForRequestDone(root);
  await press(root, "확인했어요");

  // 07 연락처: 거절 → 다시 요청(다시 묻지 않음) → 설정 열기 → 09
  await waitForText(root, TITLE.contacts);
  expect(findText(root, "건너뛰기").length).toBeGreaterThan(0);
  await press(root, "연락처 가져오기");
  await waitForText(root, "괜찮아요, 나중에 켜도 돼요");
  await waitForRequestDone(root);
  await press(root, "다시 요청하기");
  await waitForText(
    root,
    "이제는 휴대폰 설정에서만 켤 수 있어요. 연락처 없이도 메신저 알림으로 친구를 하나씩 추가할 수 있어요."
  );
  await waitForRequestDone(root);
  await press(root, "설정 열기");
  await waitForText(root, TITLE.select);
}, 90000);
