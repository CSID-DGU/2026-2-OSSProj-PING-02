/* eslint-env jest */
import { DeviceEventEmitter } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import App from "../src/App";

// 화면 테스트 공통 도구 (__tests__ 밖에 두어 테스트 파일로 실행되지 않게 함)
export type Instance = ReactTestRenderer.ReactTestInstance;

export const findText = (root: Instance, text: string) =>
  root.findAll(
    node => typeof node.type === "string" && node.props.children === text
  );

// 라벨이 text인 버튼을 찾아 누름. 스택 아래 화면도 렌더돼 있어서 맨 위(마지막) 화면 것을 고름
export const press = async (root: Instance, text: string) => {
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

// 접근성 라벨·역할로 찾아 누름 (헤더 뒤로가기, 탭, 체크 줄처럼 글자만으로 찾기 어려운 요소)
export const pressByRole = async (
  root: Instance,
  role: string,
  label: string
) => {
  const node = root
    .findAll(
      n =>
        n.props.accessibilityRole === role &&
        typeof n.props.onPress === "function" &&
        (n.props.accessibilityLabel === label || findText(n, label).length > 0)
    )
    .at(-1);
  if (!node) throw new Error(`${role} "${label}"이 없습니다`);
  await ReactTestRenderer.act(async () => {
    node.props.onPress();
  });
};

// 체크박스(또는 role이 checkbox인 줄)를 라벨로 찾아 누름
export const toggle = (root: Instance, label: string) =>
  pressByRole(root, "checkbox", label);

// 안드로이드 하드웨어 뒤로가기 (jest.config의 defaultPlatform: android에서 동작)
export const pressBack = async () => {
  await ReactTestRenderer.act(async () => {
    DeviceEventEmitter.emit("hardwareBackPress", {});
  });
};

export const type = async (root: Instance, label: string, value: string) => {
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

export const renderApp = async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  mounted.push(renderer);
  return renderer.root;
};

// 조건이 맞을 때까지 기다림 (서비스 mock의 지연 때문)
export const waitUntil = async (
  check: () => boolean,
  what: string,
  timeout = 3000
) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) {
      throw new Error(`${what}: ${timeout}ms 안에 되지 않았습니다`);
    }
    await ReactTestRenderer.act(
      () => new Promise<void>(resolve => setTimeout(resolve, 50))
    );
  }
};

// 서비스(mock)에서 비동기로 받아 오는 내용이 나타날 때까지 기다림
export const waitForText = (root: Instance, text: string, timeout = 3000) =>
  waitUntil(() => findText(root, text).length > 0, `"${text}" 표시`, timeout);

export const waitForNoText = (root: Instance, text: string, timeout = 3000) =>
  waitUntil(() => findText(root, text).length === 0, `"${text}" 사라짐`, timeout);

// 권한 요청이 끝날 때까지 (요청 중에는 버튼이 "여는 중…")
// 스택 아래 화면에도 같은 이름의 버튼이 남아 있어, 요청이 끝난 뒤에 눌러야 맨 위 화면 것을 누름
export const waitForRequestDone = (root: Instance) =>
  waitUntil(() => findText(root, "여는 중…").length === 0, "권한 요청 완료");
