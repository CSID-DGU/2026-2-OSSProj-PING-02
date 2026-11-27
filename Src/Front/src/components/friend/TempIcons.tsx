import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@core/styles/colors";

// TODO(아이콘 SVG): 06 친구 시안 아이콘을 받기 전 임시 모양.
//   SVG를 받으면 UI/assets/icons/ui에 넣고 @core/ui/icon에 등록한 뒤 이 파일을 지움
//   - 검색 돋보기 (목록·E04-1 검색창 오른쪽)
//   - 별(직장)·하트(그 밖) 빈/색칠 (목록 줄 오른쪽 위)
//   - 새싹 (NEW 이름 앞)
interface IconProps {
  size?: number;
  color?: string;
}

export const SearchIcon = ({ size = 20, color = colors.iconSubtle }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={2} />
    <Path d="M15.5 15.5L20.5 20.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// filled: 색칠(중요한 관계). 테두리 iconDefault, 채움 brandSeed (시안 #4D4540 · #F7D876)
interface FavoriteIconProps extends IconProps {
  filled: boolean;
}

export const StarIcon = ({ size = 16, filled }: FavoriteIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5L14.94 8.46L21.5 9.41L16.75 14.04L17.87 20.58L12 17.5L6.13 20.58L7.25 14.04L2.5 9.41L9.06 8.46L12 2.5Z"
      fill={filled ? colors.brandSeed : "none"}
      stroke={colors.iconDefault}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export const HeartIcon = ({ size = 16, filled }: FavoriteIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 20.5C12 20.5 4.5 15.9 2.8 11.4C1.6 8.2 3.6 4.5 7.2 4.5C9.2 4.5 10.8 5.6 12 7.3C13.2 5.6 14.8 4.5 16.8 4.5C20.4 4.5 22.4 8.2 21.2 11.4C19.5 15.9 12 20.5 12 20.5Z"
      fill={filled ? colors.brandSeed : "none"}
      stroke={colors.iconDefault}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export const SproutIcon = ({ size = 17, color = colors.brandSprout }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 21V11" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Path d="M12 12.5C12 8.2 9 5.5 3 5.5C3 9.8 6 12.5 12 12.5Z" fill={color} />
    <Path d="M12 11C12 7.2 14.7 4.5 21 4.5C21 8.3 18.3 11 12 11Z" fill={color} />
  </Svg>
);
