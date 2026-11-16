import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 10 / 친구 목록 초기 설정 완료
const FriendsReady = () => {
  const { goNext } = useOnboardingStep("FriendsReady");

  return (
    <AuthLayout
      centered
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          다음
        </Button>
      }
    >
      <AuthIntro variant="onboarding" title={"친구 목록을\n준비했어요"} />
    </AuthLayout>
  );
};

export default FriendsReady;
