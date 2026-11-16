import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 07 / 배터리 최적화 예외 설정
const BatteryOptimization = () => {
  const { goNext } = useOnboardingStep("BatteryOptimization");

  return (
    <AuthLayout
      centered
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          배터리 설정 열기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"연락 수집이\n끊기지 않도록 도와주세요"}
      />
    </AuthLayout>
  );
};

export default BatteryOptimization;
