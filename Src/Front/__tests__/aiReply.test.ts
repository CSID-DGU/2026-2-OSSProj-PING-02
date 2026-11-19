import {
  AI_ERROR_CODE,
  classifyNeedsDecision,
  classifyRelation,
  createHttpAiReplyService,
  createKeyValueAiReplyStore,
  maskConversation,
  requestAiReply,
  ServiceError,
  type AiReplyRequest,
  type AiReplyService,
} from "../src/services";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";

const relationOf = (senderName: string, texts: string[] = []) =>
  classifyRelation({ senderName, texts }).value;
const decisionOf = (...texts: string[]) => classifyNeedsDecision(texts).value;

describe("relation 규칙", () => {
  test("사용자 설정이 규칙보다 먼저다", () => {
    expect(
      classifyRelation({ saved: "SUPERIOR", senderName: "민수", texts: [] })
        .value
    ).toBe("SUPERIOR");
  });

  test("기관·번호 발신자·광고 문자는 INSTITUTION", () => {
    expect(relationOf("1588-0000")).toBe("INSTITUTION");
    expect(relationOf("국민건강보험공단")).toBe("INSTITUTION");
    expect(relationOf("민수", ["[Web발신] 고객님 택배가 도착했습니다"])).toBe(
      "INSTITUTION"
    );
  });

  test("호칭·직함이나 존댓말을 쓰는 상대는 SUPERIOR", () => {
    expect(relationOf("김팀장님", ["내일 보고서 줘"])).toBe("SUPERIOR");
    expect(relationOf("박교수")).toBe("SUPERIOR");
    expect(relationOf("지은", ["안녕하세요", "내일 시간 괜찮으세요?"])).toBe(
      "SUPERIOR"
    );
  });

  test("그 밖에는 FRIEND", () => {
    expect(relationOf("민수", ["야 뭐해", "밥 먹었어?"])).toBe("FRIEND");
  });
});

describe("needsDecision 규칙", () => {
  test("초대·부탁·제안이면 true", () => {
    expect(decisionOf("이번 주 금요일에 저녁 먹을래?")).toBe(true);
    expect(decisionOf("다음 주에 집들이 와!")).toBe(true);
    expect(decisionOf("내일 시간 돼?")).toBe(true);
    expect(decisionOf("이것 좀 도와줄 수 있어?")).toBe(true);
    expect(decisionOf("주말에 영화 보자")).toBe(true);
    expect(decisionOf("내일 몇 시에 만날까?")).toBe(true);
    expect(decisionOf("결혼식 참석 여부 회신 부탁드립니다")).toBe(true);
  });

  test("안부·정보·고마움이면 false", () => {
    expect(decisionOf("오늘 날씨 좋다")).toBe(false);
    expect(decisionOf("어제 도와줘서 고마워")).toBe(false);
    expect(decisionOf("그래? 몰랐네")).toBe(false);
    expect(decisionOf("걔가 뭐래?")).toBe(false);
    expect(decisionOf("남자 친구랑 과자 먹는 중")).toBe(false);
  });

  test("직접 지정하면 그 값을 쓴다", () => {
    expect(classifyNeedsDecision(["오늘 날씨 좋다"], true).value).toBe(true);
  });
});

describe("maskConversation", () => {
  test("보낸 사람: 내용 줄로 이어 붙여 가린다", () => {
    const masked = maskConversation(
      [
        { sender: "김민수", text: "내 번호 010-1234-5678" },
        { sender: "김민수", text: "저장해줘" },
      ],
      ["김민수"]
    );
    expect(masked.text).toBe("[이름1]: 내 번호 [전화번호1]\n[이름1]: 저장해줘");
  });

  test("상한을 넘으면 오래된 메시지부터 빼고, 하나만 남으면 앞부분을 잘라 다시 가린다", () => {
    const old = { sender: "민수", text: "가".repeat(80) };
    const latest = { sender: "민수", text: "나".repeat(30) + " 010-1234-5678" };
    const masked = maskConversation([old, latest], ["민수"], 60);
    expect(masked.text.startsWith("[이름1]: 나")).toBe(true);
    expect(masked.text.length).toBeLessThanOrEqual(60);

    const long = maskConversation(
      [{ sender: "민수", text: "다".repeat(200) + " 끝 010-1234-5678" }],
      ["민수"],
      60
    );
    expect(long.text.length).toBeLessThanOrEqual(60);
    expect(long.text).toContain("[전화번호1]");
    expect(long.text).not.toContain("010");
  });
});

