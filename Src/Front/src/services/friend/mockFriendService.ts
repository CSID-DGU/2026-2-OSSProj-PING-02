import { delay, ServiceError } from "../common";
import { SEEDS } from "../conversation/mockConversationData";
import type { Account, Person } from "../conversation/types";
import {
  FRIEND_ERROR_CODE,
  mergeMemos,
  type FriendDetail,
  type FriendService,
  type FriendSummary,
  type MergeCandidate,
  type RawMessageStats,
} from "./FriendService";
import {
  ACCOUNTS,
  CONTACTED_AT,
  FIRST_WORDS,
  FIRST_WORDS_DEFAULT,
  PERSONS,
} from "./mockFriendData";
import { friendMaskNames } from "./deviceFriendService";

interface MockOptions {
  latency?: number;
  // true면 목록 불러오기가 실패 (오류 화면 확인용)
  failList?: boolean;
  // true면 친구가 한 명도 없음 (빈 상태 확인용)
  empty?: boolean;
  // true면 NEW(새로 발견한 발신자)가 없음 (06 NEW 빈 상태 확인용)
  noNew?: boolean;
}

// 기기 알림 원문 보관 기간 (NotificationRetention.DEFAULT_DAYS와 같은 값)
const RETENTION_DAYS = 30;
const DAY = 24 * 60 * 60_000;

// 이름이 비슷한지 (한쪽이 다른 쪽을 품음: "민지" ↔ "김민지")
const similarName = (a: string, b: string) => a.includes(b) || b.includes(a);

const latest = (dates: (string | undefined)[]) =>
  dates.filter((d): d is string => !!d).sort().at(-1) ?? null;

// 1:1 대화 중 이 계정이 보낸 메시지가 있는 대화
const directConversationsOf = (accountIds: Set<string>) =>
  SEEDS.filter(
    s =>
      s.conversation.kind === "direct" &&
      s.messages.some(m => m.accountId && accountIds.has(m.accountId))
  );

// 가장 최근 1:1 대화와 그 주제
const lastDirect = (conversations: typeof SEEDS) => {
  const last = [...conversations].sort((a, b) =>
    b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt)
  )[0];
  return (
    last && {
      conversationId: last.conversation.id,
      at: last.conversation.lastMessageAt,
      topic: last.analysis.summary ?? last.messages[last.messages.length - 1].text,
    }
  );
};

// 06 E03-2: 이 친구 계정이 보낸 원문 (나중에 알림 DB 조회로 교체)
const rawStatsOf = (accountIds: Set<string>): RawMessageStats => {
  const times = SEEDS.flatMap(seed => seed.messages)
    .filter(m => m.accountId && accountIds.has(m.accountId))
    .map(m => new Date(m.receivedAt).getTime());
  const monthAgo = Date.now() - RETENTION_DAYS * DAY;
  const oldest = times.length > 0 ? Math.min(...times) : null;
  return {
    recentCount: times.filter(t => t >= monthAgo).length,
    nextDeleteAt:
      oldest === null ? null : new Date(oldest + RETENTION_DAYS * DAY).toISOString(),
    // TODO(API): 알림 DB 자동 삭제 기록 (지금은 기록이 없음)
    lastDeletedAt: null,
  };
};

