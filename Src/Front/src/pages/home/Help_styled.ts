import styled from "styled-components/native";

// 04 홈 C02~C05 (오늘의 도움 수준) 공통, 2x PNG ÷ 2 로 잰 값

export const Screen = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export const content = { paddingHorizontal: 16, paddingBottom: 24 };

export const Title = styled.Text`
  margin-top: 1px;
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Description = styled.Text<{ $top: number }>`
  margin-top: ${({ $top }) => $top}px;
  ${({ theme }) => theme.fonts.bodyCompact};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const List = styled.View<{ $top: number }>`
  margin-top: ${({ $top }) => $top}px;
`;

// 버튼 2개: 화면 양옆 20 (본문 16 + 4), 높이 48
export const Actions = styled.View<{ $gap: number }>`
  gap: ${({ $gap }) => $gap}px;
  margin-top: 12px;
  padding: 0px 4px;
`;

export const Center = styled.View`
  padding: 32px 0px;
  align-items: center;
`;
