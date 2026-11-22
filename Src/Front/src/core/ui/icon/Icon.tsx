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

// arrow-back.svg를 좌우로 뒤집은 모양 (달력 다음 달, 목록 줄 끝 ">")
export const ChevronRightIcon = ({
  size = 24,
  color = colors.textPrimary,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6L15 12L9 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 앱바 오른쪽 알림(🔔). dot: 안 읽은 알림 표시 점
// TODO(디자이너 공유): UI/assets/icons/ui에 종 SVG가 없어 시안(05 연락 D01) 모양대로 임시로 그림
export const BellIcon = ({
  size = 24,
  color = colors.iconDefault,
  dot = false,
}: IconProps & { dot?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 16V11C18 7.69 15.31 5 12 5C8.69 5 6 7.69 6 11V16L4 18H20L18 16Z"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <Path
      d="M10 20.5C10.4 21.4 11.1 22 12 22C12.9 22 13.6 21.4 14 20.5"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    {dot && <Rect x={18} y={1} width={5} height={5} rx={2.5} fill={color} />}
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
