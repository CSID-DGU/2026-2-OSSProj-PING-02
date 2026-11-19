import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useSession } from "@stores/SessionProvider";
import type { MainTabConfig } from "@constants/tabs";

// 캘린더·설정: 아직 빈 화면 자리만
const DESCRIPTIONS: Record<string, string> = {
  calendar: "메시지에서 찾은 경조사·약속을 이곳에 모아 보여 드릴게요.",
  settings: "연동 앱·알림·권한·AI 메모리를 이곳에서 바꿀 수 있게 준비하고 있어요.",
};

const PlaceholderTab = ({ tab }: { tab: MainTabConfig }) => {
  const navigation = useAuthNavigation();
  const { signOut } = useSession();

  const handleSignOut = async () => {
    await signOut().catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
  };

  return (
    <TabScreen title={tab.title}>
      <Body>
        <Notice align="center" title={`${tab.label} 화면을 준비하고 있어요`}>
          {DESCRIPTIONS[tab.key] ?? ""}
        </Notice>
        {tab.key === "settings" && __DEV__ && (
          <Button variant="text" onPress={handleSignOut}>
            로그아웃 (개발용)
          </Button>
        )}
      </Body>
    </TabScreen>
  );
};

const Body = styled.View`
  flex: 1;
  justify-content: center;
  gap: 16px;
  padding: 24px 30px;
`;

export default PlaceholderTab;
