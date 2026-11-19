import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// 홈은 시안이 없어 연락 와이어프레임(07)의 여백을 따름: 양옆 20, 카드 사이 12
export const { listContent, noTop } = StyleSheet.create({
  listContent: {
    gap: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  noTop: { marginTop: 0 },
});

export const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

export const Section = styled.View`
  gap: 12px;
`;

export const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const SectionNote = styled.Text`
  margin-top: -6px;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Muted = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export const FoldPress = styled.Pressable``;

export const FoldRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

export const FoldTexts = styled.View`
  flex: 1;
`;

export const FoldLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textBrand};
`;

export const ActionRow = styled.View`
  align-items: flex-end;
  margin-top: 4px;
`;
