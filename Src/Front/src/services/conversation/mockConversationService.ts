import { delay, ServiceError } from "../common";
import {
  CONVERSATION_ERROR_CODE,
  type ConversationService,
  type MessengerService,
} from "./ConversationService";
import {
  FALLBACK_TEXTS,
  PENDING_RESULTS,
  REPLY_TEXTS,
  SEEDS,
} from "./mockConversationData";
import type {
  Analysis,
  ConversationDetail,
  ConversationSummary,
  DeferredReply,
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

  const summarize = (id: string): ConversationSummary => {
    const seed = find(id);
    return {
      conversation: seed.conversation,
      lastMessage: seed.messages[seed.messages.length - 1],
      analysis: analyses.get(id)!,
      deferred: deferred.get(id),
      replied: replied.has(id),
    };
  };

  return {
    async list() {
      await delay(latency);
      if (failList) {
        throw new ServiceError("NETWORK_ERROR", "불러오지 못했습니다.");
      }
      return seeds
        .map(s => summarize(s.conversation.id))
        .sort((a, b) =>
          b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt)
        );
    },

    async get(id) {
      await delay(latency);
      const seed = find(id);
      const detail: ConversationDetail = {
        ...summarize(id),
        messages: seed.messages,
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
      const byTone = (stance ? texts?.[stance] : texts?.greeting) ?? FALLBACK_TEXTS;
      const ordered = [tone, ...TONES.filter(t => t !== tone)];
      return ordered.map<ReplyCandidate>(t => ({
        id: `${id}-${stance ?? "greeting"}-${t}`,
        conversationId: id,
        tone: t,
        stance,
        text: byTone[t],
      }));
    },

    async summarizePasted(id, text) {
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
      return `붙여 넣은 내용을 정리했어요: ${head}`;
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
  };
};

export const createMockMessengerService = (): MessengerService => ({
  async copyText() {
    await delay(100);
  },
  async openApp() {
    await delay(200);
  },
  async sendReply() {
    await delay(800);
  },
});
