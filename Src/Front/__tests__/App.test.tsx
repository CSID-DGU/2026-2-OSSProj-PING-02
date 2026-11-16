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

// 로그인하면 mock 저장소에 세션이 남으므로 이 파일의 마지막 테스트로 둠
test("로그인하면 온보딩을 시작하고, 연동 앱은 하나 이상 골라야 넘어간다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "로그인");

  await type(root, "이메일", "demo@malssiat.app");
  await type(root, "비밀번호", "abcd1234");
  await press(root, "로그인");

  // 1단계: 개인정보 안내
  await waitForText(root, "대화는 이 휴대폰 안에서만\n다뤄요");
  expect(findText(root, "1 / 6").length).toBeGreaterThan(0);
  await press(root, "확인했어요");

  // 2단계: 권한 - 상태를 불러온 뒤 나중에 하기
  await waitForText(root, "알림 읽기");
  await press(root, "나중에 할게요");

  // 3단계: 연동 앱 - 아무것도 고르지 않으면 넘어가지 않음
  expect(findText(root, "어떤 앱의 연락을 함께 볼까요?").length).toBe(1);
  expect(findText(root, "하나 이상 골라 주세요.").length).toBe(1);
  await press(root, "다음");
  expect(findText(root, "어떤 앱의 연락을 함께 볼까요?").length).toBe(1);

  const kakao = root
    .findAll(
      node =>
        node.props.accessibilityRole === "checkbox" &&
        typeof node.props.onPress === "function"
    )
    .filter(node => findText(node, "카카오톡").length > 0)
    .at(-1);
  await ReactTestRenderer.act(async () => {
    kakao!.props.onPress();
  });
  expect(findText(root, "1개를 골랐어요.").length).toBe(1);

  // 4단계: AI 모델 받기로 이동
  await press(root, "다음");
  expect(findText(root, "휴대폰 안에서 쓸 AI를 받아요").length).toBe(1);
  await press(root, "나중에 받을게요");

  // 5단계: AI 메모리 - 예시 칩은 스크린리더에 "버튼"으로 보이고, activate하면 입력창에 추가
  const example = "답장은 짧게 쓰는 편이에요";
  const chip = root
    .findAll(
      node =>
        typeof node.type === "string" &&
        node.props.accessibilityLabel === example
    )
    .at(-1);
  expect(chip?.props.accessibilityRole).toBe("button");
  await ReactTestRenderer.act(async () => {
    chip!.props.onAccessibilityAction({
      nativeEvent: { actionName: "activate" },
    });
  });
  const memo = root
    .findAll(
      node =>
        typeof node.type === "string" &&
        node.props.accessibilityLabel === "나에 대한 메모"
    )
    .at(-1);
  expect(memo?.props.value).toBe(example);
});
