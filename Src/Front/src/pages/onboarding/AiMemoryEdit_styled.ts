import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 시안이 없어 11과 같은 제목 위치(위쪽 여백)를 따름
export const Top = styled.View`
  padding-top: 32px;
`;

// 공통 Input은 한 줄(52px) 높이라 여러 줄 입력에 맞게 높이·위 여백만 덮어씀
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

// 예시 칩 줄바꿈 배치 (ChoiceGroup 내부 Group과 같은 row·wrap·gap 8)
export const ExampleList = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;
