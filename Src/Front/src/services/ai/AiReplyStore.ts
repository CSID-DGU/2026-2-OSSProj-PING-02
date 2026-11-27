import type { KeyValueStorage } from "../storage/KeyValueStorage";
import type { AiReplyCandidate, Relation } from "./AiReplyService";

// AI 답장 결과를 기기에만 저장 (서버는 저장하지 않음)
// - 사용자별 암호화 저장소(services.userStorage)의 칸 하나에 모든 대화방 결과를 묶어 둠
//   (react-native-keychain은 칸마다 Keystore 키를 따로 만들어서, 대화방별 칸이면 키가 계속 늘어남)
// - 오래된 결과는 보관 기간·최대 개수에 맞춰 저장할 때 정리
// TODO(#47 머지 후): 알림 DB(Room + SQLCipher)에 테이블로 옮기고 같은 인터페이스로 바꿔 끼우기.
//   그때 보관 기간은 #47의 메시지 보관 기간 설정을 그대로 읽어 씀

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

/** 칸 하나 (사용자별 저장소라 실제로는 user.<id>.malssiat.aiReplies) */
const KEY = "malssiat.aiReplies";
/** 예전 형식: 대화방마다 칸 하나 (malssiat.aiReplies.<대화방>) → 처음 읽을 때 KEY로 옮기고 지움 */
const LEGACY_PREFIX = `${KEY}.`;

/** 보관 기간: #47 알림 메시지 보관 기간 기본값(30일)과 같게. 이보다 오래된 결과는 원문도 없어 쓸 수 없음 */
export const AI_REPLY_RETENTION_DAYS = 30;
/** 대화방마다 남길 최근 결과 수 (화면은 마지막 메시지 이후의 최신 결과만 씀, 결정 필요 여부별로 하나씩) */
export const AI_REPLY_MAX_PER_CONVERSATION = 5;
/** 칸 하나에 남길 전체 결과 수 (한 칸이 너무 커지지 않게, 결과 하나 약 1~2KB) */
export const AI_REPLY_MAX_TOTAL = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

interface Bucket {
  v: 1;
  items: SavedAiReply[];
}

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isBucket = (value: unknown): value is Bucket =>
  !!value &&
  typeof value === "object" &&
  Array.isArray((value as Bucket).items);

interface Options {
  /** 테스트에서 시간을 고정할 때 */
  now?: () => number;
}

export const createKeyValueAiReplyStore = (
  storage: KeyValueStorage,
  { now = Date.now }: Options = {}
): AiReplyStore => {
  // 읽고-고쳐-쓰는 동안 다른 저장이 끼어들어 결과를 잃지 않도록 한 번에 하나씩
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  };

  // 보관 기간이 지난 것을 빼고, 최신순으로 대화방별·전체 개수를 자름 (같은 id는 하나만)
  const prune = (items: SavedAiReply[]): SavedAiReply[] => {
    const cutoff = now() - AI_REPLY_RETENTION_DAYS * DAY_MS;
    const seen = new Set<string>();
    const perConversation = new Map<string, number>();
    return [...items]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter(item => {
        if (item.createdAt < cutoff || seen.has(item.id)) return false;
        seen.add(item.id);
        const count = perConversation.get(item.conversationId) ?? 0;
        perConversation.set(item.conversationId, count + 1);
        return count < AI_REPLY_MAX_PER_CONVERSATION;
      })
      .slice(0, AI_REPLY_MAX_TOTAL);
  };

  const write = (items: SavedAiReply[]) =>
    storage.setItem(KEY, JSON.stringify({ v: 1, items } satisfies Bucket));

  // 예전 대화방별 칸을 모아 새 칸에 저장한 뒤 옛 칸을 지움
  const migrateLegacy = async (): Promise<SavedAiReply[]> => {
    const legacyKeys = (await storage.getAllKeys()).filter(key =>
      key.startsWith(LEGACY_PREFIX)
    );
    const legacy: SavedAiReply[] = [];
    for (const key of legacyKeys) {
      const raw = await storage.getItem(key);
      const list = raw ? parseJson(raw) : null;
      if (Array.isArray(list)) legacy.push(...(list as SavedAiReply[]));
    }
    const items = prune(legacy);
    // 새 칸을 먼저 쓰고 나서 지움 (중간에 실패해도 결과를 잃지 않게)
    await write(items);
    await Promise.all(
      legacyKeys.map(key => storage.removeItem(key).catch(() => {}))
    );
    return items;
  };

  const load = async (): Promise<SavedAiReply[]> => {
    const raw = await storage.getItem(KEY);
    if (raw === null) {
      // 새 칸이 없으면 처음 쓰는 것 → 옛 형식이 남아 있으면 옮김
      return migrateLegacy();
    }
    const bucket = parseJson(raw);
    // 망가진 값이면 빈 목록으로 (다음 저장 때 새로 씀)
    return isBucket(bucket) ? prune(bucket.items) : [];
  };

  return {
    save: reply =>
      serial(async () => {
        const items = await load();
        await write(prune([reply, ...items]));
      }),
    listByConversation: conversationId =>
      serial(async () =>
        (await load()).filter(item => item.conversationId === conversationId)
      ),
  };
};
