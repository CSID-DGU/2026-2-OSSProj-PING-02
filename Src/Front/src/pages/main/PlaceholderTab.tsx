import styled from "styled-components/native";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import type { MainTabConfig } from "@constants/tabs";

// 캘린더: 아직 빈 화면 자리만 (설정은 #60 SettingsMain)
const DESCRIPTIONS: Record<string, string> = {
  calendar: "메시지에서 찾은 경조사·약속을 이곳에 모아 보여 드릴게요.",
};

const PlaceholderTab = ({ tab }: { tab: MainTabConfig }) => (
  <TabScreen title={tab.title}>
    <Body>
      <Notice align="center" title={`${tab.label} 화면을 준비하고 있어요`}>
        {DESCRIPTIONS[tab.key] ?? ""}
      </Notice>
    </Body>
  </TabScreen>
);

const Body = styled.View`
  flex: 1;
  justify-content: center;
  gap: 16px;
  padding: 24px 30px;
`;

export default PlaceholderTab;
