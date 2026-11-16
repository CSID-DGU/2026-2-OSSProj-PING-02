import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import BrandLogo from "@components/auth/BrandLogo";
import { ONBOARDING_STEPS } from "@constants/onboarding";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useSession } from "@stores/SessionProvider";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./Splash_styled";

// 앱 시작점이자 로그인 직후 거쳐 가는 화면
// - 로그인 + 온보딩 완료 → 홈
// - 로그인 + 온보딩 중간 → 멈춘 단계부터 (앞 단계들도 스택에 쌓아 뒤로가기가 자연스럽게)
// - 로그인 전 → 시작하기
const Splash = () => {
  const navigation = useAuthNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const { session } = useSession();
  const { hydrated, data } = useOnboarding();

  const signedIn = session.status === "signedIn";

  useEffect(() => {
    if (!isFocused || !signedIn || !hydrated) return;

    if (data.completed) {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      return;
    }
    const last = ONBOARDING_STEPS.indexOf(data.lastStep);
    const routes = ONBOARDING_STEPS.slice(0, Math.max(last, 0) + 1).map(
      name => ({ name })
    );
    navigation.reset({ index: routes.length - 1, routes });
  }, [isFocused, signedIn, hydrated, data.completed, data.lastStep, navigation]);

  const handleStart = () => navigation.navigate("AccountStart");

  const checking = session.status === "loading" || signedIn;

  return (
    <s.SplashWrapper $top={insets.top} $bottom={insets.bottom}>
      <s.SplashLogoContainer>
        <BrandLogo />
      </s.SplashLogoContainer>
      <s.SplashBtnContainer>
        {checking ? (
          <s.SplashLoading>
            <ActivityIndicator
              color={theme.colors.iconSubtle}
              accessibilityLabel="불러오는 중"
            />
          </s.SplashLoading>
        ) : (
          <Button variant="primary" fullWidth onPress={handleStart}>
            시작하기
          </Button>
        )}
      </s.SplashBtnContainer>
    </s.SplashWrapper>
  );
};

export default Splash;
