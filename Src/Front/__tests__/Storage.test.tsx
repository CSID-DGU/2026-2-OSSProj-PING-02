import * as Keychain from "react-native-keychain";
import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import {
  AI_REPLY_MAX_PER_CONVERSATION,
  AI_REPLY_MAX_TOTAL,
  AI_REPLY_RETENTION_DAYS,
  createKeyValueAiReplyStore,
  services,
  STORAGE_KEYS,
  type SavedAiReply,
} from "../src/services";
import { createMockCollectionService } from "../src/services/collection/CollectionService";
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
  createdAt: Date.now(),
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

describe("AI 답장 저장소 (칸 하나에 묶음)", () => {
  const NOW = Date.UTC(2026, 10, 26);
  const DAY = 24 * 60 * 60 * 1000;
  const reply = (
    conversationId: string,
    n: number,
    createdAt = NOW - n * 1000
  ): SavedAiReply => ({
    id: `${conversationId}-${n}`,
    conversationId,
    createdAt,
    relation: "FRIEND",
    needsDecision: false,
    summary: `요약 ${n}`,
    replies: [],
  });
  const keychainServices = () => Keychain.getAllGenericPasswordServices();

  test("여러 대화방 결과를 암호화 저장소 칸 하나에 두고, 대화방별로 최신순으로 읽는다", async () => {
    const store = createKeyValueAiReplyStore(
      createSecureKeyValueStorage("test.ai"),
      { now: () => NOW }
    );
    for (let room = 0; room < 30; room += 1) {
      await store.save(reply(`room-${room}`, 1));
    }
    await store.save(reply("room-0", 0));

    // 대화방이 30개여도 Keystore 칸(=키)은 하나
    expect(await keychainServices()).toEqual(["test.ai.malssiat.aiReplies"]);
    expect(
      (await store.listByConversation("room-0")).map(r => r.id)
    ).toEqual(["room-0-0", "room-0-1"]);
    expect(await store.listByConversation("room-29")).toHaveLength(1);
  });

  test("예전 대화방별 칸은 처음 읽을 때 새 칸으로 옮기고 지운다", async () => {
    const storage = createSecureKeyValueStorage("test.ai");
    await storage.setItem(
      "malssiat.aiReplies.room-a",
      JSON.stringify([reply("room-a", 1), reply("room-a", 2)])
    );
    await storage.setItem(
      "malssiat.aiReplies.room-b",
      JSON.stringify([reply("room-b", 1)])
    );
    // 망가진 옛 칸은 건너뛰고 지움
    await storage.setItem("malssiat.aiReplies.room-c", "{망가짐");
    await storage.setItem("malssiat.other", "그대로");

    const store = createKeyValueAiReplyStore(storage, { now: () => NOW });
    expect(
      (await store.listByConversation("room-a")).map(r => r.id)
    ).toEqual(["room-a-1", "room-a-2"]);
    expect(await store.listByConversation("room-b")).toHaveLength(1);

    expect((await storage.getAllKeys()).sort()).toEqual([
      "malssiat.aiReplies",
      "malssiat.other",
    ]);

    // 옮긴 뒤 새로 만든 저장소(앱 재시작)에서도 그대로
    const restarted = createKeyValueAiReplyStore(storage, { now: () => NOW });
    expect(await restarted.listByConversation("room-a")).toHaveLength(2);
  });

  test("보관 기간(30일)이 지난 결과는 빠진다", async () => {
    const storage = createMemoryStorage();
    const store = createKeyValueAiReplyStore(storage, { now: () => NOW });
    await store.save(reply("room", 1, NOW - (AI_REPLY_RETENTION_DAYS + 1) * DAY));
    await store.save(reply("room", 2, NOW - (AI_REPLY_RETENTION_DAYS - 1) * DAY));

    expect((await store.listByConversation("room")).map(r => r.id)).toEqual([
      "room-2",
    ]);
    // 저장된 값에서도 빠짐
    expect(await storage.getItem("malssiat.aiReplies")).not.toContain("room-1");
  });

  test("대화방별·전체 최대 개수를 넘으면 오래된 것부터 뺀다", async () => {
    const store = createKeyValueAiReplyStore(createMemoryStorage(), {
      now: () => NOW,
    });
    for (let n = AI_REPLY_MAX_PER_CONVERSATION + 3; n >= 1; n -= 1) {
      await store.save(reply("busy", n));
    }
    expect((await store.listByConversation("busy")).map(r => r.id)).toEqual(
      Array.from(
        { length: AI_REPLY_MAX_PER_CONVERSATION },
        (_, i) => `busy-${i + 1}`
      )
    );

    // 대화방마다 1개씩, 전체 최대 개수보다 많이 저장
    for (let room = AI_REPLY_MAX_TOTAL + 10; room >= 1; room -= 1) {
      await store.save(reply(`room-${room}`, 0, NOW - room * 1000));
    }
    expect(await store.listByConversation("room-1")).toHaveLength(1);
    expect(
      await store.listByConversation(`room-${AI_REPLY_MAX_TOTAL + 10}`)
    ).toHaveLength(0);
  });

  test("동시에 여러 개를 저장해도 하나도 잃지 않는다", async () => {
    const store = createKeyValueAiReplyStore(createMemoryStorage(), {
      now: () => NOW,
    });
    await Promise.all(
      Array.from({ length: 10 }, (_, room) => store.save(reply(`room-${room}`, 1)))
    );
    for (let room = 0; room < 10; room += 1) {
      expect(await store.listByConversation(`room-${room}`)).toHaveLength(1);
    }
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
    // 키 목록도 지금 사용자 것만
    expect(await storage.getAllKeys()).toEqual(["k"]);
    storage.setUserId(null);
    expect(await storage.getItem("k")).toBeNull();
    expect(await storage.getAllKeys()).toEqual([]);
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
    await waitForText(root, "오늘의 도움 수준");

    await closeApp();
    root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
  });

  test("AI 답장 결과는 로그인한 사용자 칸에 남고, 로그아웃하면 보이지 않다가 다시 로그인하면 보인다", async () => {
    let root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    await services.aiReplies.save(savedReply());
    expect(
      await services.aiReplies.listByConversation(CONVERSATION_ID)
    ).toHaveLength(1);
    // 대화방별 칸이 아니라 사용자 칸 하나에 묶여 저장됨
    expect(
      await services.storage.getItem(`user.${USER_ID}.malssiat.aiReplies`)
    ).not.toBeNull();
    expect(
      await services.storage.getItem(`user.${USER_ID}.malssiat.aiReplies.${CONVERSATION_ID}`)
    ).toBeNull();

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
    await waitForText(root, "오늘의 도움 수준");
    expect(
      await services.aiReplies.listByConversation(CONVERSATION_ID)
    ).toHaveLength(1);
  });
});

