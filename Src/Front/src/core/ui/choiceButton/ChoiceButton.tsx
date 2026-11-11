
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import type { PressableProps } from "react-native";
import styled from "styled-components/native";

// Figma: Choice / Signup Gender Option (shape="option", 네모)
//        choice (shape="chip", 알약 모양 - 톤 선택 등)
// 선택됨: 진한 갈색 배경 + 흰 글씨 / 누르는 중: 연노랑 배경

export type ChoiceShape = "option" | "chip";

export interface ChoiceButtonProps
  extends Omit<PressableProps, "children"> {
  selected?: boolean;
  shape?: ChoiceShape;
  children: ReactNode;
}

const Inner = styled.View<{
  $shape: ChoiceShape;
  $selected: boolean;
  $pressed: boolean;
  $disabled: boolean;
}>`
  align-items: center;
  justify-content: center;
  border-width: 1px;

  ${({ $shape }) =>
    $shape === "chip"
      ? "min-height: 32px; padding: 6px 12px; border-radius: 999px;"
      : "min-height: 44px; padding: 0px 16px; border-radius: 10px;"}

  border-color: ${({ theme, $shape, $selected, $disabled }) => {
    if ($disabled) return theme.colors.borderDefault;
    if ($selected) return theme.colors.actionPrimaryBg;
    return $shape === "chip"
      ? theme.colors.brandBrown
      : theme.colors.borderStrong;
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
    $shape === "chip"
      ? theme.fonts.labelCompact
      : theme.fonts.labelForm};

  text-align: center;

  color: ${({ theme, $shape, $selected, $disabled }) => {
    if ($disabled) return theme.palette.neutral400;
    if ($selected) return theme.colors.actionPrimaryText;
    return $shape === "chip"
      ? theme.colors.textBrand
      : theme.colors.textPrimary;
  }};
`;

export const ChoiceButton = ({
  selected = false,
  shape = "option",
  children,
  disabled,
  ...rest
}: ChoiceButtonProps) => {
  const isDisabled = Boolean(disabled);

  return (
    <Pressable
      {...rest}
      hitSlop={shape === "chip" ? 6 : undefined}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{
        selected,
        disabled: isDisabled,
      }}
    >
      {({ pressed }) => (
        <Inner
          $shape={shape}
          $selected={selected}
          $pressed={pressed}
          $disabled={isDisabled}
        >
          {typeof children === "string" ? (
            <Label
              $shape={shape}
              $selected={selected}
              $disabled={isDisabled}
            >
              {children}
            </Label>
          ) : (
            children
          )}
        </Inner>
      )}
    </Pressable>
  );
};

export default ChoiceButton;
