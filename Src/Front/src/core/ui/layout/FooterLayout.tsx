import type { ReactNode } from "react";
import styled from "styled-components/native";

// Figma: 05 연락 Screens D02 "분석 대화방 관리" 등
// 목록만 스크롤되고 아래 버튼 1~2개(예: "변경 사항 저장하기" + "전체 선택")는 고정
// children: 목록(FlatList·ScrollView)을 그대로 넣음. 남은 높이를 채움
// footer: 버튼들. 위에서 아래로 쌓이고 간격 8dp, 좌우 20dp
export interface FooterLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
  // 버튼 영역 아래 여백 (하단 탭바가 없는 화면은 안전 영역 높이를 더해 넘김)
  bottomInset?: number;
  // 버튼 영역 위 구분선
  divider?: boolean;
  // 버튼 영역 바탕: 화면 본문과 맞춤 (기본 크림 backgroundBase, 흰 본문이면 "surface")
  background?: "base" | "surface";
}

export const FooterLayout = ({
  children,
  footer,
  bottomInset = 0,
  divider = false,
  background = "base",
}: FooterLayoutProps) => (
  <Wrapper>
    <Body>{children}</Body>
    {footer && (
      <Footer
        $bottom={bottomInset}
        $divider={divider}
        $surface={background === "surface"}
      >
        {footer}
      </Footer>
    )}
  </Wrapper>
);

const Wrapper = styled.View`
  flex: 1;
`;

const Body = styled.View`
  flex: 1;
`;

const Footer = styled.View<{
  $bottom: number;
  $divider: boolean;
  $surface: boolean;
}>`
  gap: 8px;
  padding: 12px 20px ${({ $bottom }) => $bottom + 12}px;
  background-color: ${({ theme, $surface }) =>
    $surface ? theme.colors.surfaceDefault : theme.colors.backgroundBase};
  border-top-width: ${({ $divider }) => ($divider ? 1 : 0)}px;
  border-top-color: ${({ theme }) => theme.colors.borderDefault};
`;

export default FooterLayout;