describe("알림을 모을 앱 목록 (#83)", () => {
  const KAKAO = "com.kakao.talk";
  const INSTAGRAM = "com.instagram.android";
  const SMS = ["com.google.android.apps.messaging", "com.samsung.android.messaging"];

  const saveOnboarding = (userId: string, linkedApps: string[]) =>
    services.storage.setItem(
      `${STORAGE_KEYS.onboarding}.${userId}`,
      JSON.stringify({ completed: true, lastStep: "OnboardingDone", linkedApps })
    );

  const loginDemo = async () => {
    const login = await services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password);
    services.tokens.set(login.tokens);
  };

  beforeEach(() => {
    services.collection = createMockCollectionService();
  });

  test("이미 온보딩을 마친 사용자가 앱을 켜면 연동 앱(05)으로 수집 목록을 맞춘다", async () => {
    await loginDemo();
    await saveOnboarding(USER_ID, ["KAKAOTALK", "SMS"]);
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    expect(await services.collection.getApps()).toEqual([KAKAO, ...SMS].sort());
  });

  test("연동 앱 기록이 비어 있으면 수집 목록을 건드리지 않는다", async () => {
    services.collection = createMockCollectionService([INSTAGRAM]);
    await loginDemo();
    await saveOnboarding(USER_ID, []);
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    expect(await services.collection.getApps()).toEqual([INSTAGRAM]);
  });

  test("로그아웃하면 수집을 멈추고, 다시 로그인하면 그 사람의 연동 앱으로 다시 모은다", async () => {
    await loginDemo();
    await saveOnboarding(USER_ID, ["KAKAOTALK"]);
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    expect(await services.collection.getApps()).toEqual([KAKAO]);

    await pressByRole(root, "tab", "설정");
    await press(root, "로그아웃 (개발용)");
    await waitForText(root, "시작하기");
    expect(await services.collection.getApps()).toEqual([]);

    await press(root, "시작하기");
    await press(root, "로그인");
    await type(root, "아이디", MOCK_DEMO_ACCOUNT.loginId);
    await type(root, "비밀번호", MOCK_DEMO_ACCOUNT.password);
    await press(root, "로그인");
    await waitForText(root, "오늘의 도움 수준");
    expect(await services.collection.getApps()).toEqual([KAKAO]);
  });

  test("같은 폰에서 다른 계정으로 로그인하면 그 계정의 연동 앱으로 바뀐다", async () => {
    // 데모 계정(카카오톡)으로 쓰다가 로그아웃
    await loginDemo();
    await saveOnboarding(USER_ID, ["KAKAOTALK"]);
    const root = await renderApp();
    await waitForText(root, "오늘의 도움 수준");
    await pressByRole(root, "tab", "설정");
    await press(root, "로그아웃 (개발용)");
    await waitForText(root, "시작하기");

    // 다른 계정(인스타그램)으로 앱을 다시 켬 (저장된 토큰으로 자동 로그인)
    const terms = await services.auth.getTerms();
    const signup = await services.auth.signup({
      loginId: "otheruser83",
      name: "다른사람",
      birthdate: "2000-01-01",
      gender: "FEMALE",
      email: "other83@example.com",
      password: "abcd1234",
      termsAgreements: terms.map(t => ({ termsId: t.id, agreed: true })),
    });
    if (signup.status !== "signedIn") throw new Error("가입 후 바로 로그인돼야 함");
    services.tokens.set(signup.result.tokens);
    await saveOnboarding(signup.result.user.id, ["INSTAGRAM"]);
    await closeApp();
    const next = await renderApp();
    await waitForText(next, "오늘의 도움 수준");
    expect(await services.collection.getApps()).toEqual([INSTAGRAM]);
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
    await waitForText(root, "오늘의 도움 수준");
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
