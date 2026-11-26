import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 03: 항목 3개를 가운데 정렬, 아이콘 아래 → 다음 항목 제목까지 약 44dp
export const Points = styled.View`
  gap: 44px;
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

// Figma 03: 설명 아래 아이콘까지 약 14dp (Point의 gap 4에 더함)
export const { iconStyle } = StyleSheet.create({
  iconStyle: { marginTop: 10 },
});
