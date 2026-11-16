import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 03 / 개인정보 처리 안내
const PrivacyNotice = () => {
  const { goNext } = useOnboardingStep("PrivacyNotice");

  return (
    <AuthLayout
      centered
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
    </AuthLayout>
  );
};

export default PrivacyNotice;
