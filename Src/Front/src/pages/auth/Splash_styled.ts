import styled from "styled-components/native";

// $top / $bottom: 상태바·제스처 영역 안전 여백
export const SplashWrapper = styled.View<{ $top: number; $bottom: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  padding-bottom: ${({ $bottom }) => $bottom}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export const SplashLogoContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

export const SplashBtnContainer = styled.View`
  padding: 24px 20px;
`;
