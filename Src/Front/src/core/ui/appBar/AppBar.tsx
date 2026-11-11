import type { ReactNode } from "react";
import styled from "styled-components/native";

// Figma: Navigation / Auth Header ("< 로그인", 제목 왼쪽)
//        Navigation / Main App Bar ("☰ Label 👤", 제목 가운데)
export type TitleAlign = "center" | "left";

export interface AppBarProps {
  title?: string;
  titleAlign?: TitleAlign; // 기본 가운데, 로그인·회원가입 화면은 "left"
  onBack?: () => void; // 있으면 왼쪽에 "<" 뒤로가기 버튼
  left?: ReactNode; // 왼쪽 직접 지정 (예: ☰ 메뉴), onBack보다 우선
  right?: ReactNode; // 오른쪽 (예: 프로필 아이콘)
  divider?: boolean;
}

const Container = styled.View<{ $divider: boolean }>`
  height: 56px;
  flex-direction: row;
  align-items: center;
  padding: 0px 4px;
  background-color: ${({ theme }) => theme.colors.backgroundBase};
  ${({ theme, $divider }) =>
    $divider &&
    `border-bottom-width: 1px; border-bottom-color: ${theme.colors.borderDefault};`}
`;

const Side = styled.View`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
`;

const Title = styled.Text<{ $align: TitleAlign }>`
  flex: 1;
  text-align: ${({ $align }) => $align};
  ${({ theme }) => theme.fonts.titleAppBar};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BackButton = styled.TouchableOpacity`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
`;

// 임시 "<" 모양 (UI/assets/icons/ui 의 SVG로 나중에 교체 예정)
const Chevron = styled.View`
  width: 12px;
  height: 12px;
  margin-left: 4px;
  border-left-width: 2px;
  border-bottom-width: 2px;
  border-color: ${({ theme }) => theme.colors.iconDefault};
  transform: rotate(45deg);
`;

export const AppBar = ({
  title,
  titleAlign = "center",
  onBack,
  left,
  right,
  divider = false,
}: AppBarProps) => {
  const leftContent =
    left ??
    (onBack ? (
      <BackButton
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Chevron />
      </BackButton>
    ) : null);

  const isLeft = titleAlign === "left";

  return (
    <Container $divider={divider}>
      {/* 왼쪽 정렬인데 왼쪽 내용이 없으면 빈칸을 두지 않음 */}
      {isLeft && !leftContent ? null : <Side>{leftContent}</Side>}

      <Title $align={titleAlign} numberOfLines={1} accessibilityRole="header">
        {title}
      </Title>

      {/* 가운데 정렬일 때는 제목이 정확히 가운데 오도록 오른쪽 칸 항상 유지 */}
      {isLeft && !right ? null : <Side>{right}</Side>}
    </Container>
  );
};

export default AppBar;