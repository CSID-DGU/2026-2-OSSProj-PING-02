import { useState } from "react";
import type {
  NativeSyntheticEvent,
  TargetedEvent,
  TextInputProps,
} from "react-native";
import styled, { css, useTheme } from "styled-components/native";
import type { FieldState } from "./Field";

// Figma: Input / Text Field(large, 52px) · Input / Email Address(small, 44px)
export type InputSize = "large" | "small";

export interface InputProps extends TextInputProps {
  size?: InputSize;
  state?: FieldState;
}

const Box = styled.TextInput<{ $size: InputSize; $state: FieldState }>`
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
  ${({ $size }) =>
    $size === "large"
      ? css`
          height: 52px;
          padding: 0px 16px;
          border-radius: 10px;
        `
      : css`
          height: 44px;
          padding: 0px 12px;
          border-radius: 8px;
        `}

  /* state: 포커스·오류는 2px 테두리 */
  ${({ theme, $state }) => {
    if ($state === "focused") {
      // Figma 컴포넌트 값(seed/500). 문서의 state/focus(seed/400)와 달라 시안을 따름
      return css`
        border: 2px solid ${theme.palette.seed500};
      `;
    }
    if ($state === "error") {
      return css`
        border: 2px solid ${theme.colors.stateError};
      `;
    }
    return css`
      border: 1px solid ${theme.colors.borderDefault};
    `;
  }}
  background-color: ${({ theme, $state }) =>
    $state === "disabled"
      ? theme.colors.backgroundSubtle
      : theme.colors.surfaceDefault};
`;

export const Input = ({
  size = "large",
  state = "default",
  onFocus,
  onBlur,
  ...rest
}: InputProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  // 단독으로 쓸 때도 포커스 테두리가 보이도록 직접 추적
  const current: FieldState = state === "default" && focused ? "focused" : state;

  const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <Box
      placeholderTextColor={theme.colors.textTertiary}
      editable={state !== "disabled"}
      {...rest}
      onFocus={handleFocus}
      onBlur={handleBlur}
      $size={size}
      $state={current}
    />
  );
};

export default Input;
