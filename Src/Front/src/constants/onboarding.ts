import type { ImageSourcePropType } from "react-native";
import kakaoTalkIcon from "@assets/img/onboarding/kakao-talk.png";
import instagramIcon from "@assets/img/onboarding/instagram.png";
import smsIcon from "@assets/img/onboarding/sms-messages.png";

// 온보딩(로그인 이후) 단계 순서. "이어서 하기"와 다음 단계 이동에 씀
// 번호는 Figma 화면 번호 (docs/figma/onboarding)
export const ONBOARDING_STEPS = [
  "ServiceIntro", // 02-1 ~ 02-5 서비스 소개
  "PrivacyNotice", // 03 개인정보 처리 안내
  "NotificationAccess", // 04 알림 접근 권한
  "LinkedApps", // 05 연동 앱 선택
  "NotificationTypes", // 06 받을 알림 선택 (+ 06-1 시스템 알림 권한)
  "ContactsImport", // 07 연락처 가져오기 (+ 08 불러오는 중)
  "ContactsSelect", // 09 연락처 친구 선택
  "FriendsReady", // 10 친구 목록 초기 설정 완료
  "AiMemory", // 11 AI 메모리 작성 (+ 11-1 건너뛰기 확인)
  "OnboardingDone", // 12 온보딩 완료
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// 없어진 단계(#59: AI 모델 다운로드·배터리 최적화)가 저장돼 있으면 그다음 단계부터 이어서
const REMOVED_STEP_NEXT: Record<string, OnboardingStep> = {
  ModelDownload: "NotificationTypes",
  BatteryOptimization: "ContactsImport",
};

// 저장된 단계 이름을 지금 단계 구성에 맞춤 (모르는 값이면 처음부터)
export const resolveSavedStep = (saved: unknown): OnboardingStep => {
  if (typeof saved !== "string") return ONBOARDING_STEPS[0];
  if ((ONBOARDING_STEPS as readonly string[]).includes(saved)) {
    return saved as OnboardingStep;
  }
  return REMOVED_STEP_NEXT[saved] ?? ONBOARDING_STEPS[0];
};

export const getNextStep = (step: OnboardingStep): OnboardingStep =>
  ONBOARDING_STEPS[
    Math.min(ONBOARDING_STEPS.indexOf(step) + 1, ONBOARDING_STEPS.length - 1)
  ];

// 05 / 연동 앱 선택. packageName은 실기기 테스트 기준 (알림 수집 네이티브 모듈에서 사용)
export type LinkedApp = "KAKAOTALK" | "INSTAGRAM" | "SMS";

export const LINKED_APP_OPTIONS: {
  value: LinkedApp;
  label: string;
  packageName: string;
  icon: ImageSourcePropType;
}[] = [
  {
    value: "KAKAOTALK",
    label: "카카오톡",
    packageName: "com.kakao.talk",
    icon: kakaoTalkIcon,
  },
  {
    value: "INSTAGRAM",
    label: "인스타그램",
    packageName: "com.instagram.android",
    icon: instagramIcon,
  },
  {
    value: "SMS",
    label: "문자 메신저",
    packageName: "com.samsung.android.messaging",
    icon: smsIcon,
  },
];

// 06 / 받을 알림 선택: 줄마다 스위치, 모두 켜짐이 기본값 (Figma 03 온보딩 06 최종)
// 값 이름은 예전 3개(MORNING·EVENING·NEW_FRIEND)를 그대로 두고 새 3개를 더함
export type NotificationPref =
  | "MORNING"
  | "EVENING"
  | "NEW_FRIEND"
  | "REPLY"
  | "ORIGINAL"
  | "SCHEDULE";

export const NOTIFICATION_PREF_OPTIONS: {
  value: NotificationPref;
  title: string;
  description: string;
}[] = [
  {
    value: "MORNING",
    title: "오늘의 상태 확인",
    description: "오전 9시에 오늘 필요한 도움 수준과 연락을 확인해요",
  },
  {
    value: "EVENING",
    title: "저녁 연락 정리",
    description: "오후 7시에 남은 연락을 모아 알려드려요",
  },
  {
    value: "NEW_FRIEND",
    title: "새 친구·계정 발견 알림",
    description: "처음 보는 발신자와 연결할 계정을 알려드려요",
  },
  {
    value: "REPLY",
    title: "답장 알림",
    description: "준비된 답장과 미뤄둔 연락을 알려드려요",
  },
  {
    value: "ORIGINAL",
    title: "원문 확인 필요",
    description: "메시지 내용 전체를 확인하지 못했을 때 알려드려요",
  },
  {
    value: "SCHEDULE",
    title: "일정 알림",
    description: "생일·경조사와 저장된 일정을 알려드려요",
  },
];

// 11 / AI 메모리: 항목별로 따로 작성
export type MemoryCategory = "status" | "avoid";

export const MEMORY_MAX_LENGTH = 300;

export const MEMORY_CATEGORIES: {
  value: MemoryCategory;
  title: string;
  description: string;
  placeholder: string;
  examples: string[];
}[] = [
  {
    value: "status",
    title: "요즘 나의 상태",
    description: "일정이나 답장이 늦는 이유를 알려주세요",
    placeholder: "예) 요즘 시험 준비로 답장이 늦어요",
    examples: [
      "요즘 시험 준비로 바빠요",
      "몸이 좀 안 좋아서 쉬고 있어요",
      "새 일을 시작해서 적응 중이에요",
      "답장은 짧게 쓰는 편이에요",
    ],
  },
  {
    value: "avoid",
    title: "먼저 꺼내지 않을 이야기",
    description: "AI가 먼저 언급하지 않을 내용을 알려주세요",
    placeholder: "예) 취업 이야기는 먼저 꺼내지 않았으면 해요",
    examples: [
      "취업·진로 이야기",
      "연애 이야기",
      "가족 이야기",
      "건강 이야기",
    ],
  },
];
