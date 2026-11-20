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
import ModelDownload from "@pages/onboarding/ModelDownload";
import NotificationTypes from "@pages/onboarding/NotificationTypes";
import BatteryOptimization from "@pages/onboarding/BatteryOptimization";
import ContactsImport from "@pages/onboarding/ContactsImport";
import ContactsSelect from "@pages/onboarding/ContactsSelect";
import FriendsReady from "@pages/onboarding/FriendsReady";
import AiMemory from "@pages/onboarding/AiMemory";
import AiMemoryEdit from "@pages/onboarding/AiMemoryEdit";
import type { MemoryCategory } from "@constants/onboarding";
import OnboardingDone from "@pages/onboarding/OnboardingDone";
import MainTabs from "@pages/main/MainTabs";
import ConversationDetail from "@pages/contact/ConversationDetail";
import ReplyStance from "@pages/contact/ReplyStance";
import ReplyTone from "@pages/contact/ReplyTone";
import ReplyGroup from "@pages/contact/ReplyGroup";
import ReplyEdit from "@pages/contact/ReplyEdit";
import ReplyDefer from "@pages/contact/ReplyDefer";
import TruncatedMessage from "@pages/contact/TruncatedMessage";
import type { MainTabKey } from "@constants/tabs";
import type { ReplyStance as Stance, ReplyTone as Tone } from "@services";
import Playground from "@pages/dev/Playground";
import NotificationDebug from "@pages/dev/NotificationDebug";

export type RootStackParamList = {
  Splash: undefined;
  AccountStart: undefined;
  Login: undefined;
  Signup: undefined;
  // resend: 인증 전 계정으로 로그인했을 때 화면을 열면서 코드를 새로 보냄
  EmailVerify: { email: string; resend?: boolean };
  FindId: undefined;
  FindPassword: undefined;
  ServiceIntro: undefined;
  PrivacyNotice: undefined;
  NotificationAccess: undefined;
  LinkedApps: undefined;
  ModelDownload: undefined;
  NotificationTypes: undefined;
  BatteryOptimization: undefined;
  ContactsImport: undefined;
  ContactsSelect: undefined;
  FriendsReady: undefined;
  AiMemory: undefined;
  // 11의 상세 작성 화면 (온보딩 단계가 아니라 11에서 열고 닫는 화면)
  AiMemoryEdit: { category: MemoryCategory };
  OnboardingDone: undefined;
  // 메인(하단 탭). tab을 주면 그 탭을 열어 줌
  Home: { tab?: MainTabKey } | undefined;
  // 04 연락
  // 08 1:1 연락 상세
  ConversationDetail: { conversationId: string };
  // 09-A 입장 고르기 / 09-B 말투 고르기 / 09-C 단톡·정보 요약 (단톡 카드는 08 없이 바로)
  ReplyStance: { conversationId: string };
  ReplyTone: { conversationId: string };
  ReplyGroup: { conversationId: string };
  // 10 답장 다듬기. tone이 없으면 직접 쓰기(말투 조절 없음)
  ReplyEdit: {
    conversationId: string;
    text: string;
    tone?: Tone;
    stance?: Stance;
  };
  // 11 나중에 답하기
  ReplyDefer: { conversationId: string };
  // 08 "메시지가 잘린 상태 보기" (시안 없음)
  TruncatedMessage: { conversationId: string };
  Playground: undefined;
  NotificationDebug: undefined;
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
      <Stack.Screen name="ServiceIntro" component={ServiceIntro} />
      <Stack.Screen name="PrivacyNotice" component={PrivacyNotice} />
      <Stack.Screen name="NotificationAccess" component={NotificationAccess} />
      <Stack.Screen name="LinkedApps" component={LinkedApps} />
      <Stack.Screen name="ModelDownload" component={ModelDownload} />
      <Stack.Screen name="NotificationTypes" component={NotificationTypes} />
      <Stack.Screen
        name="BatteryOptimization"
        component={BatteryOptimization}
      />
      <Stack.Screen name="ContactsImport" component={ContactsImport} />
      <Stack.Screen name="ContactsSelect" component={ContactsSelect} />
      <Stack.Screen name="FriendsReady" component={FriendsReady} />
      <Stack.Screen name="AiMemory" component={AiMemory} />
      <Stack.Screen name="AiMemoryEdit" component={AiMemoryEdit} />
      <Stack.Screen name="OnboardingDone" component={OnboardingDone} />

      {/* Main */}
      <Stack.Screen name="Home" component={MainTabs} />

      {/* Contact (04 연락) */}
      <Stack.Screen name="ConversationDetail" component={ConversationDetail} />
      <Stack.Screen name="ReplyStance" component={ReplyStance} />
      <Stack.Screen name="ReplyTone" component={ReplyTone} />
      <Stack.Screen name="ReplyGroup" component={ReplyGroup} />
      <Stack.Screen name="ReplyEdit" component={ReplyEdit} />
      <Stack.Screen name="ReplyDefer" component={ReplyDefer} />
      <Stack.Screen name="TruncatedMessage" component={TruncatedMessage} />

      {/* Dev (개발용 테스트 화면) */}
      <Stack.Screen name="Playground" component={Playground} />
      <Stack.Screen name="NotificationDebug" component={NotificationDebug} />
    </Stack.Navigator>
  );
};

export default Router;
