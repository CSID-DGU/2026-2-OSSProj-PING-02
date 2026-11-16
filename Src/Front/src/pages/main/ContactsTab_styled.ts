import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 07 와이어프레임: 양옆 20, 카드 사이 12, 제목 위 약 24
export const { listContent } = StyleSheet.create({
  listContent: {
    gap: 12,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});

export const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

export const Header = styled.View`
  gap: 16px;
  padding-bottom: 4px;
`;

export const Muted = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: center;
`;

export const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

export const Title = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Sub = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textBrand};
`;
