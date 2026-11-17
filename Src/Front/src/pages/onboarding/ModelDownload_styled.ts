import styled from "styled-components/native";

// Figma에 없는 화면이라 07·08 안내 상자 배치(양옆 30dp)를 따름
export const Boxes = styled.View`
  gap: 15px;
  padding: 0px 10px;
`;

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
  text-align: center;
`;
