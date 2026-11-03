import ReactTestRenderer from "react-test-renderer";
import App from "../src/App";

const findText = (root: ReactTestRenderer.ReactTestInstance, text: string) =>
  root.findAll(
    node => typeof node.type === "string" && node.props.children === text
  );

test("스플래시에서 시작하기를 누르면 계정 시작 화면으로 이동한다", async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer.root;

  expect(findText(root, "말씨앗").length).toBeGreaterThan(0);
  const start = root.findByProps({ accessibilityRole: "button" });

  await ReactTestRenderer.act(async () => {
    start.props.onPress();
  });

  expect(findText(root, "로그인").length).toBeGreaterThan(0);
  expect(findText(root, "회원가입").length).toBeGreaterThan(0);
});
