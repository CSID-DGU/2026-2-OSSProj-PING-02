import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@core/ui/button";
import { Header } from "@core/ui/header";
import ProgressBar from "@components/onboarding/ProgressBar";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useOnboarding } from "@stores/OnboardingProvider";
import { useSession } from "@stores/SessionProvider";
import * as s from "./Home_styled";

// 홈 자리 표시 화면 (홈 디자인이 나오면 교체)
// 온보딩 완료 후 스택 맨 아래라 뒤로가기는 앱 종료(기본 동작)
const Home = () => {
  const navigation = useAuthNavigation();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useSession();
  const { model } = useOnboarding();

  const name = session.status === "signedIn" ? session.user.name : "";

  const handleSignOut = async () => {
    await signOut().catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
  };

  return (
    <s.Wrapper $top={insets.top} $bottom={insets.bottom}>
      <Header title="말씨앗" titleAlign="center" divider />
      <s.Body>
        <s.Title accessibilityRole="header">
          {name ? `${name}님, 반가워요` : "반가워요"}
        </s.Title>
        <s.Description>홈 화면은 준비 중이에요.</s.Description>

        {model.status === "downloading" && (
          <s.ModelBox>
            <s.Description>AI 모델을 받고 있어요</s.Description>
            <ProgressBar
              value={model.received / model.info.sizeBytes}
              accessibilityLabel="AI 모델 받는 중"
            />
          </s.ModelBox>
        )}
      </s.Body>

      {__DEV__ && (
        <s.Footer>
          <Button variant="text" onPress={handleSignOut}>
            로그아웃 (개발용)
          </Button>
        </s.Footer>
      )}
    </s.Wrapper>
  );
};

export default Home;
