import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 09 / 연락처 친구 선택
const ContactsSelect = () => {
  const { goNext } = useOnboardingStep("ContactsSelect");

  return (
    <AuthLayout
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          다음
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"친구로 추가할 연락처를\n선택해요"}
      />
    </AuthLayout>
  );
};

export default ContactsSelect;
