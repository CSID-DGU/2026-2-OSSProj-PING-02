import styled, { css } from "styled-components/native";

// Figma 10 (2x PNG ÷ 2)
// - 구분선(border/default)은 본문 여백보다 양옆 4dp 넓게 (화면 16 ~ 344)
// - 글자는 화면 왼쪽 32.5dp = 구분선 시작 16 + 16.5
// - 구분선 위 약 25 · 아래 약 26.5, 제목 → 설명 약 3
export const Rows = styled.View`
  margin: 0px -4px;
`;

export const Row = styled.View<{ $first: boolean; $last: boolean }>`
  gap: 3px;
  padding: ${({ $first }) => ($first ? 0 : 26.5)}px 16.5px
    ${({ $last }) => ($last ? 0 : 25)}px;
  ${({ theme, $first }) =>
    !$first &&
    css`
      border-top-width: 1px;
      border-top-color: ${theme.colors.borderDefault};
    `}
`;

// TODO(Figma 스타일 확인): 줄 제목·설명 스타일 이름을 받으면 맞춤 (지금은 예전 카드와 같은 토큰)
export const RowTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const RowDescription = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
