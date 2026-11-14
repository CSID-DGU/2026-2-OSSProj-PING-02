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
