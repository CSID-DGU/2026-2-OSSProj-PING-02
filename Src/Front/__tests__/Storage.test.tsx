import * as Keychain from "react-native-keychain";
import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { services, STORAGE_KEYS, type SavedAiReply } from "../src/services";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";
import { createSecureKeyValueStorage } from "../src/services/storage/secureKeyValueStorage";
import { createUserScopedStorage } from "../src/services/storage/userScopedStorage";
import {
  closeApp,
  press,
  pressByRole,
  renderApp,
  type,
  waitForText,
} from "../test-utils/app";

// 기기 저장소: 앱을 껐다 켜도 남고, 사용자별로 나뉘는지

const USER_ID = "mock-user-demo";
const CONVERSATION_ID = "com.kakao.talk::room-1";

const savedReply = (): SavedAiReply => ({
  id: "reply-1",
  conversationId: CONVERSATION_ID,
  createdAt: 1,
  relation: "FRIEND",
  needsDecision: false,
  summary: "요약",
  replies: [],
});

describe("암호화 기기 저장소", () => {
  test("새로 만든 저장소(앱 재시작)에서도 값이 남고, 칸 이름(모드)이 다르면 섞이지 않는다", async () => {
    await createSecureKeyValueStorage("test.kv.mock").setItem("a", "1");

    // 앱을 다시 켠 것처럼 새 인스턴스로 읽음 (메모리 저장소였다면 사라짐)
    const restarted = createSecureKeyValueStorage("test.kv.mock");
    expect(await restarted.getItem("a")).toBe("1");
    expect(await createSecureKeyValueStorage("test.kv.http").getItem("a")).toBeNull();

    await restarted.removeItem("a");
    expect(await restarted.getItem("a")).toBeNull();
  });

  test("앱의 온보딩 진행 상황은 모드별 암호화 저장소 칸에 저장된다", async () => {
    const key = `${STORAGE_KEYS.onboarding}.${USER_ID}`;
    await services.storage.setItem(key, "{}");
    const saved = await Keychain.getGenericPassword({
      service: `malssiat.kv.mock.${key}`,
    });
    expect(saved && saved.password).toBe("{}");
  });
});

describe("사용자별 저장소", () => {
  test("사용자마다 칸이 나뉘고, 로그인 전에는 읽어도 없고 쓰기는 버린다", async () => {
    const storage = createUserScopedStorage(createMemoryStorage());

    await storage.setItem("k", "nobody");
    expect(await storage.getItem("k")).toBeNull();

    storage.setUserId("a");
    await storage.setItem("k", "A");
    storage.setUserId("b");
    expect(await storage.getItem("k")).toBeNull();
    await storage.setItem("k", "B");

    storage.setUserId("a");
    expect(await storage.getItem("k")).toBe("A");
    storage.setUserId(null);
    expect(await storage.getItem("k")).toBeNull();
  });
});

describe("앱 재시작·로그아웃", () => {
  beforeEach(async () => {
    const login = await services.auth.login(
      MOCK_DEMO_ACCOUNT.loginId,
      MOCK_DEMO_ACCOUNT.password
    );
    services.tokens.set(login.tokens);
    await services.storage.setItem(
      `${STORAGE_KEYS.onboarding}.${USER_ID}`,
      JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
    );
  });

  test("온보딩을 마친 뒤 앱을 껐다 켜면 홈으로 바로 간다", async () => {
    let root = await renderApp();
    await waitForText(root, "오늘의 연락");

    await closeApp();
    root = await renderApp();
    await waitForText(root, "오늘의 연락");
  });

  test("AI 답장 결과는 로그인한 사용자 칸에 남고, 로그아웃하면 보이지 않다가 다시 로그인하면 보인다", async () => {
    let root = await renderApp();
    await waitForText(root, "오늘의 연락");
    await services.aiReplies.save(savedReply());
    expect(
      await services.aiReplies.listByConversation(CONVERSATION_ID)
    ).toHaveLength(1);
    expect(
      await services.storage.getItem(`user.${USER_ID}.malssiat.aiReplies.${CONVERSATION_ID}`)
    ).not.toBeNull();

    await pressByRole(root, "tab", "설정");
    await press(root, "로그아웃 (개발용)");
    await waitForText(root, "시작하기");
    expect(
      await services.aiReplies.listByConversation(CONVERSATION_ID)
    ).toHaveLength(0);

    await closeApp();
    root = await renderApp();
    await press(root, "시작하기");
    await press(root, "로그인");
    await type(root, "아이디", MOCK_DEMO_ACCOUNT.loginId);
    await type(root, "비밀번호", MOCK_DEMO_ACCOUNT.password);
    await press(root, "로그인");
    await waitForText(root, "오늘의 연락");
    expect(
      await services.aiReplies.listByConversation(CONVERSATION_ID)
    ).toHaveLength(1);
  });
});
