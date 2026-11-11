
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import type {
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import styled from "styled-components/native";

// Figma: 00 Design System / Seed Yellow Usage
// default   : 흰 배경 + 연한 테두리
// highlight : 아주 연한 노랑 배경
// selected  : 연노랑 배경 + 갈색 테두리

export type CardVariant = "default" | "highlight" | "selected";

export interface CardProps
  extends Omit<PressableProps, "children" | "style"> {
  variant?: CardVariant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Surface = styled.View<{
  $variant: CardVariant;
  $pressed: boolean;
}>`
  padding: 16px;
  border-radius: 12px;

  border-width: ${({ $variant }) =>
    $variant === "selected" ? "1.5px" : "1px"};

  border-color: ${({ theme, $variant }) => {
    if ($variant === "selected")
      return theme.colors.stateSelectedContent;

    if ($variant === "highlight")
      return theme.palette.seed200;

    return theme.colors.borderDefault;
  }};

  background-color: ${({ theme, $variant, $pressed }) => {
    if ($variant === "selected")
      return $pressed
        ? theme.palette.seed200
        : theme.colors.stateSelectedBg;

    if ($variant === "highlight")
      return $pressed
        ? theme.colors.stateSelectedBg
        : theme.colors.surfaceSeed;

    return $pressed
      ? theme.colors.backgroundSubtle
      : theme.colors.surfaceDefault;
  }};
`;

export const Card = ({
  variant = "default",
  children,
  style,
  onPress,
  disabled,
  ...rest
}: CardProps) => {
  // 누를 수 없는 카드: 단순한 상자
  if (!onPress) {
    return (
      <Surface
        $variant={variant}
        $pressed={false}
        style={style}
      >
        {children}
      </Surface>
    );
  }

  // 누를 수 있는 카드: 누르는 동안 배경색 변경
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      disabled={disabled}
      style={style}
      accessibilityRole="button"
      accessibilityState={{
        selected: variant === "selected",
        disabled: Boolean(disabled),
      }}
    >
      {({ pressed }) => (
        <Surface
          $variant={variant}
          $pressed={pressed}
        >
          {children}
        </Surface>
      )}
    </Pressable>
  );
};

// ───────── 카드 내부 텍스트 ─────────

// 카드 제목
export const CardTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// 카드 설명
export const CardDescription = styled.Text`
  margin-top: 4px;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 카드 하단 작은 정보
export const CardMeta = styled.Text`
  margin-top: 8px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export default Card;
