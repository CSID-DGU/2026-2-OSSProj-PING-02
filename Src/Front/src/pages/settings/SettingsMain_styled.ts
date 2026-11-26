import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// 08 설정 H01: 흰 배경, 앱바 아래 좌우 16(카드 폭 328), 덩어리 사이 12, 아래 24
// 구분선은 덩어리 위에 붙임 (시안: 구분선도 같은 12 간격 안에 있음)
export const Screen = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export const Block = styled.View`
  gap: 12px;
`;

export const { content } = StyleSheet.create({
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
});
