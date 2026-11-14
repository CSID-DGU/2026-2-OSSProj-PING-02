import styled from "styled-components/native";

export const Fields = styled.View`
  gap: 10px;
`;

export const Actions = styled.View`
  align-items: center;
  gap: 10px;
`;

export const Hint = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: center;
`;

// 다이얼로그 안 가려진 아이디 박스 (Figma: Result / Masked ID)
export const ResultBox = styled.View`
  align-self: stretch;
  justify-content: center;
  align-items: center;
  height: 52px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

export const ResultId = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;
