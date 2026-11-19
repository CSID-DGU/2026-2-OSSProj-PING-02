import { useCallback, useEffect, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";
import TabBar from "@components/main/TabBar";
import { DEFAULT_TAB, MAIN_TABS, type MainTabKey } from "@constants/tabs";
import { useAndroidBack } from "@hooks/useAndroidBack";
import type { RootStackParamList } from "@routes/router";
import HomeTab from "./HomeTab";
import ContactsTab from "./ContactsTab";
import FriendsTab from "./FriendsTab";
import PlaceholderTab from "./PlaceholderTab";

// 메인 화면: 하단 탭 5개 (라이브러리 없이 스택 화면 하나 + 탭바)
// 상세 화면들은 스택 위에 올라가서 탭바가 가려짐 (Figma 08처럼)
// 뒤로가기: 홈이 아닌 탭이면 홈으로, 홈이면 앱 종료(기본 동작)
const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "Home">>();
  const [tab, setTab] = useState<MainTabKey>(params?.tab ?? DEFAULT_TAB);

  // 다른 화면에서 특정 탭으로 보낼 때 (navigate("Home", { tab }))
  useEffect(() => {
    if (params?.tab) setTab(params.tab);
  }, [params?.tab]);

  const handleBack = useCallback(() => {
    if (tab === DEFAULT_TAB) return false;
    setTab(DEFAULT_TAB);
    return true;
  }, [tab]);
  useAndroidBack(handleBack);

  const config = MAIN_TABS.find(t => t.key === tab) ?? MAIN_TABS[0];

  return (
    <Wrapper $top={insets.top}>
      <Content>
        {tab === "home" ? (
          <HomeTab title={config.title} onOpenTab={setTab} />
        ) : tab === "contacts" ? (
          <ContactsTab title={config.title} />
        ) : tab === "friends" ? (
          <FriendsTab title={config.title} />
        ) : (
          <PlaceholderTab tab={config} />
        )}
      </Content>
      <TabBar current={tab} onChange={setTab} bottomInset={insets.bottom} />
    </Wrapper>
  );
};

const Wrapper = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Content = styled.View`
  flex: 1;
`;

export default MainTabs;
