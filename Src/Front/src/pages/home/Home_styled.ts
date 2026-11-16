import styled from "styled-components/native";

export const Wrapper = styled.View<{ $top: number; $bottom: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  padding-bottom: ${({ $bottom }) => $bottom}px;
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

export const Body = styled.View`
  flex: 1;
  gap: 8px;
  padding: 24px 20px;
`;

export const Title = styled.Text`
  ${({ theme }) => theme.fonts.headingOnboarding};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const ModelBox = styled.View`
  gap: 8px;
  margin-top: 16px;
`;

export const Footer = styled.View`
  align-items: center;
  padding: 16px 20px;
`;
