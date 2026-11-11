import type { ReactNode } from "react";
import { Pressable } from "react-native";
import type { PressableProps } from "react-native";
import styled, { css } from "styled-components/native";
import { fonts } from "../../styles/fonts";

// Figma: Action / splash.next (default · pressed · disabled)
// 기준: design-system.md - 노랑 위에는 진한 브라운 텍스트, 누르면 갈색 배경 + 흰 텍스트
export type Variant = "primary" | "secondary" | "text";
type FontKey = keyof typeof fonts;

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: Variant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  typo?: FontKey;
  children?: ReactNode;
}

// 바깥: 눌림 감지 + 가로 꽉 채우기만 담당
const Touch = styled(Pressable)<{ $fullWidth: boolean }>`
  ${({ $fullWidth }) => $fullWidth && "align-self: stretch;"}
`;

// 안쪽: 실제 버튼 모양 (눌림 상태에 따라 색이 바뀜)
const Inner = styled.View<{
  $variant: Variant;
  $pressed: boolean;
  $disabled: boolean;
}>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;

  ${({ theme, $variant, $pressed, $disabled }) => {
    if ($variant === "text") {
      return css`
        padding: 6px 8px;
        opacity: ${$pressed ? 0.6 : 1};
      `;
    }

    let bg: string;
    if ($disabled) {
      bg = theme.palette.neutral200;
    } else if ($variant === "primary") {
      bg = $pressed ? theme.colors.actionPrimaryBg : theme.colors.brandSeed;
    } else {
      bg = $pressed ? theme.palette.seed200 : theme.colors.actionSecondaryBg;
    }

    return css`
      height: 48px;
      padding: 0px 16px;
      border-radius: 10px;
      background-color: ${bg};
    `;
  }}
`;

const Label = styled.Text<{
  $variant: Variant;
  $pressed: boolean;
  $disabled: boolean;
  $typo?: FontKey;
}>`
  ${({ theme, $variant }) =>
    $variant === "text" ? theme.fonts.captionSmall : theme.fonts.labelButton};
  ${({ $typo }) => $typo && fonts[$typo]};
  text-align: center;
  color: ${({ theme, $variant, $pressed, $disabled }) => {
    if ($disabled) return theme.palette.neutral400;
    if ($variant === "text") return theme.colors.textTertiary;
    if ($variant === "primary" && $pressed) return theme.colors.actionPrimaryText; // 갈색 위 흰 글씨
    return theme.colors.actionSecondaryText; // 노랑 위 진한 브라운 글씨
  }};
`;

export const Button = ({
  variant = "primary",
  fullWidth = false,
  leftIcon,
  rightIcon,
  typo,
  children,
  disabled,
  ...rest
}: ButtonProps) => {
  const isDisabled = Boolean(disabled);

  return (
    <Touch
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      $fullWidth={fullWidth}
    >
      {({ pressed }) => (
        <Inner $variant={variant} $pressed={pressed} $disabled={isDisabled}>
          {leftIcon}
          {typeof children === "string" ? (
            <Label
              $variant={variant}
              $pressed={pressed}
              $disabled={isDisabled}
              $typo={typo}
            >
              {children}
            </Label>
          ) : (
            children
          )}
          {rightIcon}
        </Inner>
      )}
    </Touch>
  );
};

export default Button;