import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 06: 카드 사이 약 12dp
export const Options = styled.View`
  gap: 12px;
`;

// Figma 06: 카드 높이 약 69dp, 체크박스 왼쪽 여백 약 17dp
export const { cardStyle } = StyleSheet.create({
  cardStyle: { paddingVertical: 14, paddingHorizontal: 17 },
});
