import * as Keychain from "react-native-keychain";
import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { services, STORAGE_KEYS, type SavedAiReply } from "../src/services";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";
import { createSecureKeyValueStorage } from "../src/services/storage/secureKeyValueStorage";
import { createUserScopedStorage } from "../src/services/storage/userScopedStorage";
import { ONBOARDING_LOAD_RETRY_MS } from "../src/stores/OnboardingProvider";
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

describe("온보딩 진행 상황 불러오기 실패", () => {
  const ONBOARDING_KEY = `${STORAGE_KEYS.onboarding}.${USER_ID}`;
  const INTRO_TITLE = "작은 한마디가,\n다시 이어질 씨앗이 되도록";
  const PRIVACY_TITLE = "원문은 기기에,\nAI에는 가린 내용만";
  const ACCESS_TITLE = "알림에 온 연락을\n함께 살펴볼게요";
  const originalDelays = [...ONBOARDING_LOAD_RETRY_MS];
  let failing = true;
  let failures = 0;

  // 부팅 직후 Keystore가 준비되지 않은 것처럼 온보딩 칸 읽기만 실패시킴
  const failOnboardingReads = (times = Infinity) => {
    failing = true;
    failures = 0;
    const original = services.storage.getItem.bind(services.storage);
    jest.spyOn(services.storage, "getItem").mockImplementation(key => {
      if (failing && key === ONBOARDING_KEY && failures < times) {
        failures += 1;
        return Promise.reject(new Error("keystore not ready"));
      }
      return original(key);
    });
  };

  // 앱 읽기 경로(실패시킨 getItem)를 거치지 않고 암호화 저장소에 실제로 남은 값을 봄
  const savedOnboarding = async () => {
    const saved = await Keychain.getGenericPassword({
      service: `malssiat.kv.mock.${ONBOARDING_KEY}`,
    });
    return saved ? JSON.parse(saved.password) : null;
  };

  // 저장은 화면 전환 뒤 비동기로 끝나서, 조건이 맞을 때까지 잠깐씩 기다림
  const waitForSaved = async (
    check: (saved: { lastStep?: string } | null) => boolean
  ) => {
    for (let i = 0; i < 60; i += 1) {
      if (check(await savedOnboarding())) return;
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`저장값이 기대와 다릅니다: ${JSON.stringify(await savedOnboarding())}`);
  };

  beforeEach(async () => {
    // 다시 시도 간격을 줄여 테스트를 빠르게 (횟수는 그대로 3번)
    ONBOARDING_LOAD_RETRY_MS.splice(0, ONBOARDING_LOAD_RETRY_MS.length, 20, 20, 20);
    const login = await services.auth.login(
      MOCK_DEMO_ACCOUNT.loginId,
      MOCK_DEMO_ACCOUNT.password
    );
    services.tokens.set(login.tokens);
    await services.storage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({ completed: true, lastStep: "OnboardingDone" })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    ONBOARDING_LOAD_RETRY_MS.splice(0, ONBOARDING_LOAD_RETRY_MS.length, ...originalDelays);
  });

  test("처음 몇 번 실패해도 다시 시도해서 저장된 진행 상황(완료)대로 홈으로 간다", async () => {
    failOnboardingReads(2);
    const root = await renderApp();
    await waitForText(root, "오늘의 연락");
    expect(failures).toBe(2);
  });

  test("끝까지 실패하면 처음부터 열지만, 단계를 넘겨도 저장된 완료 상태를 덮어쓰지 않는다", async () => {
    failOnboardingReads();
    const root = await renderApp();

    // 읽지 못해 기본값(처음부터)으로 열림
    await waitForText(root, INTRO_TITLE);
    for (let i = 0; i < 5; i += 1) await press(root, "다음");
    await waitForText(root, PRIVACY_TITLE);

    // 단계를 넘겨도(lastStep 저장 시도) 저장소 값은 그대로
    expect(await savedOnboarding()).toEqual({
      completed: true,
      lastStep: "OnboardingDone",
    });

    // 저장소가 준비된 뒤 다음 변경 때 다시 읽고, 저장된 값 위에 변경만 얹어 저장
    failing = false;
    await press(root, "확인했어요");
    await waitForText(root, ACCESS_TITLE);
    await waitForSaved(saved => saved?.lastStep === "NotificationAccess");
    expect(await savedOnboarding()).toMatchObject({
      completed: true,
      lastStep: "NotificationAccess",
    });
  });
});
