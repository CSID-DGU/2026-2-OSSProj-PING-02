import { StyleSheet } from "react-native";
import styled from "styled-components/native";
import { colors, palette } from "@core";

// Figma 10: 카드 사이 약 15dp
export const Cards = styled.View`
  gap: 15px;
`;

// Card 기본 배경만 바꿈 (테두리·여백은 Card 그대로)
export const { brownCard, neutralCard } = StyleSheet.create({
  brownCard: { backgroundColor: colors.surfaceBrown },
  neutralCard: { backgroundColor: palette.neutral100 },
});
