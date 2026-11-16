import styled from "styled-components/native";

export const Center = styled.View`
  min-height: 120px;
  justify-content: center;
  align-items: center;
`;

export const ProgressBox = styled.View`
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export const ProgressText = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Done = styled.View`
  align-items: center;
  gap: 12px;
  padding: 24px 0px;
`;

export const DoneText = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.feedbackSuccessText};
`;
