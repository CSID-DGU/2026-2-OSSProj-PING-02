import { createNativeStackNavigator } from "@react-navigation/native-stack";

// pages
import Splash from "@pages/auth/Splash";
import AccountStart from "@pages/auth/AccountStart";
import Login from "@pages/auth/Login";
import Signup from "@pages/auth/Signup";
import EmailVerify from "@pages/auth/EmailVerify";
import FindId from "@pages/auth/FindId";
import FindPassword from "@pages/auth/FindPassword";
import PrivacyNotice from "@pages/onboarding/PrivacyNotice";
import Permissions from "@pages/onboarding/Permissions";
import LinkedApps from "@pages/onboarding/LinkedApps";
import ModelDownload from "@pages/onboarding/ModelDownload";
import AiMemory from "@pages/onboarding/AiMemory";
import OnboardingDone from "@pages/onboarding/OnboardingDone";
import Home from "@pages/home/Home";
import Playground from "@pages/dev/Playground";

export type RootStackParamList = {
  Splash: undefined;
  AccountStart: undefined;
  Login: undefined;
  Signup: undefined;
  // resend: 인증 전 계정으로 로그인했을 때 화면을 열면서 코드를 새로 보냄
  EmailVerify: { email: string; resend?: boolean };
  FindId: undefined;
  FindPassword: undefined;
  PrivacyNotice: undefined;
  Permissions: undefined;
  LinkedApps: undefined;
  ModelDownload: undefined;
  AiMemory: undefined;
  OnboardingDone: undefined;
  Home: undefined;
  Playground: undefined;
};

// useNavigation()에서 화면 이름 자동완성
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const Router = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      {/* Auth */}
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="AccountStart" component={AccountStart} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="EmailVerify" component={EmailVerify} />
      <Stack.Screen name="FindId" component={FindId} />
      <Stack.Screen name="FindPassword" component={FindPassword} />

      {/* Onboarding (로그인 이후, constants/onboarding의 ONBOARDING_STEPS 순서) */}
      <Stack.Screen name="PrivacyNotice" component={PrivacyNotice} />
      <Stack.Screen name="Permissions" component={Permissions} />
      <Stack.Screen name="LinkedApps" component={LinkedApps} />
      <Stack.Screen name="ModelDownload" component={ModelDownload} />
      <Stack.Screen name="AiMemory" component={AiMemory} />
      <Stack.Screen name="OnboardingDone" component={OnboardingDone} />

      {/* Main */}
      <Stack.Screen name="Home" component={Home} />

      {/* Dev (개발용 테스트 화면) */}
      <Stack.Screen name="Playground" component={Playground} />
    </Stack.Navigator>
  );
};

export default Router;
