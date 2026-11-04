import { Button } from "@core/ui/button";
import BrandLogo from "@components/auth/BrandLogo";
import * as s from "./AccountStart_styled";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AccountStart = () => {
  const insets = useSafeAreaInsets();

  // TODO: 01-2 로그인 · 01-3 회원가입 · 01-4/01-5 찾기 화면 만들면 navigation 연결
  const handleLogin = () => {};
  const handleSignup = () => {};
  const handleFindId = () => {};
  const handleFindPassword = () => {};

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
        <s.FindContainer>
          <Button variant="text" onPress={handleFindId}>
            아이디 찾기
          </Button>
          <s.Divider>|</s.Divider>
          <Button variant="text" onPress={handleFindPassword}>
            비밀번호 찾기
          </Button>
        </s.FindContainer>
      </s.AccountBtnContainer>
    </s.AccountStartWrapper>
  );
};

export default AccountStart;
