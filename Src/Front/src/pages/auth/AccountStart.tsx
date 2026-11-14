import { Button } from "@core/ui/button";
import BrandLogo from "@components/auth/BrandLogo";
import FindLinks from "@components/auth/FindLinks";
import * as s from "./AccountStart_styled";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AccountStart = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleLogin = () => navigation.navigate("Login");
  const handleSignup = () => navigation.navigate("Signup");

  return (
    <s.AccountStartWrapper $top={insets.top} $bottom={insets.bottom}>
      <BrandLogo />
      <s.AccountBtnContainer>
        <Button variant="primary" fullWidth onPress={handleLogin}>
          로그인
        </Button>
        <Button variant="secondary" fullWidth onPress={handleSignup}>
          회원가입
        </Button>
        <FindLinks />
      </s.AccountBtnContainer>
    </s.AccountStartWrapper>
  );
};

export default AccountStart;
