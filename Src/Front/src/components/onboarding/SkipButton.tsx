import styled from "styled-components/native";
import { Button, type ButtonProps } from "@core/ui/button";

// 온보딩 하단 "건너뛰기"·"나중에 할게요" (Figma 07·11 최종: 주 버튼 아래, 브라운 글자)
// 공통 Button(text)에 글자색·크기만 Figma에 맞춘 라벨을 넣어 씀
interface SkipButtonProps extends Omit<ButtonProps, "variant" | "children"> {
  children: string;
}

const SkipButton = ({ children, ...rest }: SkipButtonProps) => (
  <Button variant="text" accessibilityLabel={children} {...rest}>
    <Label>{children}</Label>
  </Button>
);

// Figma 색 #5D4627은 토큰에 없어 가장 가까운 시맨틱 토큰 text/brand 사용
const Label = styled.Text`
  ${({ theme }) => theme.fonts.labelButton};
  color: ${({ theme }) => theme.colors.textBrand};
  text-align: center;
`;

export default SkipButton;
