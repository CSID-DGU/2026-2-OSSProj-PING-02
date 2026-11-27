import type { Contact } from "../contacts/ContactsService";
import type {
  Account,
  FriendRelation,
  MessengerApp,
  Person,
} from "../conversation/types";

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
  // 06 E04-1 친구 고르기 줄 설명: 가장 최근 대화가 무엇에 대한 것이었는지 (없으면 비움)
  lastTopic?: string;
}

// 06 E03-2 원문 관리
export interface RawMessageStats {
  // 최근 한 달 동안 기기에 저장된 이 친구의 원문 개수
  recentCount: number;
  // 다음에 자동으로 지워질 날짜 (가장 오래된 원문 + 보관 기간). 원문이 없으면 null
  nextDeleteAt: string | null;
  // 마지막으로 자동 삭제한 날짜. 아직 없으면 null
  lastDeletedAt: string | null;
}

// 06 E03 기본 정보 (자동 저장)
export interface FriendInfoPatch {
  displayName?: string;
  relation?: FriendRelation;
  // 관계 설명 (예전 관계 메모와 같은 값)
  memo?: string;
}

// 14 친구 상세
export interface FriendDetail extends FriendSummary {
  // 가장 최근 1:1 대화 (08 연락 상세로 이동)
  lastConversation?: {
    conversationId: string;
    at: string;
    topic: string; // 무엇에 대한 대화였는지 짧게 (재촉하지 않는 문장)
  };
  // 06 E03 연락 분석을 끈 계정 id (기본은 모두 켜짐)
  analysisOff: string[];
  rawStats: RawMessageStats;
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
  // 계정을 다른 사람으로 분리 (06 E03 "연결 해지하기": NEW로 돌아감). 친구에게 계정이 하나뿐이면 분리할 수 없음
  splitAccount(personId: string, accountId: string): Promise<{ personId: string }>;
  // 첫마디를 메신저에서 보냈다고 사용자가 표시했을 때
  markContacted(personId: string): Promise<void>;

  // ── 06 친구 E02~E04
  // E03 기본 정보 저장 (바꾼 칸만)
  updateInfo(personId: string, patch: FriendInfoPatch): Promise<void>;
  // E02 "새 친구 추가하기": NEW를 친구로 등록
  addFriend(personId: string): Promise<void>;
  // E02 "연결하지 않고 삭제하기": NEW 발신자를 목록에서 지움 (다시 연락이 오면 NEW로 다시 생김)
  remove(personId: string): Promise<void>;
  // E03 분석 켜고 끄기: 기본 정보 체크는 모든 계정, 연결 관리 시트 스위치는 계정 하나
  setAnalysis(personId: string, accountIds: string[], on: boolean): Promise<void>;
  // E02·E04: 한 사람의 계정을 모두 다른 친구에게 옮겨 합침 (from은 사라짐, 메모는 이어 붙임)
  connectTo(fromPersonId: string, toPersonId: string): Promise<void>;
  // E04: NEW와 이름이 같은 친구 (없거나 "다른 사람이에요"를 골랐으면 null)
  getSameNameFriend(personId: string): Promise<FriendSummary | null>;
  // E04 "다른 사람이에요": 이 NEW에 대해 다시 묻지 않음
  dismissSameName(personId: string): Promise<void>;
  // E03-1 "연결이 필요한 계정": 이름이 비슷한데 아직 친구와 연결되지 않은 계정 (NEW 포함)
  getConnectSuggestions(personId: string): Promise<Account[]>;

  // ── 실제 데이터 연결
  // 온보딩 09에서 고른 연락처를 친구로 (전화번호로 문자 계정을 만듦). 한 번 가져온 연락처는 다시 가져오지 않음
  importContacts(contacts: Contact[]): Promise<void>;
  // 연락 대화의 보낸 사람(앱 + 알림의 보낸 사람 id) → 친구 id. 없으면 null
  getPersonLookup(): Promise<(app: MessengerApp, senderId: string) => string | null>;
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
