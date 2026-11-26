import ReactTestRenderer from "react-test-renderer";
import { createMockPermissionService } from "../src/services/permission/mockPermissionService";
import { services, STORAGE_KEYS } from "../src/services";
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
  model: "민감한 내용을 먼저 가려 줄\n작은 AI를 받아요",
  types: "받을 알림을\n선택해 주세요",
  battery: "연락 수집이\n끊기지 않도록 도와주세요",
  contacts: "연락처로 친구 목록을\n먼저 만들어볼까요?",
  select: "친구로 추가할 연락처를\n선택해요",
  friends: "친구 목록을\n준비했어요",
  memory: "내 상황을 조금\n알려주실래요?",
  done: "이제 준비가\n모두 끝났어요",
};

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

beforeEach(() => reset("allow"));

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

  // AI 모델 → 뒤로가기면 05, 카카오톡 선택이 그대로
  await waitForText(root, TITLE.model);
  await pressBack();
  await waitForNoText(root, TITLE.model);
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
  await waitForText(root, "나중에 받을게요");
  await press(root, "나중에 받을게요");

  // 06 받을 알림: 하나 빼고 다음(허용) → 07, 뒤로가면 06 선택이 그대로
  await waitForText(root, TITLE.types);
  await checkBack(root, TITLE.types, TITLE.model, () =>
    press(root, "나중에 받을게요")
  );
  await toggle(root, "새 친구 발견 알림");
  await waitForRequestDone(root);
  await press(root, "다음");

  // 07 배터리
  await waitForText(root, TITLE.battery);
  await pressBack();
  await waitForNoText(root, TITLE.battery);
  const newFriend = root
    .findAll(
      n =>
        typeof n.type === "string" &&
        n.props.accessibilityRole === "checkbox" &&
        String(n.props.accessibilityLabel).startsWith("새 친구 발견 알림")
    )
    .at(-1);
  expect(newFriend?.props.accessibilityState).toMatchObject({ checked: false });
  await press(root, "다음"); // 앱 알림은 이미 허용 → 바로 07
  await waitForText(root, TITLE.battery);
  await waitForText(root, "나중에 할게요");
  await press(root, "나중에 할게요");

  // 08 연락처 (허용) → 09
  await waitForText(root, TITLE.contacts);
  await checkBack(root, TITLE.contacts, TITLE.battery, () =>
    press(root, "나중에 할게요")
  );
  await waitForText(root, "연락처 가져오기");
  await press(root, "연락처 가져오기");

  // 09 친구 선택
  await waitForText(root, TITLE.select);
  await checkBack(root, TITLE.select, TITLE.contacts, () =>
    press(root, "연락처 가져오기")
  );
  await waitForText(root, "선택한 42명 추가");
  await press(root, "선택한 42명 추가");

  // 10 친구 목록 완료
  await waitForText(root, TITLE.friends);
  await checkBack(root, TITLE.friends, TITLE.select, () =>
    press(root, "선택한 42명 추가")
  );
  expect(findText(root, "친구 42명 추가 완료").length).toBe(1);
  await press(root, "다음");

  // 11 AI 메모리: 아직 안 쓴 첫 항목을 여는 버튼
  await waitForText(root, TITLE.memory);
  await checkBack(root, TITLE.memory, TITLE.friends, () => press(root, "다음"));
  expect(findText(root, "‘요즘 나의 상태’부터 쓰기").length).toBe(1);
  await press(root, "지금은 건너뛰기");

  // 12 완료: 가리기 모델 상태를 보여 줌, 뒤로가기면 11
  await waitForText(root, TITLE.done);
  await waitForText(root, "가리기 모델을 아직 받지 않았어요");
  await checkBack(root, TITLE.done, TITLE.memory, () =>
    press(root, "지금은 건너뛰기")
  );
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
  await waitForText(root, "나중에 받을게요");
  await press(root, "나중에 받을게요");

  // 06: 다음 → 시스템 팝업 거절 → 부드러운 안내
  await waitForText(root, "다음 단계에서 기기 권한을 요청해요");
  await press(root, "다음");
  await waitForText(root, "괜찮아요, 나중에 켜도 돼요");
  await waitForRequestDone(root);
  expect(findText(root, "이대로 넘어갈게요").length).toBe(1);

  // 상태 화면에서 뒤로가기 → AI 모델로, 다시 오면 06은 처음 상태
  await pressBack();
  await waitForNoText(root, TITLE.types);
  await press(root, "나중에 받을게요");
  await waitForText(root, TITLE.types);
  expect(findText(root, "괜찮아요, 나중에 켜도 돼요").length).toBe(0);
  expect(findText(root, "이대로 넘어갈게요").length).toBe(0);
  await waitForText(root, "다음 단계에서 기기 권한을 요청해요");

  // 다시 요청 → "다시 묻지 않음" → 설정 열기 → 허용되면 07
  await press(root, "다음"); // 두 번째 요청: 다시 묻지 않음
  await waitForText(
    root,
    "이제는 휴대폰 설정에서만 켤 수 있어요. 꺼 두면 선택한 알림을 받을 수 없고, 앱을 열었을 때만 확인할 수 있어요."
  );
  await waitForRequestDone(root);
  await press(root, "설정 열기");
  await waitForRequestDone(root);
  await press(root, "다음");
  await waitForText(root, TITLE.battery);
  await press(root, "나중에 할게요");

  // 08 연락처: 거절 → 다시 요청(다시 묻지 않음) → 설정 열기 → 09
  await waitForText(root, "나중에도 가능해요");
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