describe("requestAiReply", () => {
  const makeDeps = () => {
    const sent: AiReplyRequest[] = [];
    const ai: AiReplyService = {
      async reply(request) {
        sent.push(request);
        return {
          summary: "[이름1]가 금요일 저녁을 제안했어요.",
          replies: [
            { label: "수락", text: "[이름1]아 좋아! [주소1]로 갈게" },
            { label: "보류", text: "일정 보고 알려줄게" },
            { label: "거절", text: "이번엔 어려워 미안" },
          ],
        };
      },
    };
    const store = createKeyValueAiReplyStore(createMemoryStorage());
    return { sent, ai, store };
  };

  test("가린 문장만 보내고, 되돌린 결과를 로컬에 저장한다", async () => {
    const { sent, ai, store } = makeDeps();
    const saved = await requestAiReply(
      {
        conversationId: "room-1",
        names: ["김지은"],
        messages: [
          { sender: "지은", text: "이번 주 금요일에 저녁 먹을래?" },
          {
            sender: "지은",
            text: "서울특별시 마포구 월드컵로 212로 와. 내 번호 010-1234-5678",
          },
        ],
      },
      { ai, store, now: () => 1000, createId: () => "r1" }
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      text: "[이름1]: 이번 주 금요일에 저녁 먹을래?\n[이름1]: [주소1]로 와. 내 번호 [전화번호1]",
      relation: "FRIEND",
      needsDecision: true,
    });
    // 원문 개인정보는 서버로 가지 않음
    expect(sent[0].text).not.toMatch(/지은|010|월드컵로/);

    expect(saved).toEqual({
      id: "r1",
      conversationId: "room-1",
      createdAt: 1000,
      relation: "FRIEND",
      needsDecision: true,
      summary: "지은이 금요일 저녁을 제안했어요.",
      replies: [
        {
          label: "수락",
          text: "지은아 좋아! 서울특별시 마포구 월드컵로 212로 갈게",
        },
        { label: "보류", text: "일정 보고 알려줄게" },
        { label: "거절", text: "이번엔 어려워 미안" },
      ],
    });
    expect(await store.listByConversation("room-1")).toEqual([saved]);
  });

  test("내 메시지는 관계·결정 판단에서 빼고, 기관 발신자 이름은 가리지 않는다", async () => {
    const { sent, ai, store } = makeDeps();
    await requestAiReply(
      {
        conversationId: "room-2",
        names: [],
        messages: [
          { sender: "나", text: "내일 같이 밥 먹을래?", fromMe: true },
          { sender: "국민건강보험", text: "[Web발신] 건강검진 대상자입니다" },
        ],
      },
      { ai, store }
    );
    expect(sent[0].relation).toBe("INSTITUTION");
    expect(sent[0].needsDecision).toBe(false);
    expect(sent[0].text).toContain("국민건강보험: [Web발신]");
  });

  test("오프라인이면 서버를 부르지 않는다", async () => {
    const { sent, ai, store } = makeDeps();
    await expect(
      requestAiReply(
        {
          conversationId: "room-3",
          names: [],
          messages: [{ sender: "민수", text: "뭐해?" }],
        },
        { ai, store, network: { getConnectionType: async () => "none" } }
      )
    ).rejects.toBeInstanceOf(ServiceError);
    expect(sent).toHaveLength(0);
  });

  test("서버 오류는 저장하지 않고 그대로 올려 보낸다", async () => {
    const store = createKeyValueAiReplyStore(createMemoryStorage());
    const ai: AiReplyService = {
      reply: async () => {
        throw new ServiceError(
          AI_ERROR_CODE.upstreamTimeout,
          "다시 시도해 주세요"
        );
      },
    };
    await expect(
      requestAiReply(
        {
          conversationId: "room-4",
          names: [],
          messages: [{ sender: "민수", text: "뭐해?" }],
        },
        { ai, store }
      )
    ).rejects.toMatchObject({ code: AI_ERROR_CODE.upstreamTimeout });
    expect(await store.listByConversation("room-4")).toEqual([]);
  });
});

describe("createHttpAiReplyService", () => {
  const ok = {
    summary: "요약",
    replies: [
      { label: "짧게", text: "응" },
      { label: "다정하게", text: "고마워" },
      { label: "공손하게", text: "감사합니다" },
    ],
  };
  const jsonResponse = (status: number, body: unknown) =>
    ({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    } as Response);
  const request: AiReplyRequest = {
    text: "[이름1]: 뭐해?",
    relation: "FRIEND",
    needsDecision: false,
  };

  test("401이면 토큰을 한 번 갱신하고 다시 보낸다", async () => {
    const calls: Array<{ url: string; auth?: string; body: string }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      calls.push({ url, auth: headers.Authorization, body: String(init.body) });
      return calls.length === 1 ? jsonResponse(401, {}) : jsonResponse(200, ok);
    }) as unknown as typeof fetch;

    const service = createHttpAiReplyService({
      baseUrl: "https://api.test/v1",
      getAccessToken: async () => "old",
      refreshAccessToken: async () => "new",
      fetchImpl,
    });
    await expect(service.reply(request)).resolves.toEqual(ok);
    expect(calls.map((c) => [c.url, c.auth])).toEqual([
      ["https://api.test/v1/ai/reply", "Bearer old"],
      ["https://api.test/v1/ai/reply", "Bearer new"],
    ]);
    expect(JSON.parse(calls[0].body)).toEqual(request);
  });

  test("서버 에러 형식을 ServiceError로 바꾼다", async () => {
    const fetchImpl = (async () =>
      jsonResponse(400, {
        error: { code: "UNMASKED_CONTENT", message: "개인정보가 남아 있어요" },
      })) as unknown as typeof fetch;
    const service = createHttpAiReplyService({
      baseUrl: "https://api.test/v1",
      getAccessToken: async () => "t",
      fetchImpl,
    });
    await expect(service.reply(request)).rejects.toMatchObject({
      code: AI_ERROR_CODE.unmaskedContent,
      message: "개인정보가 남아 있어요",
    });
  });
});
