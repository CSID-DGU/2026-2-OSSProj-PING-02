import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 03: 항목 3개를 가운데 정렬, 항목 사이 약 36dp
export const Points = styled.View`
  gap: 36px;
`;

export const Point = styled.View`
  align-items: center;
  gap: 4px;
`;

// Figma: 브라운(#4D3932 = text/brand)
export const PointTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textBrand};
  text-align: center;
`;

export const PointDescription = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

export const { iconStyle } = StyleSheet.create({
  iconStyle: { marginTop: 16 },
});
