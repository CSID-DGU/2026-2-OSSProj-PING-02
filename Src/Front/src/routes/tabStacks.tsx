import type { ComponentType } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ConversationDetail from "@pages/contact/ConversationDetail";
import ReplyStance from "@pages/contact/ReplyStance";
import ReplyTone from "@pages/contact/ReplyTone";
import ReplyGroup from "@pages/contact/ReplyGroup";
import ReplyEdit from "@pages/contact/ReplyEdit";
import ReplyDefer from "@pages/contact/ReplyDefer";
import TruncatedMessage from "@pages/contact/TruncatedMessage";
import FriendDetail from "@pages/friend/FriendDetail";
import FirstWords from "@pages/friend/FirstWords";
import Notifications from "@pages/main/Notifications";
import type { TabStackParamList } from "./types";

// 탭 하나 = 스택 하나: 그 탭 첫 화면 + 공통 상세 화면
// 상세 화면을 모든 탭에 등록해서, 홈에서 연락 상세를 열어도 홈 탭 안에 쌓이고 탭바가 보임
// 탭을 다시 누르면 그 탭 첫 화면으로 (native-stack 기본 동작)
const Stack = createNativeStackNavigator<TabStackParamList>();

type TabRootName =
  | "HomeMain"
  | "ContactsMain"
  | "FriendsMain"
  | "CalendarMain"
  | "SettingsMain";

export const createTabStack = (
  rootName: TabRootName,
  RootComponent: ComponentType
) => {
  const TabStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={rootName} component={RootComponent} />

      {/* 공통: 앱바 🔔 */}
      <Stack.Screen name="Notifications" component={Notifications} />

      {/* Contact (04 연락) */}
      <Stack.Screen name="ConversationDetail" component={ConversationDetail} />
      <Stack.Screen name="ReplyStance" component={ReplyStance} />
      <Stack.Screen name="ReplyTone" component={ReplyTone} />
      <Stack.Screen name="ReplyGroup" component={ReplyGroup} />
      <Stack.Screen name="ReplyEdit" component={ReplyEdit} />
      <Stack.Screen name="ReplyDefer" component={ReplyDefer} />
      <Stack.Screen name="TruncatedMessage" component={TruncatedMessage} />

      {/* Friend (05 친구) */}
      <Stack.Screen name="FriendDetail" component={FriendDetail} />
      <Stack.Screen name="FirstWords" component={FirstWords} />
    </Stack.Navigator>
  );
  TabStack.displayName = `${rootName}Stack`;
  return TabStack;
};
