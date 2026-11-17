import { Button } from "@core/ui/button";
import { Card, CardDescription, CardTitle } from "@core/ui/card";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./FriendsReady_styled";

// 10 / 친구 목록 초기 설정 완료
const FriendsReady = () => {
  const { goNext } = useOnboardingStep("FriendsReady");
  const { data } = useOnboarding();

  return (
    <AuthLayout backOnly
      centered
      gap={24}
      footer={
        <Button variant="primary" fullWidth onPress={goNext}>
          다음
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"친구 목록을\n준비했어요"}
        description={"선택한 연락처를 기준으로\n초기 친구 목록을 만들었어요"}
      />
      <s.Cards>
        <Card variant="selected">
          <CardTitle>{`친구 ${data.friends.length}명 추가 완료`}</CardTitle>
          <CardDescription>
            이름과 전화번호로 친구 목록을 만들었어요
          </CardDescription>
        </Card>
        {/* Figma 배경 #F8F0EA·#F4F1EF는 토큰에 없어 surface/brown·neutral/100으로 */}
        <Card style={s.brownCard}>
          <CardTitle>메신저 계정은 나중에 연결해요</CardTitle>
          <CardDescription>
            카카오톡·인스타그램 알림이 실제로 온 뒤 확인해요
          </CardDescription>
        </Card>
        <Card style={s.neutralCard}>
          <CardTitle>자동으로 같은 사람으로 합치지 않아요</CardTitle>
          <CardDescription>
            새 발신자를 발견하면 기존 친구인지 추천만 해요
          </CardDescription>
        </Card>
      </s.Cards>
    </AuthLayout>
  );
};

export default FriendsReady;
