import styled from "styled-components/native";

// TODO(Figma): 05 / 연동 앱 선택 수치 받으면 칸 여백·아이콘 크기 맞추기
const ICON_SIZE = 48;

export const AppRow = styled.View`
  flex-direction: row;
  gap: 8px;
`;

// 선택 상태: 배경 + 테두리 + 체크 표시를 함께 바꿈 (색만으로 구분하지 않음)
export const AppCell = styled.View<{ $checked: boolean }>`
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 16px 8px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme, $checked }) =>
    $checked ? theme.colors.stateSelectedContent : theme.colors.borderDefault};
  background-color: ${({ theme, $checked }) =>
    $checked ? theme.colors.stateSelectedBg : theme.colors.surfaceDefault};
`;

export const IconButton = styled.Pressable`
  width: 48px;
  height: 48px;
  justify-content: center;
  align-items: center;
`;

export const AppIcon = styled.Image`
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
  border-radius: 12px;
`;
