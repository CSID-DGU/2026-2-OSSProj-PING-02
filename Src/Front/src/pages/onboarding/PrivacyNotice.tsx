import { Image } from "react-native";
import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import {
  ONBOARDING_ICONS,
  type OnboardingImage,
} from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import * as s from "./PrivacyNotice_styled";

// 03 / 개인정보 처리 안내 (Figma 문구 그대로)
// 구조: 원문은 기기에 보관 → 기기에서 규칙 기반 마스킹(src/utils/masking)으로 이름·전화번호를 가림
// → 가린 내용만 중간 서버를 거쳐 외부 AI로
const POINTS: { title: string; description: string; icon: OnboardingImage }[] =
  [
    {
      title: "원문은 기기에 안전하게 보관",
      description: "친구별로 언제든 삭제할 수 있어요",
      icon: ONBOARDING_ICONS.privacyDevice,
    },
    {
      title: "이름·전화번호는 가려서 처리",
      description: "가린 내용만 외부 AI에 전달해요",
      icon: ONBOARDING_ICONS.privacyMasked,
    },
    {
      title: "전송과 저장은 사용자가 확인",
      description: "서버는 원문을 저장하지 않아요",
      icon: ONBOARDING_ICONS.privacyConfirm,
    },
  ];

const PrivacyNotice = () => {
  const { goNext } = useOnboardingStep("PrivacyNotice");

  return (
    <AuthLayout backOnly
      centered
      gap={32}
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          확인했어요
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"원문은 기기에,\nAI에는 가린 내용만"}
        description="분석 범위와 전송 내용을 사용자가 직접 선택해요"
      />

      <s.Points>
        {POINTS.map(point => (
          <s.Point
            key={point.title}
            accessible
            accessibilityLabel={`${point.title}. ${
              point.description
            }`}
          >
            {/* Figma 03: 제목 → 설명 → 아이콘 */}
            <s.PointTitle>{point.title}</s.PointTitle>
            <s.PointDescription>{point.description}</s.PointDescription>
            <Image
              source={point.icon.source}
              style={[
                s.iconStyle,
                { width: point.icon.width, height: point.icon.height },
              ]}
            />
          </s.Point>
        ))}
      </s.Points>
    </AuthLayout>
  );
};

export default PrivacyNotice;
