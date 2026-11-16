import styled from "styled-components/native";

// Figma 11: 카드 사이 약 15dp
export const Cards = styled.View`
  gap: 15px;
`;

export const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

export const Texts = styled.View`
  flex: 1;
`;

export const Chevron = styled.View`
  transform: rotate(180deg);
`;
