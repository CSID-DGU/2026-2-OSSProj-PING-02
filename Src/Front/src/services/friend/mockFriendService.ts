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
} from "./FriendService";
import {
  ACCOUNTS,
  CONTACTED_AT,
  FIRST_WORDS,
  FIRST_WORDS_DEFAULT,
  PERSONS,
} from "./mockFriendData";

interface MockOptions {
  latency?: number;
  // true면 목록 불러오기가 실패 (오류 화면 확인용)
  failList?: boolean;
  // true면 친구가 한 명도 없음 (빈 상태 확인용)
  empty?: boolean;
}

const latest = (dates: (string | undefined)[]) =>
  dates.filter((d): d is string => !!d).sort().at(-1) ?? null;

// 1:1 대화 중 이 계정이 보낸 메시지가 있는 대화
const directConversationsOf = (accountIds: Set<string>) =>
  SEEDS.filter(
    s =>
      s.conversation.kind === "direct" &&
      s.messages.some(m => m.accountId && accountIds.has(m.accountId))
  );

export const createMockFriendService = ({
  latency = 400,
  failList = false,
  empty = false,
}: MockOptions = {}): FriendService => {
  // 메모리 안에서만 바뀌는 사본 (앱을 끄면 처음 상태로)
  let persons: Person[] = empty ? [] : PERSONS.map(p => ({ ...p }));
  let accounts: Account[] = empty ? [] : ACCOUNTS.map(a => ({ ...a }));
  const contacted: Record<string, string> = empty ? {} : { ...CONTACTED_AT };
  let splitCount = 0;

  const findPerson = (id: string) => {
    const person = persons.find(p => p.id === id && p.isFriend);
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
    };
  };

  return {
    async list() {
      await delay(latency);
      if (failList) {
        throw new ServiceError("NETWORK_ERROR", "불러오지 못했습니다.");
      }
      // 최근에 연락한 순서, 얼려둔 관계는 맨 아래
      return persons
        .filter(p => p.isFriend)
        .map(summarize)
        .sort((a, b) => {
          if (a.person.frozen !== b.person.frozen) return a.person.frozen ? 1 : -1;
          return (b.lastContactAt ?? "").localeCompare(a.lastContactAt ?? "");
        });
    },

    async get(personId) {
      await delay(latency);
      const person = findPerson(personId);
      const summary = summarize(person);
      const ids = new Set(summary.accounts.map(a => a.id));
      const last = directConversationsOf(ids).sort((a, b) =>
        b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt)
      )[0];
      const detail: FriendDetail = {
        ...summary,
        lastConversation: last && {
          conversationId: last.conversation.id,
          at: last.conversation.lastMessageAt,
          topic:
            last.analysis.summary ?? last.messages[last.messages.length - 1].text,
        },
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
      const similar = (a: Account) =>
        a.senderName.includes(person.displayName) ||
        person.displayName.includes(a.senderName);
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
        const absorbed = persons.find(p => p.id === previous);
        persons = persons
          .filter(p => p.id !== previous)
          .map(p =>
            p.id === personId && absorbed
              ? {
                  ...p,
                  memo: mergeMemos(p.memo, absorbed.memo),
                  birthday: p.birthday ?? absorbed.birthday,
                }
              : p
          );
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
      const next: Person = {
        id: `p-split-${splitCount}`,
        displayName: target.senderName,
        isFriend: true,
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
  };
};
