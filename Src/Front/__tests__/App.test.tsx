import { Dimensions } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import App from "../src/App";

type Instance = ReactTestRenderer.ReactTestInstance;

const findText = (root: Instance, text: string) =>
  root.findAll(
    node => typeof node.type === "string" && node.props.children === text
  );

// 라벨이 text인 버튼을 찾아 누름. 스택 아래 화면도 렌더돼 있어서 맨 위(마지막) 화면 것을 고름
const press = async (root: Instance, text: string) => {
  const button = root
    .findAll(
      node =>
        node.props.accessibilityRole === "button" &&
        typeof node.props.onPress === "function"
    )
    .filter(node => findText(node, text).length > 0)
    .at(-1);
  if (!button) throw new Error(`"${text}" 버튼이 없습니다`);
  await ReactTestRenderer.act(async () => {
    button.props.onPress();
  });
};

const type = async (root: Instance, label: string, value: string) => {
  const input = root
    .findAll(
      node =>
        typeof node.type === "string" &&
        node.props.accessibilityLabel === label &&
        !!node.props.onChangeText
    )
    .at(-1);
  if (!input) throw new Error(`"${label}" 입력창이 없습니다`);
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText(value);
  });
};

// 서비스 mock의 지연(setTimeout)이 테스트가 끝난 뒤 화면을 다시 그리지 않도록 매번 정리
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
  });
});

const renderApp = async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  mounted.push(renderer);
  return renderer.root;
};

// 서비스(mock)에서 비동기로 받아 오는 내용이 나타날 때까지 기다림
const waitForText = async (root: Instance, text: string, timeout = 3000) => {
  const start = Date.now();
  while (findText(root, text).length === 0) {
    if (Date.now() - start > timeout) {
      throw new Error(`"${text}"가 ${timeout}ms 안에 나타나지 않았습니다`);
    }
    await ReactTestRenderer.act(
      () => new Promise<void>(resolve => setTimeout(resolve, 50))
    );
  }
};

test("스플래시에서 시작하기를 누르면 계정 시작 화면으로 이동한다", async () => {
  const root = await renderApp();
  expect(findText(root, "말씨앗").length).toBeGreaterThan(0);

  await press(root, "시작하기");

  expect(findText(root, "로그인").length).toBeGreaterThan(0);
  expect(findText(root, "회원가입").length).toBeGreaterThan(0);
});

test("로그인 화면에서 빈 값으로 로그인하면 오류 문구를 보여준다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "로그인");

  expect(findText(root, "다시 만나서 반가워요").length).toBe(1);
  await press(root, "로그인");

  // 백엔드가 이메일 로그인이라 아이디 → 이메일로 변경 (Doc/API_목록.md 4.5)
  expect(findText(root, "이메일을 입력해주세요.").length).toBe(1);
  expect(findText(root, "비밀번호를 입력해주세요.").length).toBe(1);

  await type(root, "이메일", "malssiat@example.com");
  expect(findText(root, "이메일을 입력해주세요.").length).toBe(0);
});

test("회원가입은 필수 항목과 비밀번호 확인을 검사한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "회원가입");

  expect(findText(root, "말씨앗을 함께 시작해요").length).toBe(1);
  // 약관은 서비스에서 받아 오므로 목록이 나타난 뒤에 검사
  await waitForText(root, "[필수] 서비스 이용약관 동의");
  await type(root, "비밀번호", "12345678");
  await type(root, "비밀번호 확인", "12345679");
  await press(root, "회원가입");

  expect(findText(root, "이름을 입력해주세요.").length).toBe(1);
  expect(findText(root, "생년월일을 모두 선택해주세요.").length).toBe(1);
  expect(findText(root, "성별을 선택해주세요.").length).toBe(1);
  expect(findText(root, "이메일을 입력해주세요.").length).toBe(1);
  expect(findText(root, "비밀번호가 일치하지 않아요.").length).toBe(1);
  expect(findText(root, "필수 약관에 모두 동의해주세요.").length).toBe(1);
  expect(
    findText(root, "비밀번호는 8자 이상 입력해주세요.").length
  ).toBe(0);
});

