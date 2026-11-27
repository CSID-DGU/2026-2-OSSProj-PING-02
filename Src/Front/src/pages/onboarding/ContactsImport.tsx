import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import PermissionGuide from "@components/onboarding/PermissionGuide";
import Illustration from "@components/onboarding/Illustration";
import SkipButton from "@components/onboarding/SkipButton";
import { ONBOARDING_IMAGES } from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  permissionActionLabel,
  usePermissionStep,
} from "@hooks/usePermissionStep";
import * as s from "./ContactsImport_styled";

const LABEL = "연락처";

// 07 / 연락처 가져오기 (READ_CONTACTS 시스템 팝업)
// 허용하면 09 친구 선택, 건너뛰면 09·10 없이 11 AI 메모리로
// Figma에 없는 상태(거절·설정 복귀·오류)만 부드러운 안내 상자
const ContactsImport = () => {
  const { navigation, goNext } = useOnboardingStep("ContactsImport");
  const state = usePermissionStep("contacts", LABEL);

  const handlePrimary = async () => {
    if (state.granted) {
      goNext();
      return;
    }
    const result = await state.request();
    if (result === "granted") goNext();
  };

  const handleSkip = () => navigation.navigate("AiMemory");

  return (
    <AuthLayout
      backOnly
      centered
      gap={24}
      footer={
        <>
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
              ? "연락처 가져오기"
              : permissionActionLabel(state, "연락처 가져오기")}
          </Button>
          <SkipButton onPress={handleSkip}>건너뛰기</SkipButton>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"연락처로 친구 목록을\n만들어볼까요?"}
        description={"이름과 전화번호는 기기 안에서만\n친구를 구분하는 데 사용해요"}
      />
      <s.Book>
        <Illustration image={ONBOARDING_IMAGES.contactsBook} />
      </s.Book>
      {(state.guide || state.load === "error") && (
        <s.Boxes>
          <PermissionGuide
            state={state}
            label={LABEL}
            consequence="연락처 없이도 메신저 알림으로 친구를 하나씩 추가할 수 있어요."
            showGranted={false}
          />
        </s.Boxes>
      )}
    </AuthLayout>
  );
};

export default ContactsImport;
