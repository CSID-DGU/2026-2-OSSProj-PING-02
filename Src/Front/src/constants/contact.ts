import { LINKED_APP_OPTIONS } from "./onboarding";
import type {
  AnalysisTag,
  ConversationKind,
  MessengerApp,
  ReplyStance,
  ReplyTone,
} from "@services";

// 연락·홈 화면 공통 문구
// 원칙: 재촉하지 않음 ("N일째 답장 안 함" 같은 표현 금지), 미뤄도 괜찮다는 톤

// 앱 이름은 온보딩 연동 앱 상수를 그대로 씀 (패키지명도 같은 곳)
export const APP_LABEL = Object.fromEntries(
  LINKED_APP_OPTIONS.map(o => [o.value, o.label])
) as Record<MessengerApp, string>;

export const KIND_LABEL: Record<ConversationKind, string> = {
  direct: "1:1",
  group: "단톡",
};

// 꼭 챙길 연락 카드의 분류 이름
export const PRIORITY_TAG_LABEL: Partial<Record<AnalysisTag, string>> = {
  occasion: "경조사",
  deadline: "곧 다가오는 일정",
  greeting: "반가운 연락",
  question: "답을 기다리는 연락",
};

export const TONE_OPTIONS: { value: ReplyTone; label: string }[] = [
  { value: "short", label: "짧게" },
  { value: "warm", label: "다정하게" },
  { value: "polite", label: "공손하게" },
];

export const STANCE_OPTIONS: { value: ReplyStance; label: string }[] = [
  { value: "accept", label: "수락" },
  { value: "decline", label: "거절" },
  { value: "hold", label: "보류" },
];

// 이름 뒤 조사 "와/과" (받침이 있으면 과: 민지와 / 김서연 선배와 / 상담센터와 / 지훈과)
export const withWa = (name: string) => {
  const last = name.trim().charCodeAt(name.trim().length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasBatchim = isHangul && (last - 0xac00) % 28 !== 0;
  return `${name}${hasBatchim ? "과" : "와"}`;
};

// 답장 후보 화면 고르기 (08 "답장 후보 살펴보기", 09-C "답장 만들기")
// - 나에게 묻는 말이 있으면 09-A 입장 고르기 (경조사 초대처럼 참석 여부를 묻는 경우 포함)
// - 안부·축하 등 입장이 필요 없으면 09-B 말투 고르기
export type ReplyStep = "ReplyStance" | "ReplyTone";

export const replyStepFor = (tags: AnalysisTag[]): ReplyStep =>
  tags.includes("question") ? "ReplyStance" : "ReplyTone";

// 09-B 위 카드 제목
export const toneCardTitle = (tags: AnalysisTag[]) =>
  tags.includes("occasion")
    ? "경조사 메시지"
    : tags.includes("greeting")
    ? "안부·축하 메시지"
    : "받은 메시지";

// 10 기본 말투 (09-A에서 입장만 고른 경우)
export const DEFAULT_TONE: ReplyTone = "warm";

// 11 / 나중에 답하기
export type DeferOption = "tonight" | "in3days" | "in1week" | "none";

export const DEFER_OPTIONS: { value: DeferOption; label: string }[] = [
  { value: "tonight", label: "오늘 저녁" },
  { value: "in3days", label: "3일 뒤" },
  { value: "in1week", label: "1주 뒤" },
  { value: "none", label: "날짜 없이" },
];

export const deferToDate = (option: DeferOption, from = new Date()) => {
  if (option === "none") return null;
  const d = new Date(from);
  if (option === "tonight") d.setHours(20, 0, 0, 0);
  else {
    d.setDate(d.getDate() + (option === "in3days" ? 3 : 7));
    d.setHours(10, 0, 0, 0);
  }
  return d.toISOString();
};

// 받은 시각 표시 (메시지가 온 때를 알려 줄 뿐, 답장 기한처럼 쓰지 않음)
export const formatRelative = (iso: string, now = Date.now()) => {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 미뤄둔 답장의 다시 볼 때
export const formatRemind = (iso: string | null, now = new Date()) => {
  if (!iso) return "날짜 없이 보관";
  const d = new Date(iso);
  const day = new Date(d).setHours(0, 0, 0, 0);
  const today = new Date(now).setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86_400_000);
  if (diff <= 0) return "오늘 다시 보기";
  if (diff === 1) return "내일 다시 보기";
  return `${diff}일 뒤 다시 보기`;
};
