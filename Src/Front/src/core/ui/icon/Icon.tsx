import { StyleSheet, View } from "react-native";
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

// 앱바 오른쪽 알림(🔔) bell.svg. dot: 안 읽은 알림 표시 점
// 점은 시안(04 홈 C01)대로 지름 6, 중심이 아이콘 상자 오른쪽 위 모서리 바깥(23.25, -0.5)이라
// Svg 밖에 겹쳐 그림 (Svg 안에 그리면 잘림)
export const BellIcon = ({
  size = 24,
  color = colors.iconDefault,
  dot = false,
}: IconProps & { dot?: boolean }) => {
  const unit = size / 24;
  const dotSize = 6 * unit;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 15 3 17H21C21 15 18 15 18 8Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M10 21H14"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
      {dot && (
        <View
          style={[
            iconStyles.dot,
            {
              left: 23.25 * unit - dotSize / 2,
              top: -0.5 * unit - dotSize / 2,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
            },
          ]}
        />
      )}
    </View>
  );
};

const iconStyles = StyleSheet.create({ dot: { position: "absolute" } });

// 하단 탭바 아이콘 (home·chat·friends·calendar·settings.svg와 각 _active.svg)
// 기본(.svg)과 _active.svg는 path가 같고 선 색만 다름: 기본 #81746B(iconSubtle), _active #4D4540(iconDefault)
// → 모양마다 하나로 등록하고 색을 prop으로 받음
// home.svg는 72×64 안에 흰 알약·"홈" 글자까지 들어가 있어 집 모양 path만 24×24로 옮김
// (home_active.svg와 같은 모양, 위치만 (24, 10) 이동돼 있었음)
const tabStroke = {
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const HomeIcon = ({ size = 24, color = colors.iconSubtle }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.8L12 3L21 10.8V20C21 20.2652 20.8946 20.5196 20.7071 20.7071C20.5196 20.8946 20.2652 21 20 21H14.5V15H9.5V21H4C3.73478 21 3.48043 20.8946 3.29289 20.7071C3.10536 20.5196 3 20.2652 3 20V10.8Z"
      stroke={color}
      {...tabStroke}
    />
  </Svg>
);

export const ChatIcon = ({ size = 24, color = colors.iconSubtle }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4.5H20C20.3978 4.5 20.7794 4.65804 21.0607 4.93934C21.342 5.22064 21.5 5.60218 21.5 6V16C21.5 16.3978 21.342 16.7794 21.0607 17.0607C20.7794 17.342 20.3978 17.5 20 17.5H10L4.5 20.5V17.5H4C3.60218 17.5 3.22064 17.342 2.93934 17.0607C2.65804 16.7794 2.5 16.3978 2.5 16V6C2.5 5.60218 2.65804 5.22064 2.93934 4.93934C3.22064 4.65804 3.60218 4.5 4 4.5Z"
      stroke={color}
      {...tabStroke}
    />
    <Path d="M7 9H17M7 13H14" stroke={color} {...tabStroke} />
  </Svg>
);

export const FriendsIcon = ({
  size = 24,
  color = colors.iconSubtle,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 8C12 9.65685 10.6569 11 9 11C7.34315 11 6 9.65685 6 8C6 6.34315 7.34315 5 9 5C10.6569 5 12 6.34315 12 8Z"
      stroke={color}
      {...tabStroke}
    />
    <Path
      d="M19.5 9C19.5 10.3807 18.3807 11.5 17 11.5C15.6193 11.5 14.5 10.3807 14.5 9C14.5 7.61929 15.6193 6.5 17 6.5C18.3807 6.5 19.5 7.61929 19.5 9Z"
      stroke={color}
      {...tabStroke}
    />
    <Path
      d="M3.5 20C3.9 16 5.9 14 9 14C12.1 14 14.1 16 14.5 20M14 15C17.5 14.5 19.7 16.2 20.5 19.5"
      stroke={color}
      {...tabStroke}
    />
  </Svg>
);

export const CalendarIcon = ({
  size = 24,
  color = colors.iconSubtle,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5Z"
      stroke={color}
      {...tabStroke}
    />
    <Path
      d="M7 3V7M17 3V7M3 10H21M7 14H9M11 14H13M15 14H17M7 17.5H9M11 17.5H13"
      stroke={color}
      {...tabStroke}
    />
  </Svg>
);

export const SettingsIcon = ({
  size = 24,
  color = colors.iconSubtle,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
      stroke={color}
      {...tabStroke}
    />
    <Path
      d="M19.4 15C19.2523 15.31 19.2019 15.6574 19.2554 15.9966C19.309 16.3357 19.464 16.6507 19.7 16.9L19.8 17L17 19.8L16.9 19.7001C16.6506 19.464 16.3356 19.309 15.9965 19.2555C15.6574 19.2019 15.3099 19.2523 15 19.4C14.6939 19.5382 14.4356 19.7638 14.2576 20.0486C14.0797 20.3333 13.99 20.6644 14 21V21.2001H9.99999V21C10.01 20.6644 9.9203 20.3333 9.74233 20.0486C9.56437 19.7638 9.30606 19.5382 8.99999 19.4C8.69004 19.2523 8.34262 19.2019 8.00348 19.2555C7.66433 19.309 7.34935 19.464 7.09999 19.7001L6.99999 19.8L4.19999 17L4.29999 16.9C4.53602 16.6507 4.691 16.3357 4.74455 15.9966C4.7981 15.6574 4.7477 15.31 4.59999 15C4.46187 14.694 4.2362 14.4357 3.95145 14.2577C3.66671 14.0797 3.33563 13.9901 2.99999 14H2.79999V10H2.99999C3.33563 10.01 3.66671 9.92036 3.95145 9.7424C4.2362 9.56443 4.46187 9.30612 4.59999 9.00005C4.7477 8.6901 4.7981 8.34269 4.74455 8.00354C4.691 7.66439 4.53602 7.34941 4.29999 7.10005L4.19999 7.00005L6.99999 4.20005L7.09999 4.30005C7.34935 4.53608 7.66433 4.69107 8.00348 4.74461C8.34262 4.79816 8.69004 4.74776 8.99999 4.60005C9.30606 4.46193 9.56437 4.23626 9.74233 3.95152C9.9203 3.66677 10.01 3.33569 9.99999 3.00005V2.80005H14V3.00005C13.99 3.33569 14.0797 3.66677 14.2576 3.95152C14.4356 4.23626 14.6939 4.46193 15 4.60005C15.3099 4.74776 15.6574 4.79816 15.9965 4.74461C16.3356 4.69107 16.6506 4.53608 16.9 4.30005L17 4.20005L19.8 7.00005L19.7 7.10005C19.464 7.34941 19.309 7.66439 19.2554 8.00354C19.2019 8.34269 19.2523 8.6901 19.4 9.00005C19.5381 9.30612 19.7638 9.56443 20.0485 9.7424C20.3333 9.92036 20.6643 10.01 21 10H21.2V14H21C20.6643 13.9901 20.3333 14.0797 20.0485 14.2577C19.7638 14.4357 19.5381 14.694 19.4 15Z"
      stroke={color}
      {...tabStroke}
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
