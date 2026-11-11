import { useState } from "react";
import type { TextInputProps } from "react-native";
import styled, { useTheme } from "styled-components/native";

// Figma: Input / Text Field (Empty · Focused · Filled · Error · Disabled)
export interface TextFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  fullWidth?: boolean;
}

const Wrapper = styled.View<{ $fullWidth: boolean }>`
  ${({ $fullWidth }) => $fullWidth && "align-self: stretch;"}
`;

const Label = styled.Text<{ $error: boolean; $disabled: boolean }>`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme, $error, $disabled }) =>
    $disabled
      ? theme.palette.neutral400
      : $error
        ? theme.colors.feedbackDangerText
        : theme.colors.textSecondary};
  margin-bottom: 6px;
`;

const Input = styled.TextInput<{
  $focused: boolean;
  $error: boolean;
  $disabled: boolean;
}>`
  height: 48px;
  padding: 0px 14px;
  border-radius: 10px;
  border-width: 1px;
  border-color: ${({ theme, $focused, $error, $disabled }) =>
    $disabled
      ? theme.colors.borderDefault
      : $error
        ? theme.colors.stateError
        : $focused
          ? theme.colors.stateFocus
          : theme.colors.borderDefault};
  background-color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.backgroundSubtle : theme.colors.surfaceDefault};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.palette.neutral400 : theme.colors.textPrimary};
  ${({ theme }) => theme.fonts.bodyLarge};
`;

const Helper = styled.Text<{ $error: boolean }>`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme, $error }) =>
    $error ? theme.colors.feedbackDangerText : theme.colors.textTertiary};
  margin-top: 6px;
`;

export const TextField = ({
  label,
  helperText,
  errorText,
  fullWidth = true,
  editable = true,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: TextFieldProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const disabled = editable === false; // editable={false}면 비활성 상태
  const hasError = Boolean(errorText) && !disabled;

  return (
    <Wrapper $fullWidth={fullWidth}>
      {label ? (
        <Label $error={hasError} $disabled={disabled}>
          {label}
        </Label>
      ) : null}

      <Input
        {...rest}
        editable={editable}
        $focused={focused}
        $error={hasError}
        $disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={
          disabled ? theme.palette.neutral300 : theme.colors.textTertiary
        }
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />

      {hasError ? (
        <Helper $error>{errorText}</Helper>
      ) : helperText ? (
        <Helper $error={false}>{helperText}</Helper>
      ) : null}
    </Wrapper>
  );
};

export default TextField;