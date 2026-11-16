import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Illustration from "@components/onboarding/Illustration";
import PermissionGuide from "@components/onboarding/PermissionGuide";
import SkipButton from "@components/onboarding/SkipButton";
import { ONBOARDING_IMAGES } from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  permissionActionLabel,
  usePermissionStep,
} from "@hooks/usePermissionStep";

const LABEL = "알림 접근";

// 04 / 알림 접근 권한 (NotificationListenerService → 설정 화면으로 이동)
// Figma에 없는 상태(거절·설정 복귀·나중에 하기·로딩·오류)는 PermissionGuide + 텍스트 버튼
const NotificationAccess = () => {
  const { goNext } = useOnboardingStep("NotificationAccess");
  const state = usePermissionStep("notificationListener", LABEL);

  const handlePrimary = () => {
    if (state.granted) goNext();
    else state.request();
  };

  return (
    <AuthLayout
      centered
      gap={32}
      footer={
        <>
          {!state.granted && (
            <SkipButton onPress={goNext}>나중에 할게요</SkipButton>
          )}
          <Button
            variant="primary"
            fullWidth
            onPress={handlePrimary}
            disabled={state.requesting || state.load === "loading"}
            accessibilityState={{
              busy: state.requesting,
              disabled: state.requesting || state.load === "loading",
            }}
          >
            {state.granted
              ? "다음"
              : permissionActionLabel(state, "알림 접근 허용하기")}
          </Button>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"알림에 온 연락을\n함께 살펴볼게요"}
        description={
          "선택한 앱의 알림에 표시된 메시지를 확인하고,\n필요한 순간에 부담 없는 답장을 도와드려요"
        }
      />
      <Illustration image={ONBOARDING_IMAGES.sittingSeeds} />
      <PermissionGuide
        state={state}
        label={LABEL}
        consequence="꺼 두면 대화 정리와 답장 제안을 쓸 수 없어요."
      />
    </AuthLayout>
  );
};

export default NotificationAccess;
