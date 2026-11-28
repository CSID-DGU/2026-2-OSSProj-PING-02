import type { StoredNotification } from "@native/NotificationStore";
import { ServiceError } from "../common";
import {
  parseAiReplyResponse,
  type AiReplyService,
  type AiStance,
  type AiTone,
} from "../ai/AiReplyService";
import type { AiReplyStore, SavedAiReply } from "../ai/AiReplyStore";
import { classifyNeedsDecision, looksLikeInstitution } from "../ai/classifyMessage";
import { requestAiReply, type ConversationMessage } from "../ai/requestAiReply";
import type { NetworkService } from "../network/NetworkService";
import type { KeyValueStorage } from "../storage/KeyValueStorage";
import {
  CONVERSATION_ERROR_CODE,
  type ConversationService,
} from "./ConversationService";
import type {
  Analysis,
  AnalysisTag,
  Conversation,
  ConversationDetail,
  ConversationSummary,
  DeferredReply,
  Message,
  MessengerApp,
  ReplyCandidate,
  ReplyStance,
  ReplyTone,
} from "./types";

// 기기에 쌓인 알림 메시지(Kotlin 알림 수집 모듈의 로컬 DB)로 연락 화면을 채우는 구현
//
// - 목록의 분석(질문·멘션·답장 필요 등)은 기기 안 규칙으로만 함. 목록을 보는 것만으로는 아무것도 보내지 않음
// - AI(POST /v1/ai/reply)는 사용자가 대화방을 열었을 때 그 대화방 하나만 한 번 호출해서 요약·답장 후보를 받고,
//   결과는 기기에 저장해 답장 화면에서 다시 씀. 새 메시지가 오기 전까지 다시 보내지 않음
// - 결정(수락·보류·거절)이 필요한 메시지인지는 AI가 요약하면서 판단함. AI 결과가 있으면 그 판단으로
//   "question" 태그를 정해서 답장 화면 갈래(입장 먼저 / 말투 바로)가 AI 판단을 따름.
//   AI 결과가 아직 없을 때(목록)만 기기 규칙으로 대신함
//   결정이 필요하면 답장 9개(입장 3 × 말투 3), 아니면 3개(말투)를 한 번에 받음
//   (기관·번호 발신자, 안내 문구만 있는 대화는 보내지 않음)
// - 마스킹·전송·되돌리기·로컬 저장은 requestAiReply가 함
// - 답장함·확인함·나중에 답하기 상태는 KeyValueStorage에 저장. 새 메시지가 오면 답장함·확인함은 풀림

/** 수집 앱 패키지 → 화면에서 쓰는 메신저 구분 */
const PACKAGE_TO_APP: Record<string, MessengerApp> = {
  "com.kakao.talk": "KAKAOTALK",
  "com.instagram.android": "INSTAGRAM",
  "com.samsung.android.messaging": "SMS",
  "com.google.android.apps.messaging": "SMS",
};

/** 목록을 만들 때 읽을 최근 메시지 수 */
const LIST_LIMIT = 1000;
/** 상세에서 보여 줄 대화방 메시지 수 */
const DETAIL_LIMIT = 200;
/** AI에 넘길 최근 메시지 수 (서버 1,000자 상한은 requestAiReply가 오래된 것부터 잘라 맞춤) */
const AI_MESSAGE_LIMIT = 20;
export const STATE_KEY = "malssiat.deviceConversationState";

// 기기 안 규칙 (요약은 AI가 만든 것만 씀)
const OCCASION_RE = /결혼|청첩|부고|별세|장례|발인|조문|돌잔치|칠순|팔순|환갑/;
const DEADLINE_RE =
  /마감|기한|까지\s*(?:제출|납부|회신|신청|등록|입금)|D-\d+|디데이/;

const TONE_FROM_AI: Record<AiTone, ReplyTone> = {
  SHORT: "short",
  WARM: "warm",
  POLITE: "polite",
};
const STANCE_FROM_AI: Record<AiStance, ReplyStance> = {
  ACCEPT: "accept",
  HOLD: "hold",
  DECLINE: "decline",
};
const TONES: ReplyTone[] = ["short", "warm", "polite"];

