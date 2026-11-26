import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  Pressable,
  TextInput,
  type NativeSyntheticEvent,
  type TargetedEvent,
  type TextInputProps,
} from "react-native";
import styled, { css, useTheme } from "styled-components/native";
import type { FieldState } from "./Field";

// 라벨·여러 줄 입력·글자 수가 한 상자 안에 있는 입력 (Figma 03 온보딩 11 "AI 답장 맞춤 설정",
// 05 연락 "선택한 답장 수정", 관계 설명에서 같은 모양)
// - 테두리 border/strong 1px · 모서리 16 · 안쪽 여백 위아래 16 좌우 19
// - 포커스·오류는 Input처럼 2px 테두리 (안쪽 여백을 1 줄여 크기가 흔들리지 않게)
// - children: 라벨과 입력 사이 내용 (예: 칩). showInput=false면 입력칸 없이 children만
// - 상자 아무 곳이나 누르면 입력칸으로 포커스
export interface TextAreaProps
  extends Omit<TextInputProps, "style" | "maxLength" | "multiline"> {
  label?: string;
  maxLength: number;
  minHeight?: number;
  state?: FieldState;
  showInput?: boolean;
  children?: ReactNode;
}

export const TextArea = ({
  label,
  maxLength,
  minHeight = 120,
  state = "default",
  showInput = true,
  children,
  value = "",
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: TextAreaProps) => {
  const theme = useTheme();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
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
      $state={current}
      $minHeight={minHeight}
      // 상자 빈 곳을 눌러도 입력칸으로 (스크린리더는 입력칸을 따로 읽음)
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      disabled={!showInput || current === "disabled"}
    >
      {label && <Label>{label}</Label>}
      {children}
      {showInput ? (
        <Text
          ref={inputRef}
          multiline
          textAlignVertical="top"
          placeholderTextColor={theme.colors.textTertiary}
          editable={current !== "disabled"}
          maxLength={maxLength}
          value={value}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={`${maxLength}자까지 쓸 수 있어요`}
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <Spacer />
      )}
      <Counter
        accessibilityLabel={`${value.length}자 입력, 최대 ${maxLength}자`}
      >{`${value.length}/${maxLength}`}</Counter>
    </Box>
  );
};

const Box = styled(Pressable)<{ $state: FieldState; $minHeight: number }>`
  gap: 6px;
  min-height: ${({ $minHeight }) => $minHeight}px;
  border-radius: 16px;
  background-color: ${({ theme, $state }) =>
    $state === "disabled"
      ? theme.colors.backgroundSubtle
      : theme.colors.surfaceDefault};
  ${({ theme, $state }) => {
    if ($state === "focused" || $state === "error") {
      return css`
        padding: 15px 18px;
        border: 2px solid
          ${$state === "focused" ? theme.palette.seed500 : theme.colors.stateError};
      `;
    }
    return css`
      padding: 16px 19px;
      border: 1px solid ${theme.colors.borderStrong};
    `;
  }}
`;

// TODO(Figma 스타일 확인): 라벨·입력·글자 수 스타일 이름을 받으면 맞춤 (지금은 가까운 토큰)
const Label = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Text = styled(TextInput)`
  flex: 1;
  padding: 0px;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Spacer = styled.View`
  flex: 1;
`;

const Counter = styled.Text`
  align-self: flex-end;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export default TextArea;
