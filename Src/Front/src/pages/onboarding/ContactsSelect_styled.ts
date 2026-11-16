import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 09: 제목은 위쪽 정렬, 행 높이 약 58dp(위아래 여백 10), 행 사이 8dp
export const { rowStyle, listContent } = StyleSheet.create({
  rowStyle: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  listContent: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});

export const Header = styled.View`
  gap: 24px;
  padding-top: 56px;
  padding-bottom: 4px;
`;

export const Center = styled.View`
  min-height: 120px;
  justify-content: center;
  align-items: center;
`;
