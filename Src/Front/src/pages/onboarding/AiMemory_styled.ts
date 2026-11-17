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

export const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`;

export const WrittenBadge = styled.View`
  padding: 2px 8px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.feedbackSuccessBg};
`;

export const WrittenText = styled.Text`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme }) => theme.colors.feedbackSuccessText};
`;

export const Chevron = styled.View`
  transform: rotate(180deg);
`;
