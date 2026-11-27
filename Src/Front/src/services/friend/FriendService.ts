import type { Account, MessengerApp, Person } from "../conversation/types";

// 05 친구 (나중에 기기 안 암호화 DB의 person·account 테이블로 교체)
// 친구 정보·메모·생일은 기기에만 저장하고 서버로 보내지 않음

// 13 친구 목록 한 줄
export interface FriendSummary {
  person: Person;
  accounts: Account[];
  // 마지막으로 연락을 주고받은 때 (없으면 null)
  lastContactAt: string | null;
  // 06 목록 아바타 빨간 점 (디자이너 댓글): 확인 안 한 연락이 있거나, 답장이 필요한데 아직 답장을 만들지 않음
  attention: boolean;
}

// 14 친구 상세
export interface FriendDetail extends FriendSummary {
  // 가장 최근 1:1 대화 (08 연락 상세로 이동)
  lastConversation?: {
    conversationId: string;
    at: string;
    topic: string; // 무엇에 대한 대화였는지 짧게 (재촉하지 않는 문장)
  };
}

// 같은 사람으로 합칠 수 있는 계정
export interface MergeCandidate {
  account: Account;
  // 지금 연결된 다른 친구 이름 (null = 아직 친구와 연결 안 된 발신자)
  ownerName: string | null;
  // true면 그 친구의 마지막 계정이라, 합치면 그 친구가 이 친구에 합쳐짐 (메모는 합쳐서 남김)
  mergesOwner: boolean;
}

export interface FriendService {
  // 06 목록: 친구 + NEW(새로 발견한 발신자), 연락 최신순 (디자이너 댓글)
  list(): Promise<FriendSummary[]>;
  // 06 목록 별/하트 색칠
  setFavorite(personId: string, favorite: boolean): Promise<void>;
  get(personId: string): Promise<FriendDetail>;
  // 15 첫마디 제안 (부담 없는 안부, 자동 전송 없음)
  getFirstWords(personId: string): Promise<string[]>;
  setFrozen(personId: string, frozen: boolean): Promise<void>;
  getMergeCandidates(personId: string): Promise<MergeCandidate[]>;
  // 다른 계정을 이 친구의 계정으로 합침. 원래 친구에게 계정이 남지 않으면 그 친구는 합쳐져 사라짐
  // 이때 원래 친구의 메모는 이 친구 메모 뒤에 이어 붙이고(mergeMemos), 생일은 이 친구에 없을 때만 가져옴
  mergeAccount(personId: string, accountId: string): Promise<void>;
  // 계정을 다른 사람으로 분리 (새 친구가 됨). 친구에게 계정이 하나뿐이면 분리할 수 없음
  splitAccount(personId: string, accountId: string): Promise<{ personId: string }>;
  // 첫마디를 메신저에서 보냈다고 사용자가 표시했을 때
  markContacted(personId: string): Promise<void>;
}

export const FRIEND_ERROR_CODE = {
  notFound: "FRIEND_NOT_FOUND",
  lastAccount: "FRIEND_LAST_ACCOUNT", // 하나 남은 계정은 분리할 수 없음
} as const;

// 친구를 합칠 때 두 사람의 메모를 모두 남김: 둘 다 있으면 줄바꿈으로 이어 붙임 (같은 메모는 한 번만)
export const mergeMemos = (keep?: string, merged?: string) => {
  const parts = [keep?.trim(), merged?.trim()].filter((m): m is string => !!m);
  const unique = parts.filter((m, i) => parts.indexOf(m) === i);
  return unique.length > 0 ? unique.join("\n") : undefined;
};

// 친구의 앱 목록 (중복 없이, 계정 순서대로)
export const appsOf = (accounts: Account[]): MessengerApp[] =>
  accounts
    .map(a => a.app)
    .filter((app, i, all) => all.indexOf(app) === i);
