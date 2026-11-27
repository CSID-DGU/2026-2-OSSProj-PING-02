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

export const LongNotice = styled.Pressable`
  margin: 15px 16px 2px;
  padding: 12px 15px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

export const LongNoticeTitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 9px;
`;

export const LongNoticeMark = styled.View`
  width: 17px;
  height: 17px;
  border-radius: 4px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

export const LongNoticeMarkText = styled.Text`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme }) => theme.colors.textOnDark};
`;

export const LongNoticeTitle = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.labelNotice};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const LongNoticeBody = styled.Text`
  ${({ theme }) => theme.fonts.captionQuick};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