test("아이디 찾기에 정보를 입력하면 결과 다이얼로그를 띄운다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "아이디 찾기");

  await type(root, "이메일", "hello@");
  await press(root, "아이디 찾기");
  expect(findText(root, "이름을 입력해주세요.").length).toBe(1);
  expect(findText(root, "이메일 형식을 확인해주세요.").length).toBe(1);

  await type(root, "이름", "김말씨");
  await type(root, "이메일", "hello@example.com");
  await press(root, "아이디 찾기");

  expect(findText(root, "아이디를 찾았어요").length).toBe(1);
  expect(findText(root, "mals****").length).toBe(1);
});

// 체크박스(또는 role이 checkbox인 요소)를 라벨로 찾아 누름
const toggle = async (root: Instance, label: string) => {
  const box = root
    .findAll(
      node =>
        node.props.accessibilityRole === "checkbox" &&
        typeof node.props.onPress === "function"
    )
    .filter(node => findText(node, label).length > 0)
    .at(-1);
  if (!box) throw new Error(`"${label}" 체크박스가 없습니다`);
  await ReactTestRenderer.act(async () => {
    box.props.onPress();
  });
};

// 로그인하면 mock 저장소에 세션이 남으므로 이 파일의 마지막 테스트로 둠
test("로그인하면 Figma 순서대로 온보딩을 진행한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "로그인");

  await type(root, "이메일", "demo@malssiat.app");
  await type(root, "비밀번호", "abcd1234");
  await press(root, "로그인");

  // 02 서비스 소개: 손으로 넘기면 점 표시가 따라가고, "다음"으로 끝까지 가면 03
  await waitForText(root, "작은 한마디가,\n다시 이어질 씨앗이 되도록");
  const dots = (n: number) =>
    root.findAll(
      node =>
        typeof node.type === "string" &&
        node.props.accessibilityLabel === `서비스 소개 5쪽 중 ${n}쪽`
    ).length;
  expect(dots(1)).toBe(1);

  const pager = root
    .findAll(node => typeof node.props.onMomentumScrollEnd === "function")
    .at(-1)!;
  const { width } = Dimensions.get("window");
  await ReactTestRenderer.act(async () => {
    pager.props.onMomentumScrollEnd({
      nativeEvent: { contentOffset: { x: width * 2, y: 0 } },
    });
  });
  expect(dots(3)).toBe(1);

  await press(root, "다음"); // 4쪽
  await press(root, "다음"); // 5쪽
  expect(dots(5)).toBe(1);
  await press(root, "다음");
  expect(findText(root, "원문은 기기에,\nAI에는 가린 내용만").length).toBe(1);
  await press(root, "확인했어요");

  // 04 알림 접근: 설정으로 보냈다가 돌아오면(mock) 켜짐 안내 → 다음
  await waitForText(root, "알림 접근 허용하기");
  await press(root, "알림 접근 허용하기");
  await waitForText(root, "알림 접근 권한이 켜져 있어요");
  await press(root, "다음");

  // 05 연동 앱
  await waitForText(root, "카카오톡");
  await toggle(root, "카카오톡");
  await press(root, "다음");

  // AI 모델 다운로드 → 06 받을 알림
  await waitForText(root, "나중에 받을게요");
  await press(root, "나중에 받을게요");
  expect(findText(root, "받을 알림을\n선택해 주세요").length).toBe(1);

  // 06: 다음 → 시스템 알림 팝업 거절(mock) → 부드러운 안내 후 넘어가기
  await waitForText(root, "다음 단계에서 기기 권한을 요청해요");
  await press(root, "다음");
  await waitForText(root, "괜찮아요, 나중에 켜도 돼요");
  await press(root, "이대로 넘어갈게요");

  // 07 배터리: 나중에 하기
  await waitForText(root, "배터리 사용 제한 해제");
  await press(root, "나중에 할게요");
  expect(
    findText(root, "연락처로 친구 목록을\n먼저 만들어볼까요?").length
  ).toBe(1);
});

