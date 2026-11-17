import styled from "styled-components/native";

// Figma 07: 상자는 화면 양옆 30dp (본문 여백 20 + 10), 상자 사이 약 15dp
export const BoxPress = styled.Pressable``;

// 누르는 동안 살짝 흐리게 (눌린 느낌)
export const Pressed = styled.View<{ $pressed: boolean }>`
  opacity: ${({ $pressed }) => ($pressed ? 0.7 : 1)};
`;

export const Boxes = styled.View`
  gap: 15px;
  padding: 0px 10px;
`;
