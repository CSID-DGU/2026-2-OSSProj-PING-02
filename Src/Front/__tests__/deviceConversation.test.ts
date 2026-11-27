import type { StoredNotification } from "../src/native/NotificationStore";
import {
  createDeviceConversationService,
  toConversationKey,
  type DeviceMessageSource,
} from "../src/services/conversation/deviceConversationService";
import {
  createKeyValueAiReplyStore,
  createMockAiReplyService,
  type AiReplyRequest,
  type AiReplyService,
} from "../src/services";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";

// 알림 수집 모듈이 로컬 DB에 저장한 메시지로 연락 화면 데이터를 만드는 서비스 테스트

const KAKAO = "com.kakao.talk";
let nextId = 1;

const row = (over: Partial<StoredNotification>): StoredNotification => ({
  id: nextId++,
  packageName: KAKAO,
  appName: "카카오톡",
  conversationId: "room-1",
  conversationTitle: "민지",
  messageId: null,
  isMention: false,
  contentType: "text",
  isPlaceholder: false,
  senderId: null,
  sender: "민지",
  text: "안녕",
  isGroupConversation: false,
  messageTime: 1_000,
  savedAt: 1_000,
  ...over,
});

const fakeSource = (rows: StoredNotification[]): DeviceMessageSource => ({
  getNotifications: async () => [...rows].reverse(),
  getConversationMessages: async (pkg, id) =>
    rows.filter(r => r.packageName === pkg && r.conversationId === id).reverse(),
});

const setup = (rows: StoredNotification[], ai: AiReplyService = createMockAiReplyService()) => {
  const storage = createMemoryStorage();
  const service = createDeviceConversationService({
    source: fakeSource(rows),
    storage,
    ai,
    aiReplies: createKeyValueAiReplyStore(storage),
  });
  return service;
};

const spyAi = () => {
  const calls: AiReplyRequest[] = [];
  const base = createMockAiReplyService();
  const ai: AiReplyService = {
    reply: async req => {
      calls.push(req);
      return base.reply(req);
    },
  };
  return { ai, calls };
};

beforeEach(() => {
  nextId = 1;
});

