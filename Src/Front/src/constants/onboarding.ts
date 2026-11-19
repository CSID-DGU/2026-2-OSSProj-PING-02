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
  "ModelDownload", // (Figma 없음) 05 다음: 기기 안 모델 다운로드 (모델을 안 쓰기로 해서 뺄지 팀 결정)
  "NotificationTypes", // 06 받을 알림 선택 (+ 시스템 알림 권한)
  "BatteryOptimization", // 07 배터리 최적화 예외
  "ContactsImport", // 08 연락처 가져오기
  "ContactsSelect", // 09 연락처 친구 선택
  "FriendsReady", // 10 친구 목록 초기 설정 완료
  "AiMemory", // 11 AI 메모리 작성
  "OnboardingDone", // 12 온보딩 완료
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

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

// 06 / 받을 알림 선택 (전체 선택이 기본값)
export type NotificationPref = "MORNING" | "EVENING" | "NEW_FRIEND";

export const NOTIFICATION_PREF_OPTIONS: {
  value: NotificationPref;
  title: string;
  description: string;
}[] = [
  {
    value: "MORNING",
    title: "아침 확인 알림",
    description: "오전 9시에 오늘의 컨디션과 연락을 확인해요",
  },
  {
    value: "EVENING",
    title: "저녁 확인 알림",
    description: "오후 7시에 미뤄둔 답장을 다시 확인해요",
  },
  {
    value: "NEW_FRIEND",
    title: "새 친구 발견 알림",
    description: "새로운 메신저 발신자를 발견하면 바로 알려드려요",
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

// 06 / AI 모델 다운로드: 1.2GB, 540MB 형태
export const formatBytes = (bytes: number) => {
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${Math.round(mb)}MB`;
};
