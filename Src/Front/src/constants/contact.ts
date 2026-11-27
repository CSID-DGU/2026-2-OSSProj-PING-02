import { formatTime, minutesOfDay } from "@core/ui/calendar";
import { LINKED_APP_OPTIONS } from "./onboarding";
import type { ImageSourcePropType } from "react-native";
import type {
  AnalysisTag,
  ConversationKind,
  ConversationSummary,
  MessengerApp,
  ContactRelation,
  ReplyStance,
  ReplyTone,
} from "@services";

// 연락·홈 화면 공통 문구
// 원칙: 재촉하지 않음 ("N일째 답장 안 함" 같은 표현 금지), 미뤄도 괜찮다는 톤

// 앱 이름은 온보딩 연동 앱 상수를 그대로 씀 (패키지명도 같은 곳)
export const APP_LABEL = Object.fromEntries(
  LINKED_APP_OPTIONS.map(o => [o.value, o.label])
) as Record<MessengerApp, string>;

// 05 연락 D01 목록 줄 오른쪽 메신저 로고
export const APP_ICON = Object.fromEntries(
  LINKED_APP_OPTIONS.map(o => [o.value, o.icon])
) as Record<MessengerApp, ImageSourcePropType>;

// 05 연락 D01·D03 작은 메신저 로고 (17dp, Figma에서 내보낸 2x·3x)
export const APP_LOGO_SMALL: Record<MessengerApp, ImageSourcePropType> = {
  KAKAOTALK: require("@assets/img/contact/logo-kakao.png"),
  INSTAGRAM: require("@assets/img/contact/logo-instagram.png"),
  SMS: require("@assets/img/contact/logo-sms.png"),
};

// 05 연락 D01 관계 필터 (시안 메뉴 순서: 친구·가족·직장·기타·전체)
export type RelationFilter = ContactRelation | "all";

export const RELATION_OPTIONS: { value: RelationFilter; label: string }[] = [
  { value: "friend", label: "친구" },
  { value: "family", label: "가족" },
  { value: "work", label: "직장" },
  { value: "etc", label: "기타" },
  { value: "all", label: "전체" },
];

// 05 연락 "꼭 챙길 연락" (디자이너 기준): 별/하트를 켠 친구의 연락 + 직장(업무) + 경조사
// 목록 이름 앞 노란 "!"도 같은 기준
// TODO(06 친구): 별/하트·관계는 지금 mock 데이터에만 있음
export const isMustCare = ({ conversation, analysis }: ConversationSummary) =>
  !!conversation.favorite ||
  conversation.relation === "work" ||
  analysis.tags.includes("occasion");

// 05 연락 D01·D02 밑줄 탭
export type ContactTab = "all" | "mustCare" | "later";

export const CONTACT_TABS: { key: ContactTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "mustCare", label: "꼭 챙길 연락" },
  { key: "later", label: "미뤄둔 답장" },
];

export const filterConversations = (
  items: ConversationSummary[],
  tab: ContactTab,
  relation: RelationFilter
) =>
  items.filter(
    item =>
      (tab === "all" ||
        (tab === "mustCare" ? isMustCare(item) : !!item.deferred)) &&
      (relation === "all" || item.conversation.relation === relation)
  );

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

// 05 연락 D03 입장 고르기 설명 (메시지마다 다른 시안 문장 대신 고정 문구, 팀 확정)
// TODO(디자이너 문구 확인)
export const STANCE_DESCRIPTION: Record<ReplyStance, string> = {
  accept: "좋다고 전하고 싶어요.",
  decline: "이번엔 어렵다고 전하고 싶어요.",
  hold: "조금 더 생각해 보고 싶어요.",
};

// 10 기본 말투 (09-A에서 입장만 고른 경우)
export const DEFAULT_TONE: ReplyTone = "warm";

// 05 연락 D03 나중에 답하기 시트 (Figma "나중에답하기 선택", 기본 "내일")
// 오늘 저녁은 오후 6시, 나머지는 오전 9시 (팀 확정). 오후 6시가 지나면 "오늘 저녁"은 고를 수 없음
export type DeferOption = "tonight" | "tomorrow" | "in3days" | "in1week";

export const DEFER_OPTIONS: { value: DeferOption; label: string }[] = [
  { value: "tonight", label: "오늘 저녁" },
  { value: "tomorrow", label: "내일" },
  { value: "in3days", label: "3일 뒤" },
  { value: "in1week", label: "1주일 뒤" },
];

export const DEFAULT_DEFER_OPTION: DeferOption = "tomorrow";

const DEFER_EVENING_HOUR = 18;
const DEFER_MORNING_HOUR = 9;
// 날짜와 시간 직접 선택의 시간 칩 (오전 9시 · 오후 6시)
export const DEFER_TIME_PRESETS = [
  DEFER_MORNING_HOUR * 60,
  DEFER_EVENING_HOUR * 60,
];

const DEFER_DAYS: Record<DeferOption, number> = {
  tonight: 0,
  tomorrow: 1,
  in3days: 3,
  in1week: 7,
};

export const isDeferOptionAvailable = (option: DeferOption, now = new Date()) =>
  option !== "tonight" || now.getHours() < DEFER_EVENING_HOUR;

export const deferRemindAt = (option: DeferOption, now = new Date()) =>
  new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + DEFER_DAYS[option],
    option === "tonight" ? DEFER_EVENING_HOUR : DEFER_MORNING_HOUR
  );

// 시트 버튼 "내일 다시 알려주기"
export const deferButtonLabel = (option: DeferOption) =>
  `${DEFER_OPTIONS.find(o => o.value === option)!.label} 다시 알려주기`;

// 다시 알려 줄 때: "오늘 오후 6시" / "내일 오전 9시" / "11월 30일 오전 9시"
// 직접 고른 날짜는 시안대로 항상 날짜로 ("11월 25일 오후 6시")
export const formatDeferAt = (date: Date, option?: DeferOption) => {
  const day =
    option === "tonight"
      ? "오늘"
      : option === "tomorrow"
      ? "내일"
      : `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return `${day} ${formatTime(minutesOfDay(date))}`;
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