/** 알림 메시지 출처. 기본은 네이티브 NotificationStore, 테스트에서는 가짜를 넣음 */
export interface DeviceMessageSource {
  getNotifications(options: { limit?: number }): Promise<StoredNotification[]>;
  /** 새 메시지가 저장될 때마다 부름 (#71). 없으면 목록은 화면에 들어올 때만 바뀜 */
  onSaved?(listener: () => void): () => void;
  getConversationMessages(
    packageName: string,
    conversationId: string,
    limit?: number
  ): Promise<StoredNotification[]>;
}

export interface DeviceConversationDeps {
  source: DeviceMessageSource;
  storage: KeyValueStorage;
  ai: AiReplyService;
  aiReplies: AiReplyStore;
  network?: NetworkService;
  /** 가릴 이름 (사용자 본인·친구 이름·별명). 보낸 사람 이름은 requestAiReply가 자동으로 더함 */
  getMaskNames?: () => Promise<string[]>;
}

interface StoredState {
  /** 대화방 id → 답장한 시각(ms). 그 뒤에 온 메시지가 있으면 다시 답장 필요 */
  replied: Record<string, number>;
  /** 대화방 id → 확인만 한 시각(ms) */
  checked: Record<string, number>;
  deferred: Record<string, DeferredReply>;
}

const emptyState = (): StoredState => ({ replied: {}, checked: {}, deferred: {} });

// 화면에서 쓰는 대화방 id: "패키지::대화방ID" (대화방 ID는 앱마다 겹칠 수 있어 앱을 붙임)
const SEPARATOR = "::";
export const toConversationKey = (packageName: string, conversationId: string) =>
  `${packageName}${SEPARATOR}${conversationId}`;
export const parseConversationKey = (key: string) => {
  const i = key.indexOf(SEPARATOR);
  if (i < 0) {
    throw new ServiceError(CONVERSATION_ERROR_CODE.notFound, "대화를 찾을 수 없습니다.");
  }
  return { packageName: key.slice(0, i), conversationId: key.slice(i + SEPARATOR.length) };
};

const iso = (ms: number) => new Date(ms).toISOString();
const byTimeAsc = (a: StoredNotification, b: StoredNotification) =>
  a.messageTime - b.messageTime || a.id - b.id;

const toMessage = (key: string, row: StoredNotification): Message => ({
  id: String(row.id),
  conversationId: key,
  // 보낸 사람 구분용. 나(null)는 알림에 거의 오지 않아 아직 구분하지 않음
  // TODO(알림 수집): 내가 알림에서 바로 답장한 메시지를 from_me로 저장하면 null로
  accountId: row.senderId ?? `name:${row.sender}`,
  senderName: row.sender,
  text: row.text,
  receivedAt: iso(row.messageTime),
  // TODO(알림 수집): 카카오톡이 알림에서 자른 긴 메시지 판별 규칙
  truncated: false,
});

const toConversation = (key: string, rows: StoredNotification[]): Conversation => {
  const last = rows[rows.length - 1];
  const group = rows.some(r => r.isGroupConversation);
  return {
    id: key,
    app: PACKAGE_TO_APP[last.packageName],
    kind: group ? "group" : "direct",
    // 이름을 모르는 단톡방은 앱 이름으로 대신 보여 줌
    title: last.conversationTitle || (group ? `${last.appName} 단체방` : last.sender),
    // TODO(친구): senderId로 친구와 연결
    personId: null,
    lastMessageAt: iso(last.messageTime),
  };
};

/**
 * 기기 안 규칙으로 하는 분석. 답장했거나 확인한 뒤에 온 메시지(fresh)만 본다.
 * - question: 수락·거절을 정해야 하는 말. AI 결과가 있으면 AI 판단(aiNeedsDecision), 없으면 classifyNeedsDecision
 * - occasion·deadline: 경조사·마감 낱말
 * - info: 기관·번호 발신자
 */
