import { Pressable } from "react-native";
import styled, { css } from "styled-components/native";

// Figma: Choice / Signup Gender Option (shape="option", 네모)
//        choice (shape="chip", 알약 모양 - 말투 선택 등)
// 선택됨: 진한 갈색 바탕 + 흰 글씨 / 누르는 중: 연노랑 바탕
// chip은 Figma 03 온보딩 11·02-4 최종 값 (#59): 높이 28 · 바탕 seed100 · 테두리 brown700 · 칩 사이 가로 3 세로 4
//   (누르는 중은 바탕보다 한 단계 진한 seed200)
// pill: Figma 05 연락 Local "Delay Chip" (#77): 높이 34 · 알약 · 흰 바탕 + borderDefault 테두리,
//   선택은 갈색 바탕 + 흰 글자 · 칩 사이 7 (D03 관계 종류, 나중에 답하기·시간 칩)
export type ChoiceShape = "option" | "chip" | "pill";

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

const GROUP_GAP: Record<ChoiceShape, ReturnType<typeof css>> = {
  chip: css`
    column-gap: 3px;
    row-gap: 4px;
  `,
  pill: css`
    gap: 7px;
  `,
  option: css`
    gap: 8px;
  `,
};

const Group = styled.View<{ $shape: ChoiceShape }>`
  flex-direction: row;
  flex-wrap: wrap;
  ${({ $shape }) => GROUP_GAP[$shape]}
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
          min-height: 28px;
          padding: 0px 12px;
          border-radius: 999px;
        `
      : $shape === "pill"
      ? css`
          height: 34px;
          padding: 0px 12px;
          border-radius: 17px;
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
      ? theme.colors.actionPrimaryBg
      : theme.colors.borderDefault;
  }};
  background-color: ${({ theme, $shape, $selected, $pressed, $disabled }) => {
    if ($disabled) return theme.colors.backgroundSubtle;
    if ($selected) return theme.colors.actionPrimaryBg;
    if ($shape === "chip") {
      return $pressed ? theme.palette.seed200 : theme.colors.stateSelectedBg;
    }
    if ($pressed) return theme.colors.stateSelectedBg;
    return theme.colors.surfaceDefault;
  }};
`;

const Label = styled.Text<{
  $shape: ChoiceShape;
  $selected: boolean;
  $disabled: boolean;
}>`
  /* TODO(Figma 스타일 확인): pill 글자는 가장 가까운 labelForm 13/18 */
  ${({ theme, $shape }) =>
    $shape === "chip" ? theme.fonts.captionChip : theme.fonts.labelForm};
  color: ${({ theme, $shape, $selected, $disabled }) => {
    if ($disabled) return theme.palette.neutral400;
    if ($selected) return theme.colors.actionPrimaryText;
    if ($shape === "chip") return theme.colors.textBrand;
    if ($shape === "pill") return theme.colors.textPrimary;
    return theme.colors.textTertiary;
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
    <Group accessibilityRole="radiogroup" $shape={shape}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            // 보이는 크기는 Figma 그대로, 터치 영역만 세로 48dp (chip 28→48, option 40→48)
            // chip은 칩 사이가 좁아(가로 3) 가로로 넓히면 옆 칩과 겹쳐서 세로로만 넓힘
            // pill 34→48 (위아래 7)
            hitSlop={
              shape === "chip"
                ? { top: 10, bottom: 10 }
                : shape === "pill"
                ? { top: 7, bottom: 7 }
                : { top: 4, bottom: 4 }
            }
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
