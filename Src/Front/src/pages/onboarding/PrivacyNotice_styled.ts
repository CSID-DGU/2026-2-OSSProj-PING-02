import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 03: 항목 3개를 가운데 정렬, 항목 사이 약 36dp
export const Points = styled.View`
  gap: 36px;
`;

// 제목이 한 단어만 줄바꿈되지 않도록 본문 폭을 그대로 다 씀
export const Point = styled.View`
  align-self: stretch;
  align-items: center;
  gap: 4px;
`;

// Figma: 브라운(#4D3932 = text/brand)
export const PointTitle = styled.Text`
  align-self: stretch;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textBrand};
  text-align: center;
`;

export const PointDescription = styled.Text`
  align-self: stretch;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

// 아이콘이 위로 오면서 제목과의 간격
export const { iconStyle } = StyleSheet.create({
  iconStyle: { marginBottom: 8 },
});
