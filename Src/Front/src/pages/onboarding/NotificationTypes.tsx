import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 06 / 받을 알림 선택
const NotificationTypes = () => {
  const { goNext } = useOnboardingStep("NotificationTypes");

  return (
    <AuthLayout
      centered
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          다음
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"받을 알림을\n선택해 주세요"}
        description={
          "전체 선택이 기본값이에요. 원하지 않는 알림은\n체크를 해제할 수 있어요."
        }
      />
    </AuthLayout>
  );
};

export default NotificationTypes;
