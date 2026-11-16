import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// 공통 Input은 한 줄(52px) 높이라 여러 줄 입력에 맞게 높이·위 여백만 덮어씀
// TODO(Figma): 07 / AI 메모리 수치 받으면 높이 맞추기
export const { memoryInputStyle } = StyleSheet.create({
  memoryInputStyle: {
    height: 140,
    paddingTop: 14,
    paddingBottom: 14,
  },
});

export const Examples = styled.View`
  gap: 10px;
`;

export const ExamplesTitle = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
