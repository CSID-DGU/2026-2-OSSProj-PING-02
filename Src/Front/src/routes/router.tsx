import { createNativeStackNavigator } from "@react-navigation/native-stack";

// pages
import Splash from "@pages/auth/Splash";
import AccountStart from "@pages/auth/AccountStart";
import Login from "@pages/auth/Login";
import Signup from "@pages/auth/Signup";
import EmailVerify from "@pages/auth/EmailVerify";
import FindId from "@pages/auth/FindId";
import FindPassword from "@pages/auth/FindPassword";
import ServiceIntro from "@pages/onboarding/ServiceIntro";
import PrivacyNotice from "@pages/onboarding/PrivacyNotice";
import NotificationAccess from "@pages/onboarding/NotificationAccess";
import LinkedApps from "@pages/onboarding/LinkedApps";
import NotificationTypes from "@pages/onboarding/NotificationTypes";
import ContactsImport from "@pages/onboarding/ContactsImport";
import ContactsSelect from "@pages/onboarding/ContactsSelect";
import FriendsReady from "@pages/onboarding/FriendsReady";
import AiMemory from "@pages/onboarding/AiMemory";
import OnboardingDone from "@pages/onboarding/OnboardingDone";
import MainTabs from "@pages/main/MainTabs";
import Playground from "@pages/dev/Playground";
import NotificationDebug from "@pages/dev/NotificationDebug";
import type { RootStackParamList } from "./types";

// 화면 이름·파라미터 타입은 ./types (탭 안 상세 화면 포함)
export type {
  AppParamList,
  MainTabParamList,
  RootStackParamList,
  TabStackParamList,
} from "./types";

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
      <Stack.Screen name="ServiceIntro" component={ServiceIntro} />
      <Stack.Screen name="PrivacyNotice" component={PrivacyNotice} />
      <Stack.Screen name="NotificationAccess" component={NotificationAccess} />
      <Stack.Screen name="LinkedApps" component={LinkedApps} />
      <Stack.Screen name="NotificationTypes" component={NotificationTypes} />
      <Stack.Screen name="ContactsImport" component={ContactsImport} />
      <Stack.Screen name="ContactsSelect" component={ContactsSelect} />
      <Stack.Screen name="FriendsReady" component={FriendsReady} />
      <Stack.Screen name="AiMemory" component={AiMemory} />
      <Stack.Screen name="OnboardingDone" component={OnboardingDone} />

      {/* Main: 하단 탭 + 탭마다 스택 (연락·친구 상세 화면은 routes/tabStacks) */}
      <Stack.Screen name="Home" component={MainTabs} />

      {/* Dev (개발용 테스트 화면) */}
      <Stack.Screen name="Playground" component={Playground} />
      <Stack.Screen name="NotificationDebug" component={NotificationDebug} />
    </Stack.Navigator>
  );
};

export default Router;
