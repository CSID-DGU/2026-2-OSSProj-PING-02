import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import PermissionGuide from "@components/onboarding/PermissionGuide";
import SkipButton from "@components/onboarding/SkipButton";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  permissionActionLabel,
  usePermissionStep,
} from "@hooks/usePermissionStep";
import * as s from "./BatteryOptimization_styled";

const LABEL = "배터리 최적화 예외";

// 07 / 배터리 최적화 예외 설정 (설정 화면으로 이동)
const BatteryOptimization = () => {
  const { goNext } = useOnboardingStep("BatteryOptimization");
  const state = usePermissionStep("batteryOptimization", LABEL);

  const handlePrimary = () => {
    if (state.granted) goNext();
    else state.request();
  };

  return (
    <AuthLayout backOnly
      centered
      gap={20}
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
              : permissionActionLabel(state, "배터리 설정 열기")}
          </Button>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"연락 수집이\n끊기지 않도록 도와주세요"}
        // TODO(Figma): 07 설명 문구가 시안에서 제목과 겹쳐 읽을 수 없어 임시 문구. 확정되면 교체
        description={
          "휴대폰의 절전 기능이 알림 수집을\n멈추지 않도록 한 번만 설정해요"
        }
      />

      <s.Boxes>
        {state.granted ? (
          <PermissionGuide
            state={state}
            label={LABEL}
            consequence=""
          />
        ) : (
          <>
            {/* 노란 상자가 버튼처럼 보여서 누르면 실제로 배터리 설정이 열리게 함 (주 버튼과 같은 동작) */}
            <s.BoxPress
              onPress={handlePrimary}
              disabled={state.requesting || state.load === "loading"}
              accessibilityRole="button"
              accessibilityLabel="배터리 사용 제한 해제. 말씨앗을 절전 예외 앱으로 설정해요"
              accessibilityHint="눌러서 배터리 설정을 열어요"
            >
              {({ pressed }) => (
                <s.Pressed $pressed={pressed}>
                  <Notice tone="seed" align="center" title="배터리 사용 제한 해제">
                    말씨앗을 절전 예외 앱으로 설정해요
                  </Notice>
                </s.Pressed>
              )}
            </s.BoxPress>
            {state.guide || state.load !== "ready" ? (
              <PermissionGuide
                state={state}
                label={LABEL}
                consequence="꺼 두면 가끔 알림을 늦게 받을 수 있어요."
              />
            ) : (
              <Notice align="center" title="건너뛰어도 괜찮아요">
                수집이 멈추면 복구 방법을 안내해드려요
              </Notice>
            )}
          </>
        )}
      </s.Boxes>
    </AuthLayout>
  );
};

export default BatteryOptimization;
