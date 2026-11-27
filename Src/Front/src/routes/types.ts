import type { NavigatorScreenParams } from "@react-navigation/native";
import type { HelpMode } from "@constants/homeHelp";
import type { MainTabKey } from "@constants/tabs";
import type { ReplyStance as Stance, ReplyTone as Tone } from "@services";

// 화면 이동 구조
// Root stack: 인증 / 온보딩 / Home(하단 탭) / 개발용
// Home(하단 탭): 탭마다 스택 하나. 상세 화면은 "지금 있는 탭" 스택에 쌓여서 탭바가 계속 보임
//   home·contacts·friends·calendar·settings 스택 = 그 탭 첫 화면 + 공통 상세 화면(TabStackParamList)

// 탭 안 스택에 들어가는 화면들
export type TabStackParamList = {
  // 각 탭의 첫 화면 (자기 탭 스택에만 등록됨)
  HomeMain: undefined;
  ContactsMain: undefined;
  FriendsMain: undefined;
  CalendarMain: undefined;
  SettingsMain: undefined;

  // ── 공통 상세 화면 (모든 탭 스택에 등록) ──
  // 앱바 🔔 알림 센터 (자리만)
  Notifications: undefined;
  // 04 홈: C02 오늘 상태 선택(current: 지금 고른 모드) / C03~C05 모드별 화면
  HomeHelpLevel: { current?: HelpMode } | undefined;
  HomeHelpMode: { mode: Exclude<HelpMode, "rest"> };
  // 05 연락 D02 분석 대화방 관리 (D01 톱니)
  AnalysisRooms: undefined;
  // 05 연락 D03 연락 상세(1:1) · D05 단체방: 요약·답장 단계·관계·관련 일정이 한 화면
  //   (#77에서 예전 08·09-A·09-B·09-C·10을 합침)
  ConversationDetail: { conversationId: string };
  // 답장 다듬기: 지금은 05 / 15 첫마디(personId)에서만 씀 (친구 이슈에서 정리)
  // conversationId 형태는 #77 전 연락 흐름용으로 남아 있음
  ReplyEdit:
    | {
        conversationId: string;
        text: string;
        tone?: Tone;
        stance?: Stance;
      }
    | { personId: string; text: string };
  // 08 "메시지가 잘린 상태 보기" (시안 없음)
  // 05 연락 D04 긴 메시지 보완: conversationId 없으면 모든 대화(D01 안내·홈 빠른 기능), 있으면 그 대화만(D03)
  TruncatedMessage: { conversationId?: string } | undefined;
  // 05 친구
  // 14 친구 상세 / 15 첫마디 제안
  FriendDetail: { personId: string };
  FirstWords: { personId: string };
};

// 하단 탭: 탭 이름 = MainTabKey
export type MainTabParamList = {
  [K in MainTabKey]: NavigatorScreenParams<TabStackParamList> | undefined;
};

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
  NotificationTypes: undefined;
  ContactsImport: undefined;
  ContactsSelect: undefined;
  FriendsReady: undefined;
  AiMemory: undefined;
  OnboardingDone: undefined;
  // 메인(하단 탭). 특정 탭으로 보내려면 navigate("Home", { screen: "contacts" })
  Home: NavigatorScreenParams<MainTabParamList> | undefined;
  Playground: undefined;
  NotificationDebug: undefined;
};

// 화면에서 쓰는 전체 이름 (useNavigation 자동완성, RouteProp)
export type AppParamList = RootStackParamList &
  TabStackParamList &
  MainTabParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AppParamList {}
  }
}
