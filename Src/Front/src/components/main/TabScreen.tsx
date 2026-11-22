import type { ReactNode } from "react";
import styled from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@core/ui/header";
import NotificationBell from "./NotificationBell";

// 탭 화면 공통 틀: 가운데 제목 앱바(오른쪽 🔔) + 내용 (탭바는 MainTabs가 그림)
// Figma 07·12 앱바의 햄버거·프로필은 기능이 정해지지 않아 생략 (TODO(디자인))
interface TabScreenProps {
  title: string;
  children: ReactNode;
}

const TabScreen = ({ title, children }: TabScreenProps) => {
  const insets = useSafeAreaInsets();
  return (
    <Wrapper $top={insets.top}>
      <Header
        title={title}
        titleAlign="center"
        divider
        right={<NotificationBell />}
      />
      <Body>{children}</Body>
    </Wrapper>
  );
};

// 상태 표시줄 뒤는 앱바와 같은 흰색
const Wrapper = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Body = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

export default TabScreen;
