import styled from "styled-components/native";

export const Hero = styled.View`
  align-items: flex-start;
`;

export const Center = styled.View`
  min-height: 80px;
  justify-content: center;
  align-items: center;
`;

export const ModelProgress = styled.View`
  margin-top: 10px;
`;

export const Pending = styled.View`
  gap: 10px;
`;

export const PendingTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const PendingNote = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const PendingAction = styled.View`
  align-items: flex-end;
  margin-top: 4px;
`;
