import { Pressable } from "react-native";
import styled, { css } from "styled-components/native";

// Figma: Choice / Signup Gender Option (shape="option", 네모)
//        choice (shape="chip", 알약 모양 - 말투 선택 등)
// 선택됨: 진한 갈색 바탕 + 흰 글씨 / 누르는 중: 연노랑 바탕
export type ChoiceShape = "option" | "chip";

export interface ChoiceOption<T extends string> {
  label: string;
  value: T;
}

export interface ChoiceGroupProps<T extends string> {
  options: ChoiceOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  shape?: ChoiceShape;
  error?: boolean;
  disabled?: boolean;
}

const Group = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const Inner = styled.View<{
  $shape: ChoiceShape;
  $selected: boolean;
  $pressed: boolean;
  $error: boolean;
  $disabled: boolean;
}>`
  justify-content: center;
  align-items: center;
  border-width: 1px;
  ${({ $shape }) =>
    $shape === "chip"
      ? css`
          min-height: 32px;
          padding: 6px 12px;
          border-radius: 999px;
        `
      : css`
          min-width: 60px;
          height: 40px;
          padding: 0px 16px;
          border-radius: 10px;
        `}

  border-color: ${({ theme, $shape, $selected, $error, $disabled }) => {
    if ($disabled) return theme.colors.borderDefault;
    if ($selected) return theme.colors.actionPrimaryBg;
    if ($error) return theme.colors.stateError;
    return $shape === "chip"
      ? theme.colors.brandBrown
      : theme.colors.borderDefault;
  }};
  background-color: ${({ theme, $shape, $selected, $pressed, $disabled }) => {
    if ($disabled) return theme.colors.backgroundSubtle;
    if ($selected) return theme.colors.actionPrimaryBg;
    if ($pressed) return theme.colors.stateSelectedBg;
    return $shape === "chip"
      ? theme.colors.surfaceSeed
      : theme.colors.surfaceDefault;
  }};
`;

const Label = styled.Text<{
  $shape: ChoiceShape;
  $selected: boolean;
  $disabled: boolean;
}>`
  ${({ theme, $shape }) =>
    $shape === "chip" ? theme.fonts.labelCompact : theme.fonts.labelForm};
  color: ${({ theme, $shape, $selected, $disabled }) => {
    if ($disabled) return theme.palette.neutral400;
    if ($selected) return theme.colors.actionPrimaryText;
    return $shape === "chip"
      ? theme.colors.textBrand
      : theme.colors.textTertiary;
  }};
`;

export const ChoiceGroup = <T extends string>({
  options,
  value,
  onChange,
  shape = "option",
  error = false,
  disabled = false,
}: ChoiceGroupProps<T>) => {
  return (
    <Group accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            hitSlop={shape === "chip" ? 6 : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
          >
            {({ pressed }) => (
              <Inner
                $shape={shape}
                $selected={selected}
                $pressed={pressed}
                $error={error}
                $disabled={disabled}
              >
                <Label
                  $shape={shape}
                  $selected={selected}
                  $disabled={disabled}
                >
                  {option.label}
                </Label>
              </Inner>
            )}
          </Pressable>
        );
      })}
    </Group>
  );
};

export default ChoiceGroup;
