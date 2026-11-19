import type { ReactNode } from "react";
import styled from "styled-components/native";
import { Header } from "@core/ui/header";

// 탭 화면 공통 틀: 가운데 제목 앱바 + 내용 (탭바는 MainTabs가 그림)
// Figma 07·12 앱바의 햄버거·프로필은 기능이 정해지지 않아 생략 (TODO(디자인))
interface TabScreenProps {
  title: string;
  children: ReactNode;
}

const TabScreen = ({ title, children }: TabScreenProps) => (
  <Wrapper>
    <Header title={title} titleAlign="center" divider />
    <Body>{children}</Body>
  </Wrapper>
);

const Wrapper = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

const Body = styled.View`
  flex: 1;
`;

export default TabScreen;
