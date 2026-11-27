import { useState } from "react";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Illustration from "@components/onboarding/Illustration";
import { ONBOARDING_IMAGES } from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./OnboardingDone_styled";

// 12 / 온보딩 완료 → 홈
// Figma 12: 제목·설명 → 말씨 → "말씨앗의 약속" 상자(흰 바탕 + 테두리) → 말씨앗 시작하기
const OnboardingDone = () => {
  const { navigation } = useOnboardingStep("OnboardingDone");
  const { update } = useOnboarding();
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    // 저장이 실패해도 홈으로 보냄 (다음 실행 때 온보딩이 다시 보일 뿐)
    await update({ completed: true }).catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  return (
    <AuthLayout
      backOnly
      centered
      gap={20}
      footer={
        <Button
          variant="primary"
          fullWidth
          onPress={handleFinish}
          disabled={finishing}
          accessibilityState={{ busy: finishing, disabled: finishing }}
        >
          말씨앗 시작하기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"이제 준비가\n모두 끝났어요"}
        description={
          "연락은 조용히 모으고, 도움의 정도와\n최종 답장은 언제나 직접 선택해요"
        }
      />
      <Illustration image={ONBOARDING_IMAGES.sittingSeedsDone} />

      <s.PromiseBox>
        <Card
          style={s.promiseCardStyle}
          accessible
          accessibilityLabel="말씨앗의 약속. 앞으로 도착하는 알림만, 선택한 앱 범위에서 수집해요">
          <s.PromiseTitle>말씨앗의 약속</s.PromiseTitle>
          <s.PromiseText>
            앞으로 도착하는 알림만, 선택한 앱 범위에서 수집해요
          </s.PromiseText>
        </Card>
      </s.PromiseBox>
    </AuthLayout>
  );
};

export default OnboardingDone;
