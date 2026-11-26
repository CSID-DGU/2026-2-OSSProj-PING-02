import styled from "styled-components/native";

// 04 홈 (Figma C01 기본 홈 · C08 홈 빈 상태), 2x PNG ÷ 2 로 잰 값

export const Screen = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

// ── 로고 줄: 높이 59, 왼쪽 여백 10 (+ 씨앗 그림 앞 6 → 그림이 16dp부터 보임), 🔔 오른쪽 24
export const LogoRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  height: 59px;
  padding: 12px 24px 0px 10px;
`;

export const LogoImage = styled.Image`
  width: 36px;
  height: 35px;
  margin-left: 6px;
`;

export const LogoText = styled.Text`
  flex: 1;
  margin-top: 10px;
  ${({ theme }) => theme.fonts.brandHomeLogo};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const BellSlot = styled.View`
  margin-top: 9px;
`;

// ── 본문
export const listContent = {
  paddingHorizontal: 16,
  paddingBottom: 24,
};

export const Center = styled.View`
  padding: 40px 0px;
  align-items: center;
`;

// 섹션 제목 줄 (제목 + 오른쪽 "전체 보기 >") : 위 카드와 12~13, 아래 내용과 13
export const SectionHeader = styled.View<{ $top?: number }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ $top }) => $top ?? 13}px;
`;

export const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const LinkPress = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

export const LinkText = styled.Text`
  ${({ theme }) => theme.fonts.labelLink};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// C08 빈 상태 설명
export const EmptyDescription = styled.Text`
  margin-top: 13px;
  ${({ theme }) => theme.fonts.bodyCompact};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

// ── 꼭 챙길 연락 카드 (2열, 158×116, 사이 12, 모서리 22)
export const CardRow = styled.View<{ $top: number }>`
  flex-direction: row;
  gap: 12px;
  margin-top: ${({ $top }) => $top}px;
`;

export const CardSpacer = styled.View`
  flex: 1;
`;

export const ContactCard = styled.Pressable`
  flex: 1;
  height: 116px;
  padding: 15px;
  border-radius: 22px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

export const AppIcon = styled.Image`
  width: 24px;
  height: 24px;
`;

export const ContactName = styled.Text`
  margin-top: 7px;
  ${({ theme }) => theme.fonts.titleCard};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const ContactSummary = styled.Text`
  margin-top: 7px;
  ${({ theme }) => theme.fonts.captionCard};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// ── 줄 카드 공통 (단체방 요약 · 일정 · 안부): 모서리 22, 오른쪽 ">" 앞 14
export const RowCard = styled.Pressable<{
  $height?: number;
  $variant: "brown" | "line" | "lineToday" | "white";
  $top: number;
  $left: number;
}>`
  flex-direction: row;
  align-items: center;
  ${({ $height }) => ($height ? `height: ${$height}px;` : "")}
  margin-top: ${({ $top }) => $top}px;
  padding: 0px 14px 0px ${({ $left }) => $left}px;
  border-radius: 22px;
  border-width: ${({ $variant }) => ($variant === "brown" ? 0 : 1)}px;
  border-color: ${({ theme, $variant }) =>
    $variant === "lineToday"
      ? theme.colors.borderStrong
      : theme.colors.borderDefault};
  background-color: ${({ theme, $variant }) => {
    if ($variant === "brown") return theme.colors.surfaceBrown;
    if ($variant === "lineToday") return theme.colors.backgroundSubtle;
    if ($variant === "white") return theme.colors.surfaceDefault;
    return theme.colors.backgroundBase;
  }};
`;

export const RowTexts = styled.View<{ $left: number }>`
  flex: 1;
  margin: 0px 8px 0px ${({ $left }) => $left}px;
`;

export const RowTitle = styled.Text<{ $small?: boolean }>`
  ${({ theme, $small }) =>
    $small ? theme.fonts.titleCardSmall : theme.fonts.titleCard};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const RowDescription = styled.Text<{ $top: number; $compact?: boolean }>`
  margin-top: ${({ $top }) => $top}px;
  ${({ theme, $compact }) =>
    $compact ? theme.fonts.captionCompact : theme.fonts.captionCard};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 안부 카드: 위 10 · 아래 11 (설명이 두 줄까지)
export const ReconnectTexts = styled.View`
  flex: 1;
  margin: 0px 8px 0px 24px;
  padding: 10px 0px 11px;
`;

// 일정 날짜 원: 지름 50 (오늘이면 진한 갈색)
export const DateCircle = styled.View<{ $today: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, $today }) =>
    $today ? theme.colors.actionPrimaryBg : theme.colors.stateSelectedBg};
`;

export const DateMonth = styled.Text<{ $today: boolean }>`
  ${({ theme }) => theme.fonts.brandDateMonth};
  color: ${({ theme, $today }) =>
    $today ? theme.colors.textOnDark : theme.colors.textSecondary};
`;

export const DateDay = styled.Text<{ $today: boolean }>`
  ${({ theme }) => theme.fonts.brandDateDay};
  color: ${({ theme, $today }) =>
    $today ? theme.colors.textOnDark : theme.colors.textPrimary};
`;

// ── 빠른 기능 카드 (2열, 높이 96, 모서리 20, 연노랑 바탕, 안쪽 왼쪽 14)
// 오른쪽: 시안 12지만 안드로이드 글자 폭이 Figma보다 약 4% 넓어 설명이 두 줄이 됨 → 8 (시안처럼 한 줄)
export const QuickCard = styled.Pressable`
  flex: 1;
  height: 96px;
  padding: 12px 8px 0px 14px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

export const QuickTitle = styled.Text`
  margin-top: 7.5px;
  ${({ theme }) => theme.fonts.titleCardSmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const QuickDescription = styled.Text`
  margin-top: 7px;
  ${({ theme }) => theme.fonts.captionQuick};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
