import { delay, ServiceError } from "../common";
import {
  CONVERSATION_ERROR_CODE,
  type ConversationService,
  type MessengerService,
} from "./ConversationService";
import {
  DIRECT_REPLY_IDS,
  FALLBACK_TEXTS,
  PENDING_RESULTS,
  REPLY_TEXTS,
  SEEDS,
} from "./mockConversationData";
import type {
  Analysis,
  Conversation,
  ConversationDetail,
  ConversationSummary,
  DeferredReply,
  Message,
  ReplyCandidate,
  ReplyTone,
} from "./types";

interface MockOptions {
  latency?: number;
  // true면 목록 불러오기가 실패 (오류 화면 확인용)
  failList?: boolean;
  // true면 연락이 하나도 없음 (빈 상태 확인용)
  empty?: boolean;
}

const TONES: ReplyTone[] = ["short", "warm", "polite"];

export const createMockConversationService = ({
  latency = 500,
  failList = false,
  empty = false,
}: MockOptions = {}): ConversationService => {
  const seeds = empty ? [] : SEEDS;
  const analyses = new Map<string, Analysis>(
    seeds.map(s => [s.conversation.id, { ...s.analysis }])
  );
  const deferred = new Map<string, DeferredReply>();
  const replied = new Set<string>();
  let analysisOff = new Set<string>();
  const relations = new Map<
    string,
    Pick<Conversation, "relation" | "relationNote">
  >();

  const find = (id: string) => {
    const seed = seeds.find(s => s.conversation.id === id);
    if (!seed) {
      throw new ServiceError(
        CONVERSATION_ERROR_CODE.notFound,
        "대화를 찾을 수 없습니다."
      );
    }
    return seed;
  };

  // 붙여넣기로 보완한 메시지는 더 이상 잘린 메시지가 아님
  const resolved = new Set<string>();
  const messagesOf = (id: string): Message[] =>
    find(id).messages.map(m =>
      m.truncated && resolved.has(m.id) ? { ...m, truncated: false } : m
    );

  const summarize = (id: string): ConversationSummary => {
    const seed = find(id);
    const messages = messagesOf(id);
    return {
      conversation: { ...seed.conversation, ...relations.get(id) },
      lastMessage: messages[messages.length - 1],
      analysis: analyses.get(id)!,
      deferred: deferred.get(id),
      replied: replied.has(id),
    };
  };

  return {
    async list({ includeAnalysisOff = false } = {}) {
      await delay(latency);
      if (failList) {
        throw new ServiceError("NETWORK_ERROR", "불러오지 못했습니다.");
      }
      return seeds
        .filter(
          s => includeAnalysisOff || !analysisOff.has(s.conversation.id)
        )
        .map(s => summarize(s.conversation.id))
        .sort((a, b) =>
          b.conversation.lastMessageAt.localeCompare(
            a.conversation.lastMessageAt
          )
        );
    },

    async getAnalysisOffIds() {
      await delay(latency);
      return [...analysisOff];
    },

    async setAnalysisOffIds(ids) {
      await delay(300);
      analysisOff = new Set(ids);
    },

    async saveRelation(id, { relation, note }) {
      await delay(300);
      find(id);
      relations.set(id, { relation, relationNote: note });
    },

    async get(id) {
      await delay(latency);
      const seed = find(id);
      const detail: ConversationDetail = {
        ...summarize(id),
        messages: messagesOf(id),
        events: seed.events ?? [],
      };
      return detail;
    },

    async analyze(id) {
      await delay(1500);
      const current = analyses.get(id);
      if (!current) {
        throw new ServiceError(CONVERSATION_ERROR_CODE.notFound, "없는 대화");
      }
      if (current.status !== "pending") return current;
      const result = PENDING_RESULTS[id];
      const next: Analysis = result
        ? { ...result, status: "done" }
        : { ...current, status: "failed" };
      analyses.set(id, next);
      return next;
    },

    async getReplyCandidates(id, { tone, stance }) {
      await delay(latency);
      const texts = REPLY_TEXTS[id];
      // 입장을 고른 경우: 그 입장의 말투별 후보 / 아니면 안부·축하 말투별 후보
      const byTone =
        (stance ? texts?.[stance] : texts?.greeting) ?? FALLBACK_TEXTS;
      const ordered = [tone, ...TONES.filter(t => t !== tone)];
      return ordered.map<ReplyCandidate>(t => ({
        id: `${id}-${stance ?? "greeting"}-${t}`,
        conversationId: id,
        tone: t,
        stance,
        text: byTone[t],
      }));
    },

    async listTruncated(conversationId) {
      await delay(latency);
      return seeds
        .filter(s =>
          conversationId
            ? s.conversation.id === conversationId
            : !analysisOff.has(s.conversation.id)
        )
        .flatMap(s => {
          const conversation = { ...s.conversation, ...relations.get(s.conversation.id) };
          return messagesOf(s.conversation.id)
            .filter(m => m.truncated)
            .map(message => ({ conversation, message }));
        })
        .sort((a, b) => b.message.receivedAt.localeCompare(a.message.receivedAt));
    },

    async summarizePasted(id, text, messageId) {
      await delay(1200);
      find(id);
      const trimmed = text.trim();
      if (!trimmed) {
        throw new ServiceError(
          CONVERSATION_ERROR_CODE.analysisFailed,
          "요약할 내용이 없습니다."
        );
      }
      // TODO(네이티브): 기기 안 모델로 가린 뒤 요약. mock은 앞부분만 잘라 보여 줌
      const head = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
      const summary = `붙여 넣은 내용을 정리했어요: ${head}`;
      // 정리한 내용을 분석 결과로 남겨 09 답장 후보에서도 보이게 함 (원문은 저장하지 않음)
      const current = analyses.get(id);
      if (current) analyses.set(id, { ...current, status: "done", summary });
      messagesOf(id)
        .filter(m => m.truncated && (!messageId || m.id === messageId))
        .forEach(m => resolved.add(m.id));
      return summary;
    },

    async markChecked(id) {
      await delay(300);
      const current = analyses.get(id);
      if (current) analyses.set(id, { ...current, needsReply: false });
      deferred.delete(id);
    },

    async markReplied(id) {
      await delay(300);
      replied.add(id);
      deferred.delete(id);
      const current = analyses.get(id);
      if (current) analyses.set(id, { ...current, needsReply: false });
    },

    async deferReply(id, remindAt) {
      await delay(400);
      const seed = find(id);
      const item: DeferredReply = {
        id: `d-${id}`,
        conversationId: id,
        remindAt,
        topic: analyses.get(id)?.summary ?? seed.messages[0].text,
        createdAt: new Date().toISOString(),
      };
      deferred.set(id, item);
      return item;
    },

    async cancelDeferred(id) {
      await delay(300);
      deferred.delete(id);
    },

    async getSmallAction() {
      await delay(300);
      // 답장이 필요한 안부 중 하나를 골라 아주 작은 행동으로 제안
      const greeting = seeds.find(s => {
        const a = analyses.get(s.conversation.id);
        return a?.tags.includes("greeting") && a.needsReply;
      });
      if (!greeting) {
        return {
          conversationId: null,
          text: "오늘은 쉬어 가도 괜찮아요. 마음이 내킬 때 둘러봐요.",
        };
      }
      return {
        conversationId: greeting.conversation.id,
        text: `${greeting.conversation.title}에게 "고마워" 한마디만 건네 볼까요?`,
      };
    },

    async listEvents() {
      await delay(latency);
      return seeds
        .flatMap(s => s.events ?? [])
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  };
};

interface MockMessengerOptions {
  // 알림이 아직 남아 있어 바로 답장할 수 있는 대화 (나머지는 복사하고 메신저 열기만)
  directReplyIds?: string[];
  // true면 보내기가 실패 (오류 안내 확인용)
  failSend?: boolean;
  // 클립보드 글자 ("": 비어 있음). 기본은 예시 긴 메시지
  clipboard?: string;
}

export const MOCK_CLIPBOARD_TEXT =
  "오랜만이야. 지난번에 이야기했던 일정이 확정이 되었거든! 그래서 혹시 이날 오전 10시부터 시험 감독을 도와줄 수 있을까? 편하게 답장해줘!";

export const createMockMessengerService = ({
  directReplyIds = DIRECT_REPLY_IDS,
  failSend = false,
  clipboard = MOCK_CLIPBOARD_TEXT,
}: MockMessengerOptions = {}): MessengerService => {
  const available = new Set(directReplyIds);
  let clipboardText = clipboard;
  return {
    async copyText(text) {
      await delay(100);
      clipboardText = text;
    },
    async readClipboard() {
      await delay(100);
      return clipboardText;
    },
    async openApp() {
      await delay(200);
    },
    async canReplyDirectly(id) {
      await delay(200);
      return available.has(id);
    },
    async sendReply(id) {
      await delay(800);
      if (failSend) {
        throw new ServiceError("NETWORK_ERROR", "보내지 못했습니다.");
      }
      if (!available.has(id)) {
        throw new ServiceError(
          CONVERSATION_ERROR_CODE.replyUnavailable,
          "알림이 사라져 바로 답장할 수 없습니다."
        );
      }
      // 한 번 보내면 그 알림은 사라짐
      available.delete(id);
    },
  };
};
