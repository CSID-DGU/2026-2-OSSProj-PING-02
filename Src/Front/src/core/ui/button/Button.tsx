import { useState, type ReactNode } from "react";
import type { GestureResponderEvent, TouchableOpacityProps } from "react-native";
import styled, { css } from "styled-components/native";
import { fonts } from "../../styles/fonts";

// Figma: Action / splash.next (Default·Pressed·Secondary), 인증 화면 텍스트 버튼
export type Variant = "primary" | "secondary" | "text";
type FontKey = keyof typeof fonts;

export interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  typo?: FontKey;
  children?: ReactNode;
}

// 버튼 스타일
const Base = styled.TouchableOpacity<{
  $variant: Variant;
  $fullWidth: boolean;
  $pressed: boolean;
}>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${({ $fullWidth }) => $fullWidth && "align-self: stretch;"}

  /* variant */
  ${({ theme, $variant, $pressed, disabled }) => {
    if ($variant === "text") {
      return css`
        padding: 6px 8px;
      `;
    }

    const background = () => {
      if (disabled) return theme.palette.neutral200;
      if ($variant === "secondary") return theme.colors.actionSecondaryBg;
      return $pressed ? theme.colors.actionPrimaryBg : theme.colors.brandSeed;
    };

    return css`
      height: 48px;
      padding: 0px 16px;
      border-radius: 10px;
      background-color: ${background()};
    `;
  }}
`;

const Label = styled.Text<{
  $variant: Variant;
  $disabled?: boolean | null;
  $pressed: boolean;
  $typo?: FontKey;
}>`
  ${({ theme, $variant }) =>
    $variant === "text" ? theme.fonts.captionSmall : theme.fonts.labelButton};
  ${({ $typo }) => $typo && fonts[$typo]};
  text-align: center;
  color: ${({ theme, $variant, $disabled, $pressed }) => {
    if ($disabled) return theme.palette.neutral400;
    if ($variant === "text") return theme.colors.textTertiary;
    if ($variant === "primary" && $pressed)
      return theme.colors.actionPrimaryText;
    return theme.colors.textPrimary;
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
  activeOpacity,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) => {
  const [pressed, setPressed] = useState(false);

  const handlePressIn = (e: GestureResponderEvent) => {
    setPressed(true);
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    setPressed(false);
    onPressOut?.(e);
  };

  return (
    <Base
      {...rest}
      accessibilityRole="button"
      // primary는 눌림을 배경색(브라운)으로 보여 주므로 투명도 변화 없음
      activeOpacity={activeOpacity ?? (variant === "primary" ? 1 : 0.7)}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      $variant={variant}
      $fullWidth={fullWidth}
      $pressed={pressed}
    >
      {leftIcon}
      {typeof children === "string" ? (
        <Label
          $variant={variant}
          $disabled={disabled}
          $pressed={pressed}
          $typo={typo}
        >
          {children}
        </Label>
      ) : (
        children
      )}
      {rightIcon}
    </Base>
  );
};

export default Button;
