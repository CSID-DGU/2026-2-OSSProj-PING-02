import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// 05 친구 13 목록 (#77 전에는 ContactsTab_styled를 같이 썼음, 값은 그대로)
// Figma 07 와이어프레임: 양옆 20, 카드 사이 12, 제목 위 약 24
export const { listContent } = StyleSheet.create({
  listContent: {
    gap: 12,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});

export const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

export const Header = styled.View`
  gap: 16px;
  padding-bottom: 4px;
`;

export const Title = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;
