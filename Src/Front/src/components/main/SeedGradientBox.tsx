import { useState, type ReactNode } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import styled, { useTheme } from "styled-components/native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

// 왼쪽 surfaceSeed → 오른쪽 stateSelectedBg 가로 그라데이션 상자
// (04 홈 히어로 카드, 05 연락 D01 도움 수준 카드·D03 프로필 카드)
// 그라데이션은 상자 실제 크기로 그림: Svg의 "100%"는 안쪽 여백을 뺀 크기로 잡히고,
// 안드로이드에서 overflow hidden이 Svg 모서리를 자르지 않아 둥근 모서리도 Svg에서 직접 그림
interface SeedGradientBoxProps {
  radius: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  id: string; // Svg 그라데이션 id (화면에 여러 개 있어도 겹치지 않게)
}

const SeedGradientBox = ({
  radius,
  style,
  children,
  id,
}: SeedGradientBoxProps) => {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  return (
    <Wrapper onLayout={onLayout} style={style} $radius={radius}>
      {size.width > 0 && (
        <Svg style={FILL} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.surfaceSeed} />
              <Stop offset="1" stopColor={theme.colors.stateSelectedBg} />
            </LinearGradient>
          </Defs>
          <Rect
            width={size.width}
            height={size.height}
            rx={radius}
            fill={`url(#${id})`}
          />
        </Svg>
      )}
      {children}
    </Wrapper>
  );
};

const FILL = { position: "absolute" as const, top: 0, left: 0 };

const Wrapper = styled.View<{ $radius: number }>`
  border-radius: ${({ $radius }) => $radius}px;
  overflow: hidden;
`;

export default SeedGradientBox;