export const createMockFriendService = ({
  latency = 400,
  failList = false,
  empty = false,
  noNew = false,
}: MockOptions = {}): FriendService => {
  // 메모리 안에서만 바뀌는 사본 (앱을 끄면 처음 상태로)
  let persons: Person[] = empty
    ? []
    : PERSONS.filter(p => !noNew || p.isFriend).map(p => ({ ...p }));
  let accounts: Account[] = empty
    ? []
    : ACCOUNTS.filter(
        a => !a.personId || persons.some(p => p.id === a.personId)
      ).map(a => ({ ...a }));
  const contacted: Record<string, string> = empty ? {} : { ...CONTACTED_AT };
  let splitCount = 0;
  // 연락 분석을 끈 계정, E04 "다른 사람이에요"를 고른 NEW
  const analysisOff = new Set<string>();
  const sameNameDismissed = new Set<string>();
  const importedContactIds = new Set<string>();

  // NEW(isFriend false)도 06 목록·상세에 나옴
  const findPerson = (id: string) => {
    const person = persons.find(p => p.id === id);
    if (!person) {
      throw new ServiceError(FRIEND_ERROR_CODE.notFound, "친구를 찾을 수 없습니다.");
    }
    return person;
  };

  const accountsOf = (personId: string) =>
    accounts.filter(a => a.personId === personId);

  const summarize = (person: Person): FriendSummary => {
    const mine = accountsOf(person.id);
    const ids = new Set(mine.map(a => a.id));
    const conversations = directConversationsOf(ids);
    return {
      person: { ...person },
      accounts: mine.map(a => ({ ...a })),
      lastContactAt: latest([
        ...mine.map(a => contacted[a.id]),
        ...conversations.map(s => s.conversation.lastMessageAt),
      ]),
      // TODO(API): 안 읽은 메시지(알림 DB 읽음 표시)와 AI 답장 생성 여부(services.aiReplies)로 교체
      //   지금 mock은 "1:1 대화가 답장이 필요함"만 봄
      attention: conversations.some(s => s.analysis.needsReply),
      lastTopic: lastDirect(conversations)?.topic,
    };
  };

  // from의 계정을 모두 to로 옮기고 from은 지움
  // 메모는 이어 붙이고, 생일·전화번호는 to에 없을 때만 가져옴
  const absorb = (fromId: string, toId: string) => {
    const from = findPerson(fromId);
    accounts = accounts.map(a =>
      a.personId === fromId ? { ...a, personId: toId } : a
    );
    persons = persons
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

  return {
    async list() {
      await delay(latency);
      if (failList) {
        throw new ServiceError("NETWORK_ERROR", "불러오지 못했습니다.");
      }
      // 06: 친구 + NEW, 연락 최신순 (디자이너 댓글. 예전 "얼려둔 관계는 맨 아래"는 뺌)
      return persons
        .map(summarize)
        .sort((a, b) =>
          (b.lastContactAt ?? "").localeCompare(a.lastContactAt ?? "")
        );
    },

    async setFavorite(personId, favorite) {
      await delay(150);
      findPerson(personId);
      persons = persons.map(p => (p.id === personId ? { ...p, favorite } : p));
    },

    async get(personId) {
      await delay(latency);
      const person = findPerson(personId);
      const summary = summarize(person);
      const ids = new Set(summary.accounts.map(a => a.id));
      const detail: FriendDetail = {
        ...summary,
        lastConversation: lastDirect(directConversationsOf(ids)),
        analysisOff: summary.accounts
          .filter(a => analysisOff.has(a.id))
          .map(a => a.id),
        rawStats: rawStatsOf(ids),
      };
      return detail;
    },

    async getFirstWords(personId) {
      await delay(latency);
      findPerson(personId);
      // TODO(API): 가린 메모·최근 대화 주제로 외부 AI가 만든 후보로 교체
      return FIRST_WORDS[personId] ?? FIRST_WORDS_DEFAULT;
    },

    async setFrozen(personId, frozen) {
      await delay(300);
      findPerson(personId);
      persons = persons.map(p => (p.id === personId ? { ...p, frozen } : p));
    },

    async getMergeCandidates(personId) {
      await delay(300);
      const person = findPerson(personId);
      const nameOf = (id: string | null) =>
        id ? persons.find(p => p.id === id)?.displayName ?? null : null;
      // 아직 연결 안 된 발신자를 먼저, 이름이 비슷한 계정을 그다음으로
      const similar = (a: Account) => similarName(a.senderName, person.displayName);
      return accounts
        .filter(a => a.personId !== personId)
        .map<MergeCandidate>(a => ({
          account: { ...a },
          ownerName: nameOf(a.personId),
          mergesOwner: !!a.personId && accountsOf(a.personId).length === 1,
        }))
        .sort(
          (a, b) =>
            Number(b.ownerName === null) - Number(a.ownerName === null) ||
            Number(similar(b.account)) - Number(similar(a.account))
        );
    },

    async mergeAccount(personId, accountId) {
      await delay(400);
      findPerson(personId);
      const target = accounts.find(a => a.id === accountId);
      if (!target) {
        throw new ServiceError(FRIEND_ERROR_CODE.notFound, "계정을 찾을 수 없습니다.");
      }
      const previous = target.personId;
      accounts = accounts.map(a => (a.id === accountId ? { ...a, personId } : a));
      // 계정이 하나도 남지 않은 친구는 이 친구에 합쳐진 것으로 봄
      // 메모는 둘 다 남기고, 생일은 이 친구에 없을 때만 가져옴
      if (previous && accountsOf(previous).length === 0) {
        absorb(previous, personId);
      }
    },

    async splitAccount(personId, accountId) {
      await delay(400);
      findPerson(personId);
      const mine = accountsOf(personId);
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
      splitCount += 1;
      // 06 E03 "연결 해지하기": 떼어 낸 계정은 NEW로 (다시 연결하거나 새 친구로 추가)
      const next: Person = {
        id: `p-split-${splitCount}`,
        displayName: target.senderName,
        isFriend: false,
        frozen: false,
      };
      persons = [...persons, next];
      accounts = accounts.map(a =>
        a.id === accountId ? { ...a, personId: next.id } : a
      );
      return { personId: next.id };
    },

    async markContacted(personId) {
      await delay(300);
      const mine = accountsOf(findPerson(personId).id);
      const now = new Date().toISOString();
      mine.forEach(a => {
        contacted[a.id] = now;
      });
    },

    async updateInfo(personId, patch) {
      await delay(150);
      findPerson(personId);
      const displayName = patch.displayName?.trim();
      persons = persons.map(p =>
        p.id === personId
          ? {
              ...p,
              ...(displayName ? { displayName } : {}),
              ...(patch.relation ? { relation: patch.relation } : {}),
              ...(patch.memo !== undefined
                ? { memo: patch.memo.trim() || undefined }
                : {}),
            }
          : p
      );
    },

    async addFriend(personId) {
      await delay(300);
      findPerson(personId);
      persons = persons.map(p => (p.id === personId ? { ...p, isFriend: true } : p));
    },

    async remove(personId) {
      await delay(300);
      findPerson(personId);
      persons = persons.filter(p => p.id !== personId);
      accounts = accounts.filter(a => a.personId !== personId);
    },

    async setAnalysis(personId, accountIds, on) {
      await delay(150);
      findPerson(personId);
      // TODO(API): 꺼진 계정의 알림은 AI 분석·답장 제안에서 빼기
      accountIds.forEach(id => {
        if (on) analysisOff.delete(id);
        else analysisOff.add(id);
      });
    },

    async connectTo(fromPersonId, toPersonId) {
      await delay(400);
      findPerson(toPersonId);
      absorb(fromPersonId, toPersonId);
    },

    async getSameNameFriend(personId) {
      await delay(150);
      const person = findPerson(personId);
      if (person.isFriend || sameNameDismissed.has(personId)) return null;
      const same = persons.find(
        p => p.isFriend && p.id !== personId && p.displayName === person.displayName
      );
      return same ? summarize(same) : null;
    },

    async dismissSameName(personId) {
      await delay(100);
      sameNameDismissed.add(personId);
    },

    async getConnectSuggestions(personId) {
      await delay(300);
      const person = findPerson(personId);
      const isUnlinked = (a: Account) =>
        !a.personId || persons.some(p => p.id === a.personId && !p.isFriend);
      return accounts
        .filter(
          a =>
            a.personId !== personId &&
            isUnlinked(a) &&
            similarName(a.senderName, person.displayName)
        )
        .map(a => ({ ...a }));
    },

    async importContacts(contacts) {
      await delay(100);
      contacts.forEach(contact => {
        if (importedContactIds.has(contact.id)) return;
        importedContactIds.add(contact.id);
        persons = [
          ...persons,
          {
            id: `p-contact-${contact.id}`,
            displayName: contact.name,
            isFriend: true,
            frozen: false,
            phone: contact.phone,
          },
        ];
      });
    },

    async getMaskNames() {
      return friendMaskNames({ persons, accounts });
    },

    // mock 대화 메시지의 accountId는 mock 계정 id와 같음 (앱은 보지 않음)
    async getPersonLookup() {
      const byAccount = new Map(accounts.map(a => [a.id, a.personId]));
      return (_app, senderId) => byAccount.get(senderId) ?? null;
    },
  };
};
