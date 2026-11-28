import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import styled from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@core/ui/header";
import NotificationBell from "@components/main/NotificationBell";
import { useAuthNavigation } from "@hooks/useAuthNavigation";

// 08 설정 화면 공통 틀 (Figma Appbar_back): 흰 배경, 가운데 제목 + 왼쪽 뒤로가기 + 오른쪽 🔔
// 내용은 좌우 16(카드 폭 328)으로 스크롤. gap은 화면마다 (H01 12, H07 4)
interface SettingsLayoutProps {
  title: string;
  children: ReactNode;
  gap?: number;
  // 없으면 이전 화면으로
  onBack?: () => void;
  // 아래 고정 버튼 (시안 Content / Screen: 탭바 위 안쪽 20)
  footer?: ReactNode;
}

const SettingsLayout = ({
  title,
  children,
  gap = 12,
  onBack,
  footer,
}: SettingsLayoutProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useAuthNavigation();
  return (
    <Screen $top={insets.top}>
      <Header
        title={title}
        titleAlign="center"
        onBack={onBack ?? (() => navigation.goBack())}
        right={<NotificationBell />}
      />
      <ScrollView contentContainerStyle={[styles.content, { gap }]}>
        {children}
      </ScrollView>
      {footer && <Footer>{footer}</Footer>}
    </Screen>
  );
};

const Screen = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Footer = styled.View`
  padding: 20px;
`;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 },
});

export default SettingsLayout;
