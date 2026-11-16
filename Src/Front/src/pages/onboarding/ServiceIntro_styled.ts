import styled from "styled-components/native";

// Figma 02: 점 지름 6dp, 간격 10dp(중심 사이 16dp), 화면 위에서 약 76dp(상태 표시줄 포함)
export const Dots = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding-top: 44px;
  padding-bottom: 8px;
`;

export const Dot = styled.View<{ $active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ theme, $active }) =>
    $active ? theme.palette.seed300 : theme.palette.seed100};
`;

// 한 쪽: 내용이 길거나 글자를 키우면 세로로 스크롤
export const Page = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 36,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  showsVerticalScrollIndicator: false,
})``;