describe("목록", () => {
  test("대화방별로 묶고 최근 대화가 먼저 온다", async () => {
    const service = setup([
      row({ conversationId: "room-1", text: "어제 연락", messageTime: 1_000 }),
      row({ conversationId: "room-2", conversationTitle: "OSS_02_PING", sender: "선빈", isGroupConversation: true, text: "회의 언제?", messageTime: 3_000 }),
      row({ conversationId: "room-1", text: "오늘 연락", messageTime: 2_000 }),
    ]);

    const list = await service.list();

    expect(list.map(i => i.conversation.title)).toEqual(["OSS_02_PING", "민지"]);
    expect(list[0].conversation.kind).toBe("group");
    expect(list[1].lastMessage.text).toBe("오늘 연락");
    expect(list[1].conversation.app).toBe("KAKAOTALK");
  });

  test("수집 대상이 아닌 앱의 알림은 목록에 넣지 않는다", async () => {
    const service = setup([row({ packageName: "com.example.shop", conversationId: "x" })]);
    expect(await service.list()).toEqual([]);
  });

  test("목록은 기기 안 규칙으로만 분석하고 AI를 부르지 않는다", async () => {
    const { ai, calls } = spyAi();
    const service = setup(
      [
        row({ conversationId: "g", isGroupConversation: true, conversationTitle: "동아리", sender: "선빈", text: "저녁 같이 먹을래?", isMention: true }),
      ],
      ai
    );

    const [item] = await service.list();

    expect(item.analysis.status).toBe("done"); // 목록 화면이 analyze를 자동으로 부르지 않게
    expect(item.analysis.mentionsMe).toBe(true);
    expect(item.analysis.tags).toContain("question");
    expect(item.analysis.needsReply).toBe(true);
    expect(item.analysis.highlightedMessageIds).toEqual([item.lastMessage.id]);
    expect(calls).toHaveLength(0); // 목록을 보는 것만으로는 서버로 아무것도 보내지 않음
  });

  test("대화방을 열면 AI를 한 번 불러 요약을 만들고, 다시 열면 저장된 요약을 쓴다", async () => {
    const { ai, calls } = spyAi();
    const service = setup([row({ text: "토요일에 저녁 먹을래?" })], ai);
    const key = toConversationKey(KAKAO, "room-1");

    const opened = await service.get(key);
    expect(opened.analysis.status).toBe("pending"); // 상세 화면이 analyze를 부르게

    const analysis = await service.analyze(key);
    expect(analysis.status).toBe("done");
    expect(analysis.summary).toBeTruthy();
    expect(calls).toHaveLength(1);
    // 결정 여부는 AI가 판단 (앱은 보내지 않음). AI 판단이 "question" 태그 → 입장 선택 화면으로
    expect(calls[0]).not.toHaveProperty("needsDecision");
    expect(analysis.tags).toContain("question");

    const reopened = await service.get(key);
    expect(reopened.analysis.status).toBe("done");
    expect(reopened.analysis.summary).toBe(analysis.summary);
    // 답장 화면(입장 선택)도 저장된 결과를 써서 추가 호출이 없음
    await service.getReplyCandidates(key, { tone: "warm", stance: "accept" });
    expect(calls).toHaveLength(1);
  });

  test("AI가 실패하면 분석 실패로 표시하고 화면은 받은 메시지를 그대로 보여 줄 수 있다", async () => {
    const ai: AiReplyService = {
      reply: async () => {
        throw new Error("UPSTREAM_UNAVAILABLE");
      },
    };
    const service = setup([row({ text: "잘 지내?" })], ai);

    const analysis = await service.analyze(toConversationKey(KAKAO, "room-1"));

    expect(analysis.status).toBe("failed");
  });

  test("기관·번호 발신자 대화는 열어도 AI로 보내지 않는다", async () => {
    const { ai, calls } = spyAi();
    const service = setup([row({ sender: "1588-0000", conversationTitle: "1588-0000", text: "배송이 완료되었습니다" })], ai);
    const key = toConversationKey(KAKAO, "room-1");

    expect((await service.get(key)).analysis.status).toBe("done");
    await service.analyze(key);
    expect(calls).toHaveLength(0);
  });

  test("기관·번호 발신자는 정보성으로 보고 답장 필요로 띄우지 않는다", async () => {
    const service = setup([row({ sender: "1588-0000", conversationTitle: "1588-0000", text: "배송이 완료되었습니다" })]);
    const [item] = await service.list();
    expect(item.analysis.tags).toContain("info");
    expect(item.analysis.needsReply).toBe(false);
  });
});

describe("답장 상태", () => {
  test("답장한 뒤 새 메시지가 오면 다시 답장 필요가 된다", async () => {
    const rows = [row({ text: "잘 지내?", messageTime: 1_000 })];
    const service = setup(rows);
    const key = toConversationKey(KAKAO, "room-1");

    await service.markReplied(key);
    expect((await service.get(key)).analysis.needsReply).toBe(false);

    rows.push(row({ text: "바빠?", messageTime: Date.now() + 60_000 }));
    expect((await service.get(key)).analysis.needsReply).toBe(true);
  });
});

