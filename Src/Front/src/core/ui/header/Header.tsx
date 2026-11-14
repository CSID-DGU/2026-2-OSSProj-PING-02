import type { ReactNode } from "react";
import styled, { css } from "styled-components/native";
import { BackIcon } from "../icon";

// Figma: Navigation / Auth Header ("< 로그인", 제목 왼쪽)
//        Navigation / Main App Bar ("☰ Label 👤", 제목 가운데)
export type TitleAlign = "left" | "center";

export interface HeaderProps {
  title?: string;
  titleAlign?: TitleAlign; // 기본 왼쪽(인증 화면), 메인 화면은 "center"
  onBack?: () => void; // 있으면 왼쪽에 뒤로가기 버튼
  left?: ReactNode; // 왼쪽 직접 지정 (예: ☰ 메뉴), onBack보다 우선
  right?: ReactNode; // 오른쪽 (예: 프로필 아이콘)
  divider?: boolean;
}

const Wrapper = styled.View<{ $align: TitleAlign; $divider: boolean }>`
  flex-direction: row;
  align-items: center;
  height: 56px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  ${({ $align }) =>
    $align === "left"
      ? css`
          gap: 12px;
          padding: 0px 20px;
        `
      : css`
          padding: 0px 4px;
        `}
  ${({ theme, $divider }) =>
    $divider &&
    css`
      border-bottom-width: 1px;
      border-bottom-color: ${theme.colors.borderDefault};
    `}
`;

// 가운데 정렬일 때 양옆 칸 (제목이 정확히 가운데 오도록 같은 폭 유지)
const Side = styled.View`
  width: 48px;
  height: 48px;
  justify-content: center;
  align-items: center;
`;

// 아이콘은 24px이지만 터치 영역은 hitSlop으로 44px 확보
const BackButton = styled.TouchableOpacity`
  width: 24px;
  height: 24px;
`;

const Title = styled.Text<{ $align: TitleAlign }>`
  flex: 1;
  text-align: ${({ $align }) => $align};
  ${({ theme }) => theme.fonts.titleAppBar};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Header = ({
  title,
  titleAlign = "left",
  onBack,
  left,
  right,
  divider = false,
}: HeaderProps) => {
  const leftContent =
    left ??
    (onBack ? (
      <BackButton
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
        hitSlop={10}
      >
        <BackIcon />
      </BackButton>
    ) : null);

  const titleNode = (
    <Title $align={titleAlign} numberOfLines={1} accessibilityRole="header">
      {title}
    </Title>
  );

  if (titleAlign === "center") {
    return (
      <Wrapper $align="center" $divider={divider}>
        <Side>{leftContent}</Side>
        {titleNode}
        <Side>{right}</Side>
      </Wrapper>
    );
  }

  return (
    <Wrapper $align="left" $divider={divider}>
      {leftContent}
      {titleNode}
      {right}
    </Wrapper>
  );
};

export default Header;