export const analyzeLocally = (
  kind: Conversation["kind"],
  rows: StoredNotification[],
  handledAt: number,
  aiSummary?: string,
  aiNeedsDecision?: boolean
): Analysis => {
  const fresh = rows.filter(r => r.messageTime > handledAt);
  const recentTexts = fresh
    .filter(r => !r.isPlaceholder)
    .slice(-5)
    .map(r => r.text);
  const lastSender = rows[rows.length - 1]?.sender ?? "";

  const tags: AnalysisTag[] = [];
  const decision =
    recentTexts.length > 0 &&
    (aiNeedsDecision ?? classifyNeedsDecision(recentTexts.slice(-3)).value);
  if (decision) tags.push("question");
  if (recentTexts.some(t => OCCASION_RE.test(t))) tags.push("occasion");
  if (recentTexts.some(t => DEADLINE_RE.test(t))) tags.push("deadline");
  const institution = looksLikeInstitution(lastSender);
  if (institution) tags.push("info");

  const mentionIds = fresh.filter(r => r.isMention).map(r => String(r.id));
  const mentionsMe = mentionIds.length > 0;
  const needsReply =
    fresh.length > 0 &&
    !institution &&
    (kind === "direct" || mentionsMe || tags.includes("question"));

  const priority: Analysis["priority"] = institution
    ? "low"
    : tags.includes("occasion") || tags.includes("deadline") || (kind === "group" && mentionsMe)
    ? "high"
    : "normal";

  return {
    conversationId: "",
    status: "done",
    summary: aiSummary,
    needsReply,
    mentionsMe,
    tags,
    priority,
    highlightedMessageIds: mentionIds,
  };
};

