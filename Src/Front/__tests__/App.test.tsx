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

const renderApp = async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  return renderer.root;
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

  expect(findText(root, "아이디를 입력해주세요.").length).toBe(1);
  expect(findText(root, "비밀번호를 입력해주세요.").length).toBe(1);

  await type(root, "아이디", "malssiat");
  expect(findText(root, "아이디를 입력해주세요.").length).toBe(0);
});

test("회원가입은 필수 항목과 비밀번호 확인을 검사한다", async () => {
  const root = await renderApp();
  await press(root, "시작하기");
  await press(root, "회원가입");

  expect(findText(root, "말씨앗을 함께 시작해요").length).toBe(1);
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
