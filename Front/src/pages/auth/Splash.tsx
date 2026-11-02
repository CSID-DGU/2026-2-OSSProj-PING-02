import { Button } from "@core/ui/button";
import BrandLogo from "@components/auth/BrandLogo";
import * as s from "./Splash_styled";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Splash = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleStart = () => navigation.navigate("AccountStart");

  return (
    <s.SplashWrapper $top={insets.top} $bottom={insets.bottom}>
      <s.SplashLogoContainer>
        <BrandLogo />
      </s.SplashLogoContainer>
      <s.SplashBtnContainer>
        <Button variant="primary" fullWidth onPress={handleStart}>
          시작하기
        </Button>
      </s.SplashBtnContainer>
    </s.SplashWrapper>
  );
};

export default Splash;
