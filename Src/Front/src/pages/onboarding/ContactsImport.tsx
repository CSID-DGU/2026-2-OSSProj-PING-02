import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Illustration from "@components/onboarding/Illustration";
import Notice from "@components/onboarding/Notice";
import PermissionGuide from "@components/onboarding/PermissionGuide";
import SkipButton from "@components/onboarding/SkipButton";
import { ONBOARDING_IMAGES } from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  permissionActionLabel,
  usePermissionStep,
} from "@hooks/usePermissionStep";
import * as s from "./ContactsImport_styled";

const LABEL = "연락처";

// 08 / 연락처 가져오기 (READ_CONTACTS 시스템 팝업)
// 허용하면 09 친구 선택, 건너뛰면 09·10 없이 11 AI 메모리로
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
      centered
      gap={24}
      footer={
        <>
          {(!state.granted || state.guide) && (
            <SkipButton onPress={handleSkip}>나중에 할게요</SkipButton>
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
              ? "연락처 가져오기"
              : permissionActionLabel(state, "연락처 가져오기")}
          </Button>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"연락처로 친구 목록을\n먼저 만들어볼까요?"}
        // TODO(Figma): 08 설명 문구가 시안에서 제목과 겹쳐 읽을 수 없어 임시 문구. 확정되면 교체
        description={"이름과 전화번호는 기기 안에서만\n친구를 구분하는 데 사용해요"}
      />
      <Illustration image={ONBOARDING_IMAGES.sittingSeeds} />
      <s.Boxes>
        {state.guide || state.load === "error" ? (
          <PermissionGuide
            state={state}
            label={LABEL}
            consequence="연락처 없이도 메신저 알림으로 친구를 하나씩 추가할 수 있어요."
            showGranted={false}
          />
        ) : (
          <Notice align="center" title="나중에도 가능해요">
            건너뛰어도 설정에서 다시 실행할 수 있어요
          </Notice>
        )}
      </s.Boxes>
    </AuthLayout>
  );
};

export default ContactsImport;
