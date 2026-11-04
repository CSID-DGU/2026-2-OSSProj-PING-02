import type { ReactNode } from "react";
import type { TouchableOpacityProps } from "react-native";
import styled, { css } from "styled-components/native";
import { fonts } from "../../styles/fonts";

// Figma: Action / Primary and secondary full-width action button, 인증 화면 텍스트 버튼
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
}>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${({ $fullWidth }) => $fullWidth && "align-self: stretch;"}

  /* variant */
  ${({ theme, $variant, disabled }) => {
    if ($variant === "text") {
      return css`
        padding: 6px 8px;
      `;
    }

    return css`
      height: 48px;
      padding: 0px 16px;
      border-radius: 10px;
      background-color: ${disabled
        ? theme.palette.neutral200
        : $variant === "primary"
        ? theme.colors.brandSeed
        : theme.colors.actionSecondaryBg};
    `;
  }}
`;

const Label = styled.Text<{
  $variant: Variant;
  $disabled?: boolean | null;
  $typo?: FontKey;
}>`
  ${({ theme, $variant }) =>
    $variant === "text" ? theme.fonts.captionSmall : theme.fonts.labelButton};
  ${({ $typo }) => $typo && fonts[$typo]};
  text-align: center;
  color: ${({ theme, $variant, $disabled }) => {
    if ($disabled) return theme.palette.neutral400;
    return $variant === "text"
      ? theme.colors.textTertiary
      : theme.colors.textPrimary;
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
  activeOpacity = 0.8,
  ...rest
}: ButtonProps) => {
  return (
    <Base
      {...rest}
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      disabled={disabled}
      $variant={variant}
      $fullWidth={fullWidth}
    >
      {leftIcon}
      {typeof children === "string" ? (
        <Label $variant={variant} $disabled={disabled} $typo={typo}>
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
