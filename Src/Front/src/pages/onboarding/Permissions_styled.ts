import styled from "styled-components/native";

export const Center = styled.View`
  min-height: 120px;
  justify-content: center;
  align-items: center;
`;

export const ItemHeader = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

export const ItemTitle = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// 켜짐/꺼짐: 색만으로 구분하지 않도록 글자(+체크 아이콘)로 표시
export const Status = styled.View<{ $granted: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: ${({ theme, $granted }) =>
    $granted ? theme.colors.feedbackSuccessBg : theme.colors.backgroundSubtle};
`;

export const StatusText = styled.Text<{ $granted: boolean }>`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme, $granted }) =>
    $granted ? theme.colors.feedbackSuccessText : theme.colors.textSecondary};
`;

export const ItemGuide = styled.View`
  gap: 10px;
  margin-top: 12px;
`;
