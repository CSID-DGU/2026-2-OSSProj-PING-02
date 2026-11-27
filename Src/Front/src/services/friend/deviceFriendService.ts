import { ServiceError } from "../common";
import type { Contact } from "../contacts/ContactsService";
import type { ConversationService } from "../conversation/ConversationService";
import type {
  Account,
  ConversationSummary,
  MessengerApp,
  Person,
} from "../conversation/types";
import type { KeyValueStorage } from "../storage/KeyValueStorage";
import {
  FRIEND_ERROR_CODE,
  mergeMemos,
  type FriendDetail,
  type FriendService,
  type FriendSummary,
  type MergeCandidate,
  type RawMessageStats,
} from "./FriendService";
import { FIRST_WORDS_DEFAULT } from "./mockFriendData";
import { toMaskNames } from "../ai/maskNames";

// 실제 친구 서비스: 기기에 쌓인 알림(1:1 대화를 보낸 사람)과 온보딩 09에서 고른 연락처로 친구를 만들고,
// 친구 정보는 사용자별 기기 저장소(services.userStorage)에 저장함. 서버로는 보내지 않음
//
// - 계정(account) id = "앱:보낸 사람 id"
//   문자는 전화번호("tel:01012345678"), 인스타는 사용자 id("ig:..."), 카카오톡은 사람 id가 없어 이름("name:민지")
//   → 같은 앱의 같은 보낸 사람은 대화방이 달라도 한 계정
//   TODO(알림 수집): 카카오톡은 이름으로만 구분해서, 이름이 같은 다른 사람이 한 계정으로 합쳐짐
//     (카카오톡 알림에 사람 id가 없음. 대화방 id를 함께 쓰면 같은 사람이 방마다 나뉘는 문제가 있어 보류)
// - 처음 보는 보낸 사람은 NEW(아직 친구로 등록 안 함)로 만들고, 사용자가 E02에서 친구로 추가하거나 다른 친구에 합침
// - 연락처는 전화번호로 문자 계정을 만들어 문자 알림과 이어 줌 (연락처 id는 한 번만 가져옴: 지우거나 합친 뒤 다시 생기지 않게)
// - 기관·번호 발신자(분석 "info")와 단톡방은 친구로 만들지 않음
// TODO(네이티브 연결): 친구 목록이 커지면 기기 안 암호화 DB(알림 DB)로 옮기기

const STORE_KEY = "malssiat.friends";
const DAY = 24 * 60 * 60_000;
const DEFAULT_RETENTION_DAYS = 30;

interface FriendStore {
  persons: Person[];
  accounts: Account[];
  // 한 번 가져온 연락처 id (다시 가져오지 않음)
  importedContactIds: string[];
  // 연락 분석을 끈 계정
  analysisOff: string[];
  // E04 "다른 사람이에요"를 고른 NEW
  sameNameDismissed: string[];
  // 첫마디를 보냈다고 표시한 시각 (계정 id → ISO)
  contacted: Record<string, string>;
  // 지운 NEW 계정 → 지운 시각. 그 뒤에 새 메시지가 오면 다시 NEW로
  removedAccounts: Record<string, string>;
  nextId: number;
}

const emptyStore = (): FriendStore => ({
  persons: [],
  accounts: [],
  importedContactIds: [],
  analysisOff: [],
  sameNameDismissed: [],
  contacted: {},
  removedAccounts: {},
  nextId: 1,
});

// 전화번호를 문자 알림의 보낸 사람 id와 같은 모양으로 ("+82 10-1234-5678" → "01012345678")
export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.startsWith("82") && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
};

// 알림 메시지의 보낸 사람 id → 계정 id (문자 전화번호는 같은 모양으로 맞춤)
export const accountIdOf = (app: MessengerApp, senderId: string) => {
  if (senderId.startsWith("tel:")) return `${app}:tel:${normalizePhone(senderId.slice(4))}`;
  return `${app}:${senderId}`;
};

