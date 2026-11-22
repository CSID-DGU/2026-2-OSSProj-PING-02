import { useEffect, useState } from "react";
import { Keyboard } from "react-native";
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import TabBar from "@components/main/TabBar";
import { DEFAULT_TAB, MAIN_TABS, type MainTabKey } from "@constants/tabs";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { createTabStack } from "@routes/tabStacks";
import type { MainTabParamList } from "@routes/types";
import HomeTab from "./HomeTab";
import ContactsTab from "./ContactsTab";
import FriendsTab from "./FriendsTab";
import PlaceholderTab from "./PlaceholderTab";

// 메인 화면: 하단 탭 5개 (@react-navigation/bottom-tabs + 기존 TabBar 디자인)
// 탭마다 스택이 있어 상세 화면에서도 탭바가 보임 (Figma 05 연락·06 친구 Screens 11.22)
// 뒤로가기: 탭 안 스택 → 홈이 아닌 탭이면 홈 탭으로(backBehavior) → 홈이면 앱 종료
const tabConfig = (key: MainTabKey) => MAIN_TABS.find(t => t.key === key)!;

const HomeRoot = () => {
  const navigation = useAuthNavigation();
  return (
    <HomeTab
      title={tabConfig("home").title}
      onOpenTab={key => navigation.navigate("Home", { screen: key })}
    />
  );
};
const ContactsRoot = () => <ContactsTab title={tabConfig("contacts").title} />;
const FriendsRoot = () => <FriendsTab title={tabConfig("friends").title} />;
const CalendarRoot = () => <PlaceholderTab tab={tabConfig("calendar")} />;
const SettingsRoot = () => <PlaceholderTab tab={tabConfig("settings")} />;

const STACKS: Record<MainTabKey, ReturnType<typeof createTabStack>> = {
  home: createTabStack("HomeMain", HomeRoot),
  contacts: createTabStack("ContactsMain", ContactsRoot),
  friends: createTabStack("FriendsMain", FriendsRoot),
  calendar: createTabStack("CalendarMain", CalendarRoot),
  settings: createTabStack("SettingsMain", SettingsRoot),
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <MainTabBar {...props} />;

const MainTabs = () => (
  <Tab.Navigator
    initialRouteName={DEFAULT_TAB}
    backBehavior="initialRoute"
    screenOptions={{ headerShown: false }}
    tabBar={renderTabBar}
  >
    {MAIN_TABS.map(tab => (
      <Tab.Screen key={tab.key} name={tab.key} component={STACKS[tab.key]} />
    ))}
  </Tab.Navigator>
);

// bottom-tabs의 tabBar 자리에 기존 TabBar를 그대로 씀
// 키보드가 올라오면 숨김 (답장 입력 등에서 입력창을 가리지 않게)
const MainTabBar = ({ state, navigation, insets }: BottomTabBarProps) => {
  const keyboardOpen = useKeyboardOpen();
  if (keyboardOpen) return null;

  const current = state.routes[state.index].name as MainTabKey;
  const handleChange = (key: MainTabKey) => {
    const route = state.routes.find(r => r.name === key);
    if (!route) return;
    // tabPress: 이미 선택된 탭을 다시 누르면 그 탭 스택이 첫 화면으로 돌아감
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (key !== current && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <TabBar
      current={current}
      onChange={handleChange}
      bottomInset={insets.bottom}
    />
  );
};

const useKeyboardOpen = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
};

export default MainTabs;
