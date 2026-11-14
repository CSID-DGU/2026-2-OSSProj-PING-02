import styled from "styled-components/native";

// Figma 상단 여백 195px은 상태바 아래 기준이라 안전 여백에 더함
export const AccountStartWrapper = styled.View<{
  $top: number;
  $bottom: number;
}>`
  flex: 1;
  align-items: center;
  gap: 89px;
  padding: ${({ $top }) => $top + 195}px 20px
    ${({ $bottom }) => $bottom + 32}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export const AccountBtnContainer = styled.View`
  width: 100%;
  align-items: center;
  gap: 12px;
`;
