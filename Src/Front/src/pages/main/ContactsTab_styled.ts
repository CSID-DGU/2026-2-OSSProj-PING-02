import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// 05 연락 D01 (720px 시안 ÷2)
// 도움 수준 카드: 앱바 아래 2 · 좌우 16 / 장문 안내: 필터 줄 아래 15 · 좌우 16 · 높이 약 58
export const { listContent } = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
});

export const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

export const Empty = styled.View`
  padding: 24px 20px;
`;

export const HeroSlot = styled.View`
  padding: 2px 16px 0px;
`;

export const NoticeSlot = styled.View`
  margin: 15px 0px 2px;
`;
