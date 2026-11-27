import type { MessengerNative } from "../src/native/Messenger";
import type { StoredNotification } from "../src/native/NotificationStore";
import {
  CONVERSATION_ERROR_CODE,
  createKeyValueAiReplyStore,
  createMaskNameStore,
  createMockAiReplyService,
  getErrorCode,
  toMaskNames,
  type AiReplyRequest,
  type AiReplyService,
} from "../src/services";
import {
  createDeviceConversationService,
  toConversationKey,
} from "../src/services/conversation/deviceConversationService";
import { createDeviceMessengerService } from "../src/services/conversation/deviceMessengerService";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";

// #69 복사하고 메신저 열기 (Kotlin Messenger 모듈 위의 서비스) + AI 마스킹에 내 이름 넣기

const KAKAO = "com.kakao.talk";

/** 가짜 네이티브 모듈. installed: 열 수 있는 앱, rooms: 알림 동작이 남아 있는 대화방("패키지::id") */
const fakeNative = ({
  installed = [KAKAO, "com.instagram.android", "com.samsung.android.messaging"],
  rooms = [] as string[],
  defaultSms = null as string | null,
  failCopy = false,
} = {}) => {
  const calls: string[] = [];
  const native: MessengerNative = {
    async copyText(text) {
      if (failCopy) throw Object.assign(new Error("x"), { code: "COPY_FAILED" });
      calls.push(`copy:${text}`);
    },
    async openApp(pkg) {
      if (!installed.includes(pkg)) {
        throw Object.assign(new Error("x"), { code: "APP_NOT_INSTALLED" });
      }
      calls.push(`app:${pkg}`);
    },
    async openConversation(pkg, id) {
      const ok = rooms.includes(`${pkg}::${id}`);
      if (ok) calls.push(`room:${pkg}::${id}`);
      return ok;
    },
    async getDefaultSmsPackage() {
      return defaultSms;
    },
  };
  return { native, calls };
};

describe("복사", () => {
  test("네이티브 클립보드로 복사한다", async () => {
    const { native, calls } = fakeNative();
    await createDeviceMessengerService(native).copyText("좋아!");
    expect(calls).toEqual(["copy:좋아!"]);
  });

  test("복사가 실패하면 COPY_FAILED", async () => {
    const { native } = fakeNative({ failCopy: true });
    const error = await createDeviceMessengerService(native).copyText("x").catch(e => e);
    expect(getErrorCode(error)).toBe(CONVERSATION_ERROR_CODE.copyFailed);
  });
});

describe("메신저 열기", () => {
  test("알림 동작이 남아 있으면 그 대화방을 바로 연다", async () => {
    const { native, calls } = fakeNative({ rooms: [`${KAKAO}::room-1`] });
    await createDeviceMessengerService(native).openApp(
      "KAKAOTALK",
      toConversationKey(KAKAO, "room-1")
    );
    expect(calls).toEqual([`room:${KAKAO}::room-1`]);
  });

  test("대화방 동작이 없으면(앱 재시작 등) 그 알림을 보낸 앱의 첫 화면을 연다", async () => {
    const { native, calls } = fakeNative();
    // 문자 대화가 Google 메시지에서 왔으면 삼성 메시지가 아니라 그 앱을 엶
    const google = "com.google.android.apps.messaging";
    const withGoogle = fakeNative({ installed: [google] });
    await createDeviceMessengerService(withGoogle.native).openApp(
      "SMS",
      toConversationKey(google, "tel:01000000000")
    );
    expect(withGoogle.calls).toEqual([`app:${google}`]);

    await createDeviceMessengerService(native).openApp(
      "KAKAOTALK",
      toConversationKey(KAKAO, "room-9")
    );
    expect(calls).toEqual([`app:${KAKAO}`]);
  });

  test("대화방 id가 없으면(친구에게 첫마디) 연동 앱 패키지로 연다", async () => {
    const { native, calls } = fakeNative();
    await createDeviceMessengerService(native).openApp("INSTAGRAM");
    expect(calls).toEqual(["app:com.instagram.android"]);
  });

  test("기기 대화방 키가 아닌 id(mock 대화 등)는 무시하고 연동 앱으로 연다", async () => {
    const { native, calls } = fakeNative();
    await createDeviceMessengerService(native).openApp("KAKAOTALK", "mock-1");
    expect(calls).toEqual([`app:${KAKAO}`]);
  });

  test("문자는 기기의 기본 문자 앱을 먼저 쓴다", async () => {
    const google = "com.google.android.apps.messaging";
    const { native, calls } = fakeNative({ installed: [google], defaultSms: google });
    await createDeviceMessengerService(native).openApp("SMS");
    expect(calls).toEqual([`app:${google}`]);
  });

  test("기본 문자 앱을 모르면 연동 앱 패키지(삼성 메시지)로 연다", async () => {
    const { native, calls } = fakeNative();
    await createDeviceMessengerService(native).openApp("SMS");
    expect(calls).toEqual(["app:com.samsung.android.messaging"]);
  });

  test("앱이 설치되어 있지 않으면 APP_NOT_INSTALLED", async () => {
    const { native } = fakeNative({ installed: [] });
    const error = await createDeviceMessengerService(native)
      .openApp("KAKAOTALK", toConversationKey(KAKAO, "room-1"))
      .catch(e => e);
    expect(getErrorCode(error)).toBe(CONVERSATION_ERROR_CODE.appNotInstalled);
  });
});

