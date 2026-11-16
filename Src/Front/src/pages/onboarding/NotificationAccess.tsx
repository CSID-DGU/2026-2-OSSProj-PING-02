import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 04 / 알림 접근 권한
const NotificationAccess = () => {
  const { goNext } = useOnboardingStep("NotificationAccess");

  return (
    <AuthLayout
      centered
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          알림 접근 허용하기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"알림에 온 연락을\n함께 살펴볼게요"}
        description={
          "선택한 앱의 알림에 표시된 메시지를 확인하고,\n필요한 순간에 부담 없는 답장을 도와드려요"
        }
      />
    </AuthLayout>
  );
};

export default NotificationAccess;
