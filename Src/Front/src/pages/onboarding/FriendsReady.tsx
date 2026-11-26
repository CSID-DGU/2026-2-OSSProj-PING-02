import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./FriendsReady_styled";

// 10 / 친구 목록 초기 설정 완료
// Figma 10 최종: 배경 없는 3줄을 구분선으로 나눔 (예전 시안의 색 카드 3개 대신)
const FriendsReady = () => {
  const { goNext } = useOnboardingStep("FriendsReady");
  const { data } = useOnboarding();

  const rows = [
    {
      title: `친구 ${data.friends.length}명 추가 완료`,
      description: "이름과 전화번호로 친구 목록을 만들었어요",
    },
    {
      title: "메신저 계정은 나중에 연결해요",
      description: "카카오톡·인스타그램 알림이 실제로 온 뒤 확인해요",
    },
    {
      title: "자동으로 같은 사람으로 합치지 않아요",
      description: "새 발신자를 발견하면 기존 친구인지 추천만 해요",
    },
  ];

  return (
    <AuthLayout
      backOnly
      centered
      gap={29}
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
      <s.Rows>
        {rows.map((row, i) => (
          <s.Row
            key={row.title}
            $first={i === 0}
            $last={i === rows.length - 1}
            accessible
            accessibilityLabel={`${row.title}. ${row.description}`}
          >
            <s.RowTitle>{row.title}</s.RowTitle>
            <s.RowDescription>{row.description}</s.RowDescription>
          </s.Row>
        ))}
      </s.Rows>
    </AuthLayout>
  );
};

export default FriendsReady;