// 이름이 비슷한지 (한쪽이 다른 쪽을 품음: "민지" ↔ "김민지")
const similarName = (a: string, b: string) => a.includes(b) || b.includes(a);

// 대화 목록에서 읽은 계정별 최근 활동
interface Activity {
  accountId: string;
  app: MessengerApp;
  senderName: string;
  handle?: string;
  conversationId: string;
  at: string;
  topic: string;
  needsReply: boolean;
}

const activityOf = (item: ConversationSummary): Activity | null => {
  const { conversation, lastMessage, analysis } = item;
  // 단톡방·기관·번호 발신자·내가 보낸 메시지는 친구로 만들지 않음
  if (conversation.kind !== "direct") return null;
  if (analysis.tags.includes("info")) return null;
  if (!lastMessage.accountId) return null;
  const accountId = accountIdOf(conversation.app, lastMessage.accountId);
  const handle = lastMessage.accountId.startsWith("ig:")
    ? lastMessage.accountId.slice(3)
    : undefined;
  return {
    accountId,
    app: conversation.app,
    senderName: lastMessage.senderName || conversation.title,
    ...(handle ? { handle } : {}),
    conversationId: conversation.id,
    at: conversation.lastMessageAt,
    topic: analysis.summary ?? lastMessage.text,
    needsReply: analysis.needsReply && !item.replied && !item.deferred,
  };
};

// AI로 보내기 전에 가릴 이름: 친구·NEW 이름, 계정 이름(보낸 사람 표시 이름), 인스타 아이디
// 한글 세·네 글자 이름은 성을 뺀 이름도 (toMaskNames)
export const friendMaskNames = ({
  persons,
  accounts,
}: {
  persons: Person[];
  accounts: Account[];
}) => {
  const names = new Set<string>();
  persons.forEach(p => toMaskNames(p.displayName).forEach(n => names.add(n)));
  accounts.forEach(a => {
    toMaskNames(a.senderName).forEach(n => names.add(n));
    if (a.handle) names.add(a.handle);
  });
  return [...names];
};

export interface DeviceFriendDeps {
  // 사용자별 저장소 (services.userStorage)
  storage: KeyValueStorage;
  // 기기 알림으로 만든 연락 목록·상세 (services.conversation)
  conversation: Pick<ConversationService, "list" | "get">;
  // 알림 보관 기간 (NotificationStore.getRetentionDays). 없으면 30일
  getRetentionDays?: () => Promise<number>;
}

