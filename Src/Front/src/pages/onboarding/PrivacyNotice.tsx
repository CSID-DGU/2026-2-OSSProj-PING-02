import { useCallback, useState } from "react";
import { BackHandler } from "react-native";
import { Button } from "@core/ui/button";
import { Card, CardDescription, CardTitle } from "@core/ui/card";
import { Dialog } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useAndroidBack } from "@hooks/useAndroidBack";
import { useOnboardingStep } from "@hooks/useOnboardingStep";

// 03 / 서비스·개인정보 처리 안내 (온보딩 1단계)
// 로그인 직후 첫 화면이라 돌아갈 곳이 없음 → 뒤로가기는 "잠시 쉬어 가기" 안내
const PrivacyNotice = () => {
  const { goNext, progress } = useOnboardingStep("PrivacyNotice");
  const [leaveOpen, setLeaveOpen] = useState(false);

  const handleBack = useCallback(() => {
    setLeaveOpen(true);
    return true;
  }, []);
  useAndroidBack(handleBack);

  return (
    <AuthLayout
      title="개인정보 안내"
      onBack={null}
      progress={progress}
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          확인했어요
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"대화는 이 휴대폰 안에서만\n다뤄요"}
        description="말씨앗이 무엇을 어디서 처리하는지 먼저 알려 드릴게요."
      />

      <Card>
        <CardTitle>대화 원문과 분석은 기기 안에서만</CardTitle>
        <CardDescription>
          알림으로 받은 메시지 원문, 대화 요약, 답장 제안은 모두 이 휴대폰
          안에서 만들어지고 저장돼요. 서버로 보내지 않아요.
        </CardDescription>
      </Card>

      <Card>
        <CardTitle>서버가 하는 일은 두 가지예요</CardTitle>
        <CardDescription>
          로그인할 때 계정을 확인하는 일, 그리고 휴대폰에서 쓸 AI 모델 파일을
          전해 주는 일만 해요.
        </CardDescription>
      </Card>

      <Card>
        <CardTitle>정하는 건 언제나 나예요</CardTitle>
        <CardDescription>
          어떤 앱을 연결할지, 어떤 권한을 켤지는 직접 고를 수 있고, 나중에
          휴대폰 설정에서 바꿀 수 있어요.
        </CardDescription>
      </Card>

      <Dialog
        visible={leaveOpen}
        icon={null}
        title="여기서 잠시 쉬어 갈까요?"
        description="지금 앱을 닫아도 다음에 열면 이 단계부터 이어서 할 수 있어요."
        confirmLabel="계속할게요"
        onConfirm={() => setLeaveOpen(false)}
        closeLabel="앱 닫기"
        onClose={() => BackHandler.exitApp()}
        dismissOnBackdrop={false}
      />
    </AuthLayout>
  );
};

export default PrivacyNotice;
