import { useState } from "react";
import type { NativeSyntheticEvent, TargetedEvent } from "react-native";
import { Field, type FieldState } from "./Field";
import { Input, type InputProps } from "./Input";

// 라벨 + 입력창 + 도움말. error에 문구를 넣으면 오류 상태로 바뀜
export interface TextFieldProps extends Omit<InputProps, "state"> {
  label?: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
}

export const TextField = ({
  label,
  helper,
  error,
  disabled = false,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) => {
  const [focused, setFocused] = useState(false);

  const state: FieldState = disabled
    ? "disabled"
    : error
    ? "error"
    : focused
    ? "focused"
    : "default";

  const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <Field label={label} helper={error ?? helper} state={state}>
      <Input
        {...rest}
        state={state}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Field>
  );
};

export default TextField;
