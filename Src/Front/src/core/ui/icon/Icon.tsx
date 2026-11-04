import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "../../styles/colors";

// 원본: UI/assets/icons/ui/*.svg (path 값을 그대로 옮기고 색만 prop으로 받음)
interface IconProps {
  size?: number;
  color?: string;
}

export const BackIcon = ({ size = 24, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronDownIcon = ({
  size = 9,
  color = colors.textSecondary,
}: IconProps) => (
  <Svg width={size} height={(size * 6) / 9} viewBox="0 0 9 6" fill="none">
    <Path
      d="M8.5 0.5L4.5 5.5L0.5 0.5"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CheckIcon = ({
  size = 17,
  color = colors.surfaceDefault,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 17 17" fill="none">
    <Path
      d="M4 8L7.75 12L14 4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SuccessIcon = ({ size = 44 }: Omit<IconProps, "color">) => (
  <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <Rect width={44} height={44} rx={22} fill={colors.brandSeed} />
    <Path
      d="M14.0586 21.0002L20.6762 28.0591L31.7057 13.9414"
      stroke={colors.surfaceDefault}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