export const createDeviceConversationService = ({
  source,
  storage,
  ai,
  aiReplies,
  network,
  getMaskNames = async () => [],
}: DeviceConversationDeps): ConversationService => {
  const readState = async (): Promise<StoredState> => {
    const raw = await storage.getItem(STATE_KEY);
    if (!raw) return emptyState();
    try {
      return { ...emptyState(), ...(JSON.parse(raw) as StoredState) };
    } catch {
      return emptyState();
    }
  };
  const writeState = (state: StoredState) =>
    storage.setItem(STATE_KEY, JSON.stringify(state));
  const updateState = async (fn: (s: StoredState) => void) => {
    const state = await readState();
    fn(state);
    await writeState(state);
  };

  const loadRows = async (key: string) => {
    const { packageName, conversationId } = parseConversationKey(key);
    const rows = await source.getConversationMessages(packageName, conversationId, DETAIL_LIMIT);
    if (rows.length === 0) {
      throw new ServiceError(CONVERSATION_ERROR_CODE.notFound, "대화를 찾을 수 없습니다.");
    }
    return [...rows].sort(byTimeAsc);
  };

  /**
   * 마지막 메시지 이후에 만든 AI 결과 (그 전 것은 지난 대화라 쓰지 않음).
   * 예전 형식으로 저장된 결과(#65 전, replies[{ label }])는 답장 화면에서 쓸 수 없어 없는 것으로 보고 다시 받음
   */
  const latestAiReply = async (key: string, lastMessageTime: number) => {
    const saved = await aiReplies.listByConversation(key);
    return saved.find(r => r.createdAt >= lastMessageTime && parseAiReplyResponse(r) !== null);
  };

  /** AI로 보낼 대화 내용이 있는지 (안내 문구만 있거나 기관·번호 발신자면 보내지 않음) */
  const canAskAi = (rows: StoredNotification[], analysis: Analysis) =>
    !analysis.tags.includes("info") && rows.some(r => !r.isPlaceholder);

  /**
   * @param forDetail 대화방을 연 경우. 아직 AI 요약이 없으면 status를 "pending"으로 돌려서
   *   상세 화면이 analyze를 한 번 부르게 함 (= 대화방을 열 때만 AI 호출).
   *   목록은 항상 "done"이라 목록을 보는 것만으로는 아무것도 보내지 않음.
   */
  const summarize = async (
    key: string,
    rows: StoredNotification[],
    state: StoredState,
    forDetail = false
  ): Promise<ConversationSummary> => {
    const conversation = toConversation(key, rows);
    const last = rows[rows.length - 1];
    const handledAt = Math.max(state.replied[key] ?? 0, state.checked[key] ?? 0);
    const saved = await latestAiReply(key, last.messageTime);
    const analysis: Analysis = {
      ...analyzeLocally(conversation.kind, rows, handledAt, saved?.summary, saved?.needsDecision),
      conversationId: key,
    };
    if (forDetail && !saved && canAskAi(rows, analysis)) {
      analysis.status = "pending";
    }
    return {
      conversation,
      lastMessage: toMessage(key, last),
      analysis,
      deferred: state.deferred[key],
      replied: (state.replied[key] ?? 0) >= last.messageTime,
    };
  };

  // 같은 대화의 AI 요청이 동시에 여러 번 오면 한 번만 보냄
  // (09-A 입장 선택 화면은 수락·보류·거절 후보를 동시에 요청함)
  const inFlight = new Map<string, Promise<SavedAiReply>>();

  const aiReplyFor = async (key: string): Promise<SavedAiReply> => {
    const running = inFlight.get(key);
    if (running) return running;

    const rows = await loadRows(key);
    const last = rows[rows.length - 1];
    const cached = await latestAiReply(key, last.messageTime);
    if (cached) return cached;
    // 기다리는 사이 다른 호출이 먼저 보냈을 수 있음
    const started = inFlight.get(key);
    if (started) return started;

    // 안내 문구("사진을 보냈습니다." 등)는 대화 내용이 아니라서 AI에 보내지 않음
    const messages: ConversationMessage[] = rows
      .filter(r => !r.isPlaceholder)
      .slice(-AI_MESSAGE_LIMIT)
      .map(r => ({ sender: r.sender, text: r.text }));
    if (messages.length === 0) {
      throw new ServiceError(
        CONVERSATION_ERROR_CODE.analysisFailed,
        "알림에 내용이 없어서 답장 후보를 만들 수 없어요"
      );
    }

    const request = (async () =>
      requestAiReply(
        { conversationId: key, messages, names: await getMaskNames() },
        { ai, store: aiReplies, network }
      ))();
    inFlight.set(key, request);
    try {
      return await request;
    } finally {
      inFlight.delete(key);
    }
  };

  const service: ConversationService = {
    onChange: listener => source.onSaved?.(listener) ?? (() => {}),
    async list() {
      const [rows, state] = await Promise.all([
        source.getNotifications({ limit: LIST_LIMIT }),
        readState(),
      ]);
      const groups = new Map<string, StoredNotification[]>();
      for (const row of rows) {
        if (!PACKAGE_TO_APP[row.packageName]) continue;
        const key = toConversationKey(row.packageName, row.conversationId);
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
      }
      const summaries = await Promise.all(
        [...groups.entries()].map(([key, list]) => summarize(key, [...list].sort(byTimeAsc), state))
      );
      return summaries.sort((a, b) =>
        b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt)
      );
    },

    async get(key) {
      const [rows, state] = await Promise.all([loadRows(key), readState()]);
      const detail: ConversationDetail = {
        ...(await summarize(key, rows, state, true)),
        messages: rows.map(r => toMessage(key, r)),
        // TODO(캘린더): 메시지에서 일정 뽑기
        events: [],
      };
      return detail;
    },

    async analyze(key) {
      // 상세 화면이 대화방을 열었을 때만 부름 (get이 "pending"을 돌려준 경우).
      // 요약과 답장 후보를 한 번에 받아 저장해 두고, 답장 화면에서는 저장된 결과를 다시 씀
      const detail = await service.get(key);
      const { analysis } = detail;
      if (analysis.status !== "pending") return analysis;
      try {
        const reply = await aiReplyFor(key);
        // 저장된 결과로 다시 분석: 요약과 AI의 결정 판단("question" 태그 → 답장 화면 갈래)이 함께 반영됨
        const next = (await service.get(key)).analysis;
        // 보내는 사이 새 메시지가 와서 결과가 지난 것이 됐어도 이번에 받은 요약은 보여 줌 (다시 부르지 않게)
        return next.status === "pending" ? { ...next, status: "done", summary: reply.summary } : next;
      } catch {
        // 실패해도 받은 메시지는 그대로 보이고, 사용자가 직접 답장을 쓸 수 있음
        return { ...analysis, status: "failed" };
      }
    },

    async getReplyCandidates(key, { tone, stance }) {
      const reply = await aiReplyFor(key);
      const ordered = [tone, ...TONES.filter(t => t !== tone)];
      // 결정이 필요한 메시지면 9개 중 고른 입장의 3개, 아니면 입장 없는 3개
      const pool = reply.replies.filter(r =>
        stance ? r.stance && STANCE_FROM_AI[r.stance] === stance : !r.stance
      );
      if (pool.length === 0) {
        // 화면 갈래와 AI 판단이 엇갈린 경우 (예: AI 분석 전에 기기 규칙으로 화면을 고른 뒤 받은 결과가 다름)
        // 결과는 저장돼 있어 다시 불러도 같으므로, 화면이 이 코드를 보고 맞는 갈래로 바꿔 감
        throw new ServiceError(
          CONVERSATION_ERROR_CODE.replyStepMismatch,
          "이 메시지에 맞는 답장 화면이 달라요"
        );
      }
      return ordered
        .map(t => ({ t, text: pool.find(r => TONE_FROM_AI[r.tone] === t)?.text }))
        .filter((c): c is { t: ReplyTone; text: string } => !!c.text)
        .map<ReplyCandidate>(({ t, text }) => ({
          id: stance ? `${reply.id}-${stance}-${t}` : `${reply.id}-${t}`,
          conversationId: key,
          tone: t,
          ...(stance ? { stance } : {}),
          text,
        }));
    },

    async summarizePasted(key, text) {
      const trimmed = text.trim();
      if (!trimmed) {
        throw new ServiceError(CONVERSATION_ERROR_CODE.analysisFailed, "요약할 내용이 없습니다.");
      }
      const rows = await loadRows(key);
      const last = rows[rows.length - 1];
      const saved = await requestAiReply(
        {
          conversationId: key,
          messages: [{ sender: last.sender || toConversation(key, rows).title, text: trimmed }],
          names: await getMaskNames(),
        },
        { ai, store: aiReplies, network }
      );
      return saved.summary;
    },

    async markChecked(key) {
      await updateState(s => {
        s.checked[key] = Date.now();
        delete s.deferred[key];
      });
    },

    async markReplied(key) {
      await updateState(s => {
        s.replied[key] = Date.now();
        delete s.deferred[key];
      });
    },

    async deferReply(key, remindAt) {
      const rows = await loadRows(key);
      const last = rows.filter(r => !r.isPlaceholder).pop() ?? rows[rows.length - 1];
      const saved = await latestAiReply(key, rows[rows.length - 1].messageTime);
      const item: DeferredReply = {
        id: `d-${key}`,
        conversationId: key,
        remindAt,
        topic: saved?.summary ?? last.text,
        createdAt: new Date().toISOString(),
      };
      await updateState(s => {
        s.deferred[key] = item;
      });
      return item;
    },

    async cancelDeferred(key) {
      await updateState(s => {
        delete s.deferred[key];
      });
    },

    async getSmallAction() {
      const items = await service.list();
      // 결정이 필요 없는 1:1 연락 중 가장 최근 것을 아주 작은 행동으로 제안
      const pick = items.find(
        i =>
          i.conversation.kind === "direct" &&
          i.analysis.needsReply &&
          !i.analysis.tags.includes("question") &&
          !i.deferred
      );
      if (!pick) {
        return {
          conversationId: null,
          text: "오늘은 쉬어 가도 괜찮아요. 마음이 내킬 때 둘러봐요.",
        };
      }
      return {
        conversationId: pick.conversation.id,
        text: `${pick.conversation.title}에게 "고마워" 한마디만 건네 볼까요?`,
      };
    },

    // TODO(캘린더): 메시지에서 일정 뽑기 (get()의 events와 같이). 지금은 없음
    async listEvents() {
      return [];
    },
  };
  return service;
};
