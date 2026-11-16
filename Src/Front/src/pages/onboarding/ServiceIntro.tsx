import { useCallback, useState } from "react";
import { BackHandler } from "react-native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useAndroidBack } from "@hooks/useAndroidBack";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 02-1 ~ 02-5 서비스 소개 (온보딩 첫 화면, 로그인 다음)
// 돌아갈 화면이 없어서 뒤로가기는 "잠시 쉬어 가기" 안내
const ServiceIntro = () => {
  const { goNext } = useOnboardingStep("ServiceIntro");
  const [leaveOpen, setLeaveOpen] = useState(false);

  const handleBack = useCallback(() => {
    setLeaveOpen(true);
    return true;
  }, []);
  useAndroidBack(handleBack);

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
        title={"작은 한마디가,\n다시 이어질 씨앗이 되도록"}
        description={"답이 늦었어도 괜찮아요.\n지금 건넬 수 있는 말부터 함께 찾아요"}
      />

      {/* Dialog는 닫기 버튼·뒤로가기·바깥 누르기가 모두 onClose라서,
          앱 종료는 confirm에만 두고 onClose는 팝업만 닫게 함 */}
      <Dialog
        visible={leaveOpen}
        icon={null}
        title="여기서 잠시 쉬어 갈까요?"
        description="지금 앱을 닫아도 다음에 열면 이 단계부터 이어서 할 수 있어요."
        confirmLabel="쉬어 갈게요 (앱 닫기)"
        onConfirm={() => BackHandler.exitApp()}
        closeLabel="계속할게요"
        onClose={() => setLeaveOpen(false)}
      />
    </AuthLayout>
  );
};

export default ServiceIntro;