describe("바로 답장 (아직 없음)", () => {
  test("바로 답장은 쓸 수 없다고 알려서 화면이 버튼을 숨긴다", async () => {
    const { native } = fakeNative();
    const service = createDeviceMessengerService(native);
    expect(await service.canReplyDirectly("x")).toBe(false);
    const error = await service.sendReply("x", "좋아").catch(e => e);
    expect(getErrorCode(error)).toBe(CONVERSATION_ERROR_CODE.replyUnavailable);
  });
});

describe("AI 마스킹에 내 이름 넣기", () => {
  test.each([
    ["권민재", ["권민재", "민재"]],
    ["남궁민수", ["남궁민수", "민수"]],
    ["이산", ["이산"]],
    ["  김지은 ", ["김지은", "지은"]],
    ["Alex", ["Alex"]],
    ["", []],
  ])("%s → %j", (name, expected) => {
    expect(toMaskNames(name)).toEqual(expected);
  });

  test("로그인하면 이름이 들어가고 로그아웃하면 비워진다", () => {
    const store = createMaskNameStore();
    store.setUserName("권민재");
    expect(store.get()).toEqual(["권민재", "민재"]);
    store.setUserName(null);
    expect(store.get()).toEqual([]);
  });

  test("본문에 나온 내 이름은 AI로 보내기 전에 가려진다", async () => {
    const sent: AiReplyRequest[] = [];
    const base = createMockAiReplyService();
    const ai: AiReplyService = {
      reply: async req => {
        sent.push(req);
        return base.reply(req);
      },
    };
    const names = createMaskNameStore();
    names.setUserName("권민재");
    const row: StoredNotification = {
      id: 1,
      packageName: KAKAO,
      appName: "카카오톡",
      conversationId: "room-1",
      conversationTitle: "지은",
      messageId: null,
      isMention: false,
      contentType: "text",
      isPlaceholder: false,
      senderId: null,
      sender: "지은",
      text: "민재야 권민재 맞지? 토요일에 저녁 먹을래?",
      isGroupConversation: false,
      messageTime: 1_000,
      savedAt: 1_000,
    };
    const storage = createMemoryStorage();
    const service = createDeviceConversationService({
      source: {
        getNotifications: async () => [row],
        getConversationMessages: async () => [row],
      },
      storage,
      ai,
      aiReplies: createKeyValueAiReplyStore(storage),
      getMaskNames: async () => names.get(),
    });

    await service.analyze(toConversationKey(KAKAO, "room-1"));

    expect(sent).toHaveLength(1);
    expect(sent[0].text).not.toContain("민재");
    expect(sent[0].text).not.toContain("지은");
    expect(sent[0].text).toMatch(/\[이름\d+\]/);
  });
});
