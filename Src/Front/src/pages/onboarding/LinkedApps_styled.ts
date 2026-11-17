import { StyleSheet } from "react-native";
import styled from "styled-components/native";

// Figma 05: 아이콘 52dp, 칸 중심 사이 약 101dp, 체크 줄 아래 약 4dp
// (원본 아이콘이 60px 한 장뿐이라 고해상도 기기에서는 흐릴 수 있음)
const ICON_SIZE = 52;

export const AppRow = styled.View`
  flex-direction: row;
  justify-content: center;
`;

export const { cellStyle } = StyleSheet.create({
  cellStyle: { flex: 1 },
});

export const IconWrap = styled.View`
  align-items: center;
  margin-top: 4px;
`;

// 아이콘 터치 영역 (52 + 위아래 여백으로 48dp 이상)
export const IconPress = styled.Pressable`
  padding: 2px;
`;

export const AppIcon = styled.Image`
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
  border-radius: 12px;
`;

export const Caption = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
