import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 06 (2x PNG ÷ 2)
// - 전체 알림 상자: 화면 양옆 30dp(본문 여백 20 + 10), 높이 48
// - 항목: 글자는 본문 여백에서 13dp 안쪽, 스위치 오른쪽 끝은 5dp 안쪽
// - 항목 사이(위 → 위) 72dp = 제목 20 + 3 + 설명 12 + 위아래 18.5
export const Options = styled.View``;

// 상자 아래 → 첫 항목 제목까지 약 17 (항목 위 여백 18.5가 맡음)
export const AllBox = styled.View`
  padding: 0px 10px;
`;

export const { lineStyle } = StyleSheet.create({
  lineStyle: {
    paddingLeft: 13,
    paddingRight: 5,
    paddingVertical: 18.5,
  },
});
