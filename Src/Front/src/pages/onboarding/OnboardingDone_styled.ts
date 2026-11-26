import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 12: 약속 상자는 화면 양옆 30dp (본문 여백 20 + 10), 높이 약 71dp
// = 위 12 + 제목 20(Title/Section) + 간격 9 + 설명 16(Caption/Small) + 아래 14 (Card 기본 여백 16에서 위아래만 바꿈)
export const PromiseBox = styled.View`
  padding: 0px 10px;
`;

export const { promiseCardStyle } = StyleSheet.create({
  promiseCardStyle: { paddingTop: 12, paddingBottom: 14 },
});

export const PromiseTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

// Figma 12: Caption/Small 11/16
export const PromiseText = styled.Text`
  margin-top: 9px;
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
