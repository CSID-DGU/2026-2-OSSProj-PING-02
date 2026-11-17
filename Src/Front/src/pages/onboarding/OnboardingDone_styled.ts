import styled from "styled-components/native";

// Figma 12: 상자는 화면 양옆 30dp (본문 여백 20 + 10)
export const Boxes = styled.View`
  gap: 15px;
  padding: 0px 10px;
`;

export const Progress = styled.View`
  align-self: stretch;
`;

export const PendingNote = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

export const PendingRow = styled.View`
  align-self: stretch;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderDefault};
`;

export const PendingTexts = styled.View`
  flex: 1;
  gap: 2px;
`;

export const PendingLabel = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const PendingDescription = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const ModelText = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
