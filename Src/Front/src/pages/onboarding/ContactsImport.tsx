import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 08 / 연락처 가져오기
const ContactsImport = () => {
  const { goNext } = useOnboardingStep("ContactsImport");

  return (
    <AuthLayout
      centered
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          연락처 가져오기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"연락처로 친구 목록을\n먼저 만들어볼까요?"}
      />
    </AuthLayout>
  );
};

export default ContactsImport;