describe("AI 답장 후보", () => {
  test("안내 문구(사진·미리보기 꺼짐)는 AI로 보내지 않는다", async () => {
    const { ai, calls } = spyAi();
    const service = setup(
      [
        row({ text: "새로운 메시지가 있습니다.", isPlaceholder: true, messageTime: 1_000 }),
        row({ text: "사진을 보냈습니다.", isPlaceholder: true, contentType: "image", messageTime: 2_000 }),
        row({ text: "오늘 날씨 진짜 좋다", messageTime: 3_000 }),
      ],
      ai
    );

    const candidates = await service.getReplyCandidates(toConversationKey(KAKAO, "room-1"), { tone: "warm" });

    expect(calls).toHaveLength(1);
    expect(calls[0].text).not.toContain("새로운 메시지가 있습니다");
    expect(calls[0].text).not.toContain("사진을 보냈습니다");
    expect(calls[0].text).toContain("오늘 날씨 진짜 좋다");
    expect(calls[0].text).not.toContain("민지"); // 보낸 사람 이름은 가려서 보냄
    expect(candidates.map(c => c.tone)).toEqual(["warm", "short", "polite"]);
  });

  test("입장 3개를 동시에 요청해도 AI는 한 번만 부르고, 이후에는 저장된 결과를 쓴다", async () => {
    const { ai, calls } = spyAi();
    const service = setup([row({ text: "토요일에 놀러 올래?" })], ai);
    const key = toConversationKey(KAKAO, "room-1");

    const [accept, hold, decline] = await Promise.all(
      (["accept", "hold", "decline"] as const).map(stance =>
        service.getReplyCandidates(key, { tone: "warm", stance })
      )
    );
    await service.getReplyCandidates(key, { tone: "short", stance: "accept" });

    expect(calls).toHaveLength(1);
    expect(accept[0].stance).toBe("accept");
    expect(new Set([accept[0].text, hold[0].text, decline[0].text]).size).toBe(3);
    // 한 번 받은 9개에서 입장마다 말투 3개 (고른 말투가 먼저)
    for (const list of [accept, hold, decline]) {
      expect(list.map(c => c.tone)).toEqual(["warm", "short", "polite"]);
      expect(new Set(list.map(c => c.text)).size).toBe(3);
    }
  });

  test("AI가 결정이 필요 없다고 판단하면 기기 규칙이 질문으로 봤어도 말투 화면으로 간다", async () => {
    const ai: AiReplyService = {
      reply: async () => ({
        summary: "민지가 저녁 이야기를 했어요.",
        needsDecision: false,
        replies: [
          { tone: "SHORT", text: "그렇구나!" },
          { tone: "WARM", text: "알려줘서 고마워!" },
          { tone: "POLITE", text: "응, 알겠어" },
        ],
      }),
    };
    const service = setup([row({ text: "어제 저녁 먹을래? 했던 거 기억나?" })], ai);
    const key = toConversationKey(KAKAO, "room-1");

    expect((await service.get(key)).analysis.tags).toContain("question"); // 기기 규칙
    const analysis = await service.analyze(key);
    expect(analysis.tags).not.toContain("question"); // AI 판단을 따름
    expect((await service.list())[0].analysis.tags).not.toContain("question");

    const tones = await service.getReplyCandidates(key, { tone: "short" });
    expect(tones.map(c => c.text)).toEqual(["그렇구나!", "알려줘서 고마워!", "응, 알겠어"]);
    // 입장 선택 화면으로 잘못 들어가면 후보가 없다고 알림 (직접 쓰기로 이어짐)
    await expect(
      service.getReplyCandidates(key, { tone: "short", stance: "accept" })
    ).rejects.toMatchObject({ code: "ANALYSIS_FAILED" });
  });

  test("AI가 결정이 필요하다고 판단하면 기기 규칙에 단서가 없어도 입장 선택 화면으로 간다", async () => {
    const base = createMockAiReplyService();
    const ai: AiReplyService = { reply: req => base.reply({ ...req, needsDecision: true }) };
    const service = setup([row({ text: "이번 주말 어떻게 생각해" })], ai);
    const key = toConversationKey(KAKAO, "room-1");

    expect((await service.get(key)).analysis.tags).not.toContain("question");
    const analysis = await service.analyze(key);
    expect(analysis.tags).toContain("question");
  });

  test("AI가 만든 요약은 그 뒤 목록·상세에 쓰인다", async () => {
    const service = setup([row({ text: "다음 주에 밥 먹자" })]);
    const key = toConversationKey(KAKAO, "room-1");

    expect((await service.get(key)).analysis.summary).toBeUndefined();
    await service.getReplyCandidates(key, { tone: "warm", stance: "accept" });
    expect((await service.get(key)).analysis.summary).toBeTruthy();
  });

  test("내용 없는 알림만 있는 대화는 AI로 보내지 않고 안내한다", async () => {
    const { ai, calls } = spyAi();
    const service = setup([row({ text: "새로운 메시지가 있습니다.", isPlaceholder: true })], ai);

    await expect(
      service.getReplyCandidates(toConversationKey(KAKAO, "room-1"), { tone: "warm" })
    ).rejects.toMatchObject({ code: "ANALYSIS_FAILED" });
    expect(calls).toHaveLength(0);
  });
});