export const createDeviceFriendService = ({
  storage,
  conversation,
  getRetentionDays = async () => DEFAULT_RETENTION_DAYS,
}: DeviceFriendDeps): FriendService => {
  const read = async (): Promise<FriendStore> => {
    const raw = await storage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    try {
      return { ...emptyStore(), ...(JSON.parse(raw) as Partial<FriendStore>) };
    } catch {
      return emptyStore();
    }
  };
  const write = (store: FriendStore) =>
    storage.setItem(STORE_KEY, JSON.stringify(store));

  // 한 번에 하나씩 (읽고 고치고 쓰는 사이에 다른 변경이 끼어들지 않게)
  let queue: Promise<unknown> = Promise.resolve();
  const update = <T>(fn: (store: FriendStore) => T | Promise<T>): Promise<T> => {
    const run = queue.then(async () => {
      const store = await read();
      const result = await fn(store);
      await write(store);
      return result;
    });
    queue = run.catch(() => {});
    return run;
  };

  const newPersonId = (store: FriendStore) => `p-${store.nextId++}`;

  const findPerson = (store: FriendStore, id: string) => {
    const person = store.persons.find(p => p.id === id);
    if (!person) {
      throw new ServiceError(FRIEND_ERROR_CODE.notFound, "친구를 찾을 수 없습니다.");
    }
    return person;
  };

  const accountsOf = (store: FriendStore, personId: string) =>
    store.accounts.filter(a => a.personId === personId);

  // from의 계정을 모두 to로 옮기고 from은 지움 (메모는 이어 붙이고, 생일·전화번호는 to에 없을 때만)
  const absorb = (store: FriendStore, fromId: string, toId: string) => {
    const from = findPerson(store, fromId);
    store.accounts = store.accounts.map(a =>
      a.personId === fromId ? { ...a, personId: toId } : a
    );
    store.persons = store.persons
      .filter(p => p.id !== fromId)
      .map(p =>
        p.id === toId
          ? {
              ...p,
              memo: mergeMemos(p.memo, from.memo),
              birthday: p.birthday ?? from.birthday,
              phone: p.phone ?? from.phone,
            }
          : p
      );
  };

  // 연락 목록을 읽어 처음 보는 보낸 사람을 NEW로 더함. 계정별 최근 활동을 돌려줌
  const sync = async () => {
    const items = await conversation.list().catch(() => [] as ConversationSummary[]);
    const activity = new Map<string, Activity>();
    for (const item of items) {
      const a = activityOf(item);
      if (!a) continue;
      const prev = activity.get(a.accountId);
      if (!prev || prev.at < a.at) activity.set(a.accountId, a);
    }
    await update(store => {
      for (const a of activity.values()) {
        if (store.accounts.some(acc => acc.id === a.accountId)) continue;
        const removedAt = store.removedAccounts[a.accountId];
        if (removedAt && removedAt >= a.at) continue;
        delete store.removedAccounts[a.accountId];
        const id = newPersonId(store);
        store.persons.push({ id, displayName: a.senderName, isFriend: false, frozen: false });
        store.accounts.push({
          id: a.accountId,
          personId: id,
          app: a.app,
          senderName: a.senderName,
          ...(a.handle ? { handle: a.handle } : {}),
        });
      }
    });
    return activity;
  };

  const summarize = (
    store: FriendStore,
    person: Person,
    activity: Map<string, Activity>
  ): FriendSummary => {
    const mine = accountsOf(store, person.id);
    const acts = mine
      .map(a => activity.get(a.id))
      .filter((a): a is Activity => !!a)
      .sort((a, b) => b.at.localeCompare(a.at));
    const dates = [
      ...acts.map(a => a.at),
      ...mine.map(a => store.contacted[a.id]).filter((d): d is string => !!d),
    ].sort();
    return {
      person: { ...person },
      accounts: mine.map(a => ({ ...a })),
      lastContactAt: dates.at(-1) ?? null,
      // 06 빨간 점: 답장이 필요한데 아직 답장(복사·보냄)하지 않았고 미뤄 두지도 않은 1:1 대화가 있음
      // TODO(API): 안 읽은 메시지(알림 DB 읽음 표시)도 함께 (읽음 표시는 아직 없음)
      attention: acts.some(a => a.needsReply),
      lastTopic: acts[0]?.topic,
    };
  };

  // 이 친구 계정이 보낸 원문 개수·다음 자동 삭제 날짜 (1:1 대화방 메시지 기준)
  const rawStatsOf = async (
    accountIds: Set<string>,
    activity: Map<string, Activity>
  ): Promise<RawMessageStats> => {
    const retention = await getRetentionDays().catch(() => DEFAULT_RETENTION_DAYS);
    const conversationIds = new Set(
      [...activity.values()].filter(a => accountIds.has(a.accountId)).map(a => a.conversationId)
    );
    const times: number[] = [];
    for (const id of conversationIds) {
      const detail = await conversation.get(id).catch(() => null);
      detail?.messages
        .filter(m => m.accountId && accountIds.has(accountIdOf(detail.conversation.app, m.accountId)))
        .forEach(m => times.push(new Date(m.receivedAt).getTime()));
    }
    const since = Date.now() - retention * DAY;
    const oldest = times.length > 0 ? Math.min(...times) : null;
    return {
      recentCount: times.filter(t => t >= since).length,
      nextDeleteAt: oldest === null ? null : new Date(oldest + retention * DAY).toISOString(),
      // TODO(네이티브): 알림 DB 자동 삭제 기록 (지금은 기록이 없음)
      lastDeletedAt: null,
    };
  };

  const service: FriendService = {
    async list() {
      const activity = await sync();
      const store = await read();
      return store.persons
        .map(p => summarize(store, p, activity))
        .sort((a, b) => (b.lastContactAt ?? "").localeCompare(a.lastContactAt ?? ""));
    },

    async setFavorite(personId, favorite) {
      await update(store => {
        findPerson(store, personId).favorite = favorite;
      });
    },

    async get(personId) {
      const activity = await sync();
      const store = await read();
      const person = findPerson(store, personId);
      const summary = summarize(store, person, activity);
      const ids = new Set(summary.accounts.map(a => a.id));
      const latest = [...activity.values()]
        .filter(a => ids.has(a.accountId))
        .sort((a, b) => b.at.localeCompare(a.at))[0];
      const detail: FriendDetail = {
        ...summary,
        lastConversation: latest && {
          conversationId: latest.conversationId,
          at: latest.at,
          topic: latest.topic,
        },
        analysisOff: summary.accounts
          .filter(a => store.analysisOff.includes(a.id))
          .map(a => a.id),
        rawStats: await rawStatsOf(ids, activity),
      };
      return detail;
    },

    async getFirstWords(personId) {
      findPerson(await read(), personId);
      // TODO(API): 가린 메모·최근 대화 주제로 외부 AI가 만든 후보로 교체 (서버 필요)
      return FIRST_WORDS_DEFAULT;
    },

    async setFrozen(personId, frozen) {
      await update(store => {
        findPerson(store, personId).frozen = frozen;
      });
    },

    async getMergeCandidates(personId) {
      const store = await read();
      const person = findPerson(store, personId);
      const nameOf = (id: string | null) =>
        id ? store.persons.find(p => p.id === id)?.displayName ?? null : null;
      const similar = (a: Account) => similarName(a.senderName, person.displayName);
      return store.accounts
        .filter(a => a.personId !== personId)
        .map<MergeCandidate>(a => ({
          account: { ...a },
          ownerName: nameOf(a.personId),
          mergesOwner: !!a.personId && accountsOf(store, a.personId).length === 1,
        }))
        .sort(
          (a, b) =>
            Number(b.ownerName === null) - Number(a.ownerName === null) ||
            Number(similar(b.account)) - Number(similar(a.account))
        );
    },

    async mergeAccount(personId, accountId) {
      await update(store => {
        findPerson(store, personId);
        const target = store.accounts.find(a => a.id === accountId);
        if (!target) {
          throw new ServiceError(FRIEND_ERROR_CODE.notFound, "계정을 찾을 수 없습니다.");
        }
        const previous = target.personId;
        target.personId = personId;
        // 계정이 하나도 남지 않은 친구는 이 친구에 합쳐진 것으로 봄
        if (previous && accountsOf(store, previous).length === 0) {
          absorb(store, previous, personId);
        }
      });
    },

    async splitAccount(personId, accountId) {
      return update(store => {
        findPerson(store, personId);
        const mine = accountsOf(store, personId);
        const target = mine.find(a => a.id === accountId);
        if (!target) {
          throw new ServiceError(FRIEND_ERROR_CODE.notFound, "계정을 찾을 수 없습니다.");
        }
        if (mine.length <= 1) {
          throw new ServiceError(
            FRIEND_ERROR_CODE.lastAccount,
            "하나 남은 계정은 분리할 수 없습니다."
          );
        }
        // 06 E03 "연결 해지하기": 떼어 낸 계정은 NEW로
        const id = newPersonId(store);
        store.persons.push({
          id,
          displayName: target.senderName,
          isFriend: false,
          frozen: false,
        });
        target.personId = id;
        return { personId: id };
      });
    },

    async markContacted(personId) {
      await update(store => {
        const now = new Date().toISOString();
        accountsOf(store, findPerson(store, personId).id).forEach(a => {
          store.contacted[a.id] = now;
        });
      });
    },

    async updateInfo(personId, patch) {
      await update(store => {
        const person = findPerson(store, personId);
        const displayName = patch.displayName?.trim();
        if (displayName) person.displayName = displayName;
        if (patch.relation) person.relation = patch.relation;
        if (patch.memo !== undefined) person.memo = patch.memo.trim() || undefined;
      });
    },

    async addFriend(personId) {
      await update(store => {
        findPerson(store, personId).isFriend = true;
      });
    },

    async remove(personId) {
      await update(store => {
        findPerson(store, personId);
        const now = new Date().toISOString();
        accountsOf(store, personId).forEach(a => {
          store.removedAccounts[a.id] = now;
        });
        store.accounts = store.accounts.filter(a => a.personId !== personId);
        store.persons = store.persons.filter(p => p.id !== personId);
      });
    },

    async setAnalysis(personId, accountIds, on) {
      await update(store => {
        findPerson(store, personId);
        const off = new Set(store.analysisOff);
        accountIds.forEach(id => (on ? off.delete(id) : off.add(id)));
        store.analysisOff = [...off];
      });
    },

    async connectTo(fromPersonId, toPersonId) {
      await update(store => {
        findPerson(store, toPersonId);
        absorb(store, fromPersonId, toPersonId);
      });
    },

    async getSameNameFriend(personId) {
      const store = await read();
      const person = findPerson(store, personId);
      if (person.isFriend || store.sameNameDismissed.includes(personId)) return null;
      const same = store.persons.find(
        p => p.isFriend && p.id !== personId && p.displayName === person.displayName
      );
      return same ? summarize(store, same, new Map()) : null;
    },

    async dismissSameName(personId) {
      await update(store => {
        if (!store.sameNameDismissed.includes(personId)) {
          store.sameNameDismissed.push(personId);
        }
      });
    },

    async getConnectSuggestions(personId) {
      const store = await read();
      const person = findPerson(store, personId);
      const isUnlinked = (a: Account) =>
        !a.personId || store.persons.some(p => p.id === a.personId && !p.isFriend);
      return store.accounts
        .filter(
          a =>
            a.personId !== personId &&
            isUnlinked(a) &&
            similarName(a.senderName, person.displayName)
        )
        .map(a => ({ ...a }));
    },

    // 온보딩 09에서 고른 연락처 → 친구 + 문자 계정(전화번호). 이미 가져온 연락처는 건너뜀
    async importContacts(contacts: Contact[]) {
      await update(store => {
        for (const contact of contacts) {
          if (store.importedContactIds.includes(contact.id)) continue;
          store.importedContactIds.push(contact.id);
          const phone = normalizePhone(contact.phone);
          const accountId = phone ? `SMS:tel:${phone}` : null;
          const existing = accountId
            ? store.accounts.find(a => a.id === accountId)
            : undefined;
          if (existing?.personId) {
            // 이미 문자 알림으로 NEW가 된 사람: 친구로 올리고 연락처 이름·번호를 씀
            const person = findPerson(store, existing.personId);
            person.isFriend = true;
            person.displayName = contact.name;
            person.phone = person.phone ?? contact.phone;
            existing.senderName = contact.name;
            continue;
          }
          const id = newPersonId(store);
          store.persons.push({
            id,
            displayName: contact.name,
            isFriend: true,
            frozen: false,
            ...(contact.phone ? { phone: contact.phone } : {}),
          });
          if (accountId) {
            store.accounts.push({ id: accountId, personId: id, app: "SMS", senderName: contact.name });
          }
        }
      });
    },

    // 연락 대화의 보낸 사람 → 친구 id (연락 상세 "친구 정보 보기")
    async getPersonLookup() {
      const store = await read();
      const byAccount = new Map(store.accounts.map(a => [a.id, a.personId]));
      return (app: MessengerApp, senderId: string) =>
        byAccount.get(accountIdOf(app, senderId)) ?? null;
    },

    async getMaskNames() {
      return friendMaskNames(await read());
    },
  };
  return service;
};
