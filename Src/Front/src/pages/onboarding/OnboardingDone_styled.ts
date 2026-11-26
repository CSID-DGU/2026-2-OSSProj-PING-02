import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 12: 약속 상자는 화면 양옆 30dp (본문 여백 20 + 10), 높이 약 71dp
// = 위아래 12 + 제목 20 + 간격 8 + 설명 19 (Card 기본 여백 16에서 위아래만 줄임)
export const PromiseBox = styled.View`
  padding: 0px 10px;
`;

export const { promiseCardStyle } = StyleSheet.create({
  promiseCardStyle: { paddingVertical: 12 },
});

export const PromiseTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

export const PromiseText = styled.Text`
  margin-top: 8px;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
