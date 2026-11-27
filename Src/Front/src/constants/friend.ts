import type { ImageSourcePropType } from "react-native";
import { LINKED_APP_OPTIONS } from "@constants/onboarding";
import type { FriendRelation, FriendSummary, MessengerApp } from "@services";

// 05 친구 화면 공통 문구
// 원칙: 관계를 평가하지 않음. 오래된 연락도 "N일째 연락 안 함"처럼 재촉하지 않고 지난 때만 알려 줌

// 06 친구 관계 이름 (목록 칩·탭)
export const RELATION_LABEL: Record<FriendRelation, string> = {
  friend: "친구",
  family: "가족",
  work: "직장",
  etc: "기타",
};

// 06 목록 밑줄 탭: 전체 / NEW / 친구 / 가족 / 직장 / 기타
export type FriendTab = "all" | "new" | FriendRelation;

export const FRIEND_TABS: { key: FriendTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "new", label: "NEW" },
  { key: "friend", label: RELATION_LABEL.friend },
  { key: "family", label: RELATION_LABEL.family },
  { key: "work", label: RELATION_LABEL.work },
  { key: "etc", label: RELATION_LABEL.etc },
];

// NEW = 새로 발견해 아직 친구로 등록하지 않은 발신자
export const isNewFriend = ({ person }: FriendSummary) => !person.isFriend;

export const inFriendTab = (item: FriendSummary, tab: FriendTab) =>
  tab === "all"
    ? true
    : tab === "new"
    ? isNewFriend(item)
    : !isNewFriend(item) && item.person.relation === tab;

// 이름 검색: 친구 이름과 앱별 계정 이름에서 찾음
export const matchesFriendQuery = (item: FriendSummary, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.person.displayName, ...item.accounts.map(a => a.senderName)].some(
    name => name.toLowerCase().includes(q)
  );
};

// 06 목록 별/하트: 직장은 ★, 나머지는 ♡ (디자이너 확인)
export const favoriteShape = (relation?: FriendRelation) =>
  relation === "work" ? "star" : "heart";

// 메신저 로고 (온보딩 05 연동 앱 이미지 재사용)
export const FRIEND_APP_ICON = Object.fromEntries(
  LINKED_APP_OPTIONS.map(o => [o.value, o.icon])
) as Record<MessengerApp, ImageSourcePropType>;

// 06 목록 오른쪽 시간 (시안 예시: 8:45 · 10시간 전 · 하루 전 · 3일 전 · 일주일 전 · 한 달 전)
// 오늘이면 시각, 하루 안이면 N시간 전, 그 뒤로는 날 수 기준
// TODO(Figma 문구 확인): 시안에 없는 구간(N분·N주·N달·N년)은 같은 말투로 이어 붙임
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export const formatFriendTime = (iso: string, now = new Date()) => {
  const at = new Date(iso);
  const diff = Math.max(0, now.getTime() - at.getTime());
  if (at.toDateString() === now.toDateString()) {
    return `${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")}`;
  }
  if (diff < DAY) return `${Math.max(1, Math.floor(diff / HOUR))}시간 전`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return "하루 전";
  if (days < 7) return `${days}일 전`;
  if (days < 14) return "일주일 전";
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 60) return "한 달 전";
  if (days < 365) return `${Math.floor(days / 30)}달 전`;
  return `${Math.floor(days / 365)}년 전`;
};

// 마지막 연락이 언제였는지 (날짜 기준: 오늘·어제·N일 전·N주 전·N개월 전·N년 전)
export const formatSince = (iso: string, now = new Date()) => {
  const day = new Date(iso).setHours(0, 0, 0, 0);
  const today = new Date(now).setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((today - day) / 86_400_000));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
};

// 13 목록 카드 아래 줄
export const friendStatusText = (frozen: boolean, lastContactAt: string | null) =>
  frozen
    ? "얼려둔 관계"
    : lastContactAt
    ? `최근 연락: ${formatSince(lastContactAt)}`
    : "아직 주고받은 연락이 없어요";

// "05-18" → "5월 18일"
export const formatBirthday = (mmdd: string) => {
  const [month, day] = mmdd.split("-").map(Number);
  return `${month}월 ${day}일`;
};
