import styled from "styled-components/native";

// Figma 11 (2x PNG ÷ 2)
// - "AI 답장 맞춤 설정"은 왼쪽 정렬, 화면 왼쪽 26dp (본문 여백 20 + 6)
// - 상자는 본문 여백보다 양옆 4dp 넓게 (화면 16 ~ 344), 상자 사이 12
// - 칩은 가로 2.5 · 세로 4 간격
// - 제목은 06보다 약 18dp 아래에서 시작 (에뮬레이터 비교)
export const Top = styled.View`
  padding-top: 24px;
`;

export const Section = styled.View`
  gap: 6px;
  padding: 0px 6px;
`;

// TODO(Figma 스타일 확인): 소제목·설명 스타일 이름을 받으면 맞춤 (지금은 가까운 토큰)
export const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const SectionDescription = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Boxes = styled.View`
  gap: 12px;
  margin: 0px -4px;
`;

export const Chips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: 2.5px;
  row-gap: 4px;
`;
