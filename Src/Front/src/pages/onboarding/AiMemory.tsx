import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 11 / AI 메모리 작성 · 기본
const AiMemory = () => {
  const { goNext } = useOnboardingStep("AiMemory");

  return (
    <AuthLayout
      centered
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          내용 작성하기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"내 상황을 조금\n알려주실래요?"}
        description="답장에 참고해도 되는 내용만 선택해서 적어요"
      />
    </AuthLayout>
  );
};

export default AiMemory;
