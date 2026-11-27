import styled from "styled-components/native";

// Figma 07·08: 연락처 책 66×82dp 자리. 그림(100dp)은 위아래 투명 여백이 있어 자리 밖으로 겹쳐 그림
export const Book = styled.View`
  height: 82px;
  justify-content: center;
  overflow: visible;
`;

// 거절·오류 안내 상자는 화면 양옆 30dp (본문 여백 20 + 10)
export const Boxes = styled.View`
  padding: 0px 10px;
`;
