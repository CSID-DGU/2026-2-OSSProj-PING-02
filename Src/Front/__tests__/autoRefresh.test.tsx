import { AppState } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { createMockConversationService } from "../src/services/conversation/mockConversationService";
import { createMockModelService } from "../src/services/model/mockModelService";
import { RELOAD_BATCH_MS } from "../src/hooks/useConversations";
import {
  services,
  STORAGE_KEYS,
  type ConversationService,
  type ConversationSummary,
} from "../src/services";
import {
  findText,
  pressByRole,
  renderApp,
  waitForText,
  waitUntil,
} from "../test-utils/app";

// #71 새 메시지가 오면 목록 자동 갱신 (홈·연락 탭 공통 useConversations)

const USER_ID = "mock-user-demo";

/** 새 메시지 이벤트를 테스트에서 보낼 수 있고, list 호출 수를 세는 연락 서비스 */
const controllableConversations = () => {
  const base = createMockConversationService({ latency: 10 });
  const listeners = new Set<() => void>();
  let extra: ConversationSummary[] = [];
  const calls = { list: 0, analyze: 0 };
  const service: ConversationService = {
    ...base,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async list() {
      calls.list += 1;
      return [...extra, ...(await base.list())];
    },
    async analyze(id) {
      calls.analyze += 1;
      return base.analyze(id);
    },
  };
  return {
    service,
    calls,
    listenerCount: () => listeners.size,
    /** 새 대화방 하나가 생긴 것처럼 하고 이벤트를 보냄 */
    async newMessage(title: string, template: ConversationSummary) {
      extra = [
        {
          ...template,
          conversation: { ...template.conversation, id: `new-${title}`, title },
        },
        ...extra,
      ];
      listeners.forEach(l => l());
    },
    emit: () => listeners.forEach(l => l()),
  };
};

const wait = (ms: number) =>
  ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(() => resolve(), ms))
  );

/** 앱이 백그라운드에 갔다가 다시 앞으로 온 것처럼 (AppState는 jest preset의 mock) */
const comeBackToApp = async () => {
  const handlers = (AppState.addEventListener as jest.Mock).mock.calls
    .filter(([type]) => type === "change")
    .map(([, handler]) => handler as (s: string) => void);
  await ReactTestRenderer.act(async () => {
    handlers.forEach(h => h("background"));
    handlers.forEach(h => h("active"));
  });
};

const openContactsTab = async () => {
  const login = await services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password);
  services.tokens.set(login.tokens);
  await services.storage.setItem(
    `${STORAGE_KEYS.onboarding}.${USER_ID}`,
    JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
  );
  // 가리기 모델이 있어야 분석(analyze)이 돌아서, 다시 불러올 때 AI를 새로 부르지 않는지 볼 수 있음
  services.model = createMockModelService({ durationMs: 10 });
  const info = await services.model.getLatest();
  await services.model.startDownload(info, () => {}).done;
  const root = await renderApp();
  await waitForText(root, "오늘의 도움 수준");
  await pressByRole(root, "tab", "연락");
  await waitForText(root, "편한 순서대로 천천히 살펴봐도 괜찮아요.");
  return root;
};

let ctl: ReturnType<typeof controllableConversations>;
let template: ConversationSummary;

beforeEach(async () => {
  ctl = controllableConversations();
  services.conversation = ctl.service;
  [template] = await createMockConversationService({ latency: 0 }).list();
});

test("목록을 보는 중에 새 메시지가 오면 로딩 없이 맨 위에 새 대화가 생긴다", async () => {
  const root = await openContactsTab();
  await waitUntil(() => ctl.listenerCount() > 0, "새 메시지 구독");

  await ReactTestRenderer.act(() => ctl.newMessage("새로 온 친구", template));
  await waitForText(root, "새로 온 친구");
  expect(findText(root, "편한 순서대로 천천히 살펴봐도 괜찮아요.").length).toBeGreaterThan(0);
  expect(root.findAll(n => n.props.accessibilityLabel === "연락을 불러오는 중")).toHaveLength(0);

  // 새 대화가 기존 첫 대화보다 위에 (목록은 최근 대화 먼저)
  const texts = root
    .findAll(n => typeof n.props.children === "string")
    .map(n => n.props.children as string);
  expect(texts.indexOf("새로 온 친구")).toBeLessThan(
    texts.indexOf(template.conversation.title)
  );
});

test("짧은 시간에 몰려 온 이벤트는 한 번만 다시 읽는다", async () => {
  await openContactsTab();
  await waitUntil(() => ctl.listenerCount() > 0, "새 메시지 구독");
  await wait(50);
  const before = ctl.calls.list;

  await ReactTestRenderer.act(async () => {
    for (let i = 0; i < 5; i += 1) ctl.emit();
  });
  await wait(RELOAD_BATCH_MS + 100);

  expect(ctl.calls.list - before).toBe(1);
});

test("앱이 다시 앞으로 오면 다시 읽는다", async () => {
  await openContactsTab();
  await wait(50);
  const before = ctl.calls.list;

  await comeBackToApp();
  await wait(50);

  expect(ctl.calls.list).toBeGreaterThan(before);
});

test("목록 화면을 떠나면 이벤트를 받지 않는다", async () => {
  const root = await openContactsTab();
  await waitUntil(() => ctl.listenerCount() > 0, "새 메시지 구독");
  const subscribed = ctl.listenerCount();

  // 다른 탭(설정)으로 가면 연락 목록은 구독을 끊음
  await pressByRole(root, "tab", "설정");
  await waitUntil(() => ctl.listenerCount() < subscribed, "구독 해제");
});

test("다시 불러와도 AI 분석(analyze)을 새로 부르지 않는다", async () => {
  await openContactsTab();
  await waitUntil(() => ctl.listenerCount() > 0, "새 메시지 구독");
  // 처음 들어올 때 분석 중(pending)인 대화의 분석이 시작되고 끝날 때까지 (mock analyze 1.5초)
  await waitUntil(() => ctl.calls.analyze > 0, "처음 분석 시작");
  await wait(1700);
  const analyzed = ctl.calls.analyze;

  await ReactTestRenderer.act(async () => ctl.emit());
  await wait(RELOAD_BATCH_MS + 100);

  expect(ctl.calls.analyze).toBe(analyzed);
}, 15000);
