import type { KeyValueStorage } from "../storage/KeyValueStorage";
import type { AiReplyCandidate, Relation } from "./AiReplyService";

// AI 답장 결과를 기기에만 저장 (서버는 저장하지 않음)
// TODO(네이티브 연결): 지금은 KeyValueStorage(mock은 메모리)에 대화방별 JSON으로 둠.
//   암호화된 로컬 DB(Room + SQLCipher)가 준비되면 같은 인터페이스로 바꿔 끼움

/** 원래 값으로 되돌린 결과. 마스킹 대응표(mapping)는 저장하지 않음 */
export interface SavedAiReply {
  id: string;
  conversationId: string;
  createdAt: number;
  relation: Relation;
  /** AI가 판단한 결정 필요 여부. true면 replies가 입장 3 × 말투 3 = 9개 */
  needsDecision: boolean;
  summary: string;
  replies: AiReplyCandidate[];
}

export interface AiReplyStore {
  save(reply: SavedAiReply): Promise<void>;
  /** 최근 것부터 */
  listByConversation(conversationId: string): Promise<SavedAiReply[]>;
}

const KEY_PREFIX = "malssiat.aiReplies.";
/** 대화방마다 남길 최근 결과 수 */
const MAX_PER_CONVERSATION = 20;

export const createKeyValueAiReplyStore = (
  storage: KeyValueStorage
): AiReplyStore => {
  const read = async (conversationId: string): Promise<SavedAiReply[]> => {
    const raw = await storage.getItem(KEY_PREFIX + conversationId);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as SavedAiReply[];
    } catch {
      return [];
    }
  };

  return {
    async save(reply) {
      const list = await read(reply.conversationId);
      const next = [reply, ...list].slice(0, MAX_PER_CONVERSATION);
      await storage.setItem(
        KEY_PREFIX + reply.conversationId,
        JSON.stringify(next)
      );
    },
    listByConversation: read,
  };
};
