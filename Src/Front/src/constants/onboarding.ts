import type { ImageSourcePropType } from "react-native";
import type { PermissionKey } from "@services";
import kakaoTalkIcon from "@assets/img/onboarding/kakao-talk.png";
import instagramIcon from "@assets/img/onboarding/instagram.png";
import smsIcon from "@assets/img/onboarding/sms-messages.png";

// 온보딩(로그인 이후) 단계 순서. 진행 단계 표시와 "이어서 하기"에 씀
export const ONBOARDING_STEPS = [
  "PrivacyNotice",
  "Permissions",
  "LinkedApps",
  "ModelDownload",
  "AiMemory",
  "OnboardingDone",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

export const getStepNumber = (step: OnboardingStep) =>
  ONBOARDING_STEPS.indexOf(step) + 1;

export const getNextStep = (step: OnboardingStep): OnboardingStep =>
  ONBOARDING_STEPS[Math.min(getStepNumber(step), ONBOARDING_TOTAL - 1)];

// 건너뛸 수 있는 단계와 완료 화면에서 보여 줄 이름
export type SkippableStep = "Permissions" | "ModelDownload" | "AiMemory";

export const SKIPPED_STEP_LABEL: Record<SkippableStep, string> = {
  Permissions: "권한 켜기",
  ModelDownload: "AI 모델 받기",
  AiMemory: "AI 메모리 쓰기",
};

// 05 / 연동 앱 선택
export type LinkedApp = "KAKAOTALK" | "INSTAGRAM" | "SMS";

export const LINKED_APP_OPTIONS: {
  value: LinkedApp;
  label: string;
  icon: ImageSourcePropType;
}[] = [
  { value: "KAKAOTALK", label: "카카오톡", icon: kakaoTalkIcon },
  { value: "INSTAGRAM", label: "인스타그램", icon: instagramIcon },
  { value: "SMS", label: "문자 메시지", icon: smsIcon },
];

// 04 / 권한 요청: 권한마다 왜 필요한지
export const PERMISSION_COPY: Record<
  PermissionKey,
  { title: string; reason: string; required: string }
> = {
  notificationListener: {
    title: "알림 읽기",
    reason:
      "카카오톡·문자 알림을 읽어야 대화를 정리하고 답장 문구를 제안할 수 있어요. 읽은 내용은 이 휴대폰 밖으로 나가지 않아요.",
    required: "꺼 두면 대화 정리와 답장 제안을 쓸 수 없어요.",
  },
  postNotifications: {
    title: "앱 알림",
    reason:
      "놓치면 아쉬울 연락이 있을 때만 조용히 알려 드려요.",
    required: "꺼 두면 앱을 열었을 때만 확인할 수 있어요.",
  },
  batteryOptimization: {
    title: "배터리 최적화 예외",
    reason:
      "휴대폰이 절전을 위해 앱을 멈추면 알림을 놓칠 수 있어요. 예외로 두면 뒤에서도 안정적으로 동작해요.",
    required: "꺼 두면 가끔 알림을 늦게 받을 수 있어요.",
  },
};

// 06 / AI 모델 다운로드: 1.2GB, 540MB 형태
export const formatBytes = (bytes: number) => {
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${Math.round(mb)}MB`;
};

// 07 / AI 메모리 예시 (눌러서 입력창에 더할 수 있음)
export const MEMORY_MAX_LENGTH = 300;

export const MEMORY_EXAMPLES = [
  "답장은 짧게 쓰는 편이에요",
  "이모티콘은 거의 안 써요",
  "친구에게는 반말, 선배에게는 존댓말을 써요",
  "늦게 답해도 사과는 한 번만 하고 싶어요",
] as const;
