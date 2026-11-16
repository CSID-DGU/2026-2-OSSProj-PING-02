import styled from "styled-components/native";

// Figma 06: 카드 사이 약 12dp
export const Options = styled.View`
  gap: 12px;
`;

// 체크박스(20) + 간격(10) 만큼 들여서 제목 아래에 맞춤
export const DescriptionPress = styled.Pressable`
  padding-left: 30px;
  padding-top: 4px;
`;

export const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
