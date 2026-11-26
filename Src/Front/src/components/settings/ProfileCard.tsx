import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import styled, { useTheme } from "styled-components/native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { BirthdayHatIcon, IdCardIcon, PersonCircleIcon } from "@core/ui/icon";
import { LINKED_APP_OPTIONS, type LinkedApp } from "@constants/onboarding";

// 08 설정 프로필 카드 (Figma Card_프로필): 328×100, 모서리 15
// 왼쪽 surfaceSeed → 오른쪽 stateSelectedBg 가로 그라데이션 (시안 #FFFBF0 → #FFF5D6)
// 프로필 사진 자리(44) · 이름 · 아이디 · 생년월일 + 오른쪽에 연결한 메신저 앱 아이콘(17)
interface ProfileCardProps {
  name: string;
  loginId: string;
  birthdate?: string; // YYYY-MM-DD. 없으면 줄을 숨김 (로그인 응답에는 없을 수 있음)
  linkedApps: LinkedApp[];
}

const APP_ICON = Object.fromEntries(
  LINKED_APP_OPTIONS.map(app => [app.value, app])
) as Record<LinkedApp, (typeof LINKED_APP_OPTIONS)[number]>;

// 시안 표기 "1997.02.12"
export const formatBirthdate = (birthdate: string) =>
  birthdate.replace(/-/g, ".");

const ProfileCard = ({ name, loginId, birthdate, linkedApps }: ProfileCardProps) => {
  const theme = useTheme();
  // 그라데이션은 카드 실제 크기로 그림 (HomeHero와 같은 방식: Svg가 둥근 모서리까지 그림)
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };
  const apps = LINKED_APP_OPTIONS.filter(app => linkedApps.includes(app.value));

  return (
    <Wrapper
      onLayout={onLayout}
      accessible
      accessibilityLabel={[
        name,
        `아이디 ${loginId}`,
        birthdate && `생년월일 ${formatBirthdate(birthdate)}`,
        apps.length > 0 && `연결한 앱 ${apps.map(a => a.label).join(", ")}`,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      {size.width > 0 && (
        <Svg style={FILL} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id="settingsProfile" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.surfaceSeed} />
              <Stop offset="1" stopColor={theme.colors.stateSelectedBg} />
            </LinearGradient>
          </Defs>
          <Rect
            width={size.width}
            height={size.height}
            rx={RADIUS}
            fill="url(#settingsProfile)"
          />
        </Svg>
      )}
      <Avatar>
        <PersonCircleIcon />
      </Avatar>
      <Info>
        <Name numberOfLines={1}>{name}</Name>
        <Meta>
          <IdCardIcon />
          <MetaText numberOfLines={1}>{loginId}</MetaText>
        </Meta>
        {birthdate && (
          <Meta>
            <BirthdayHatIcon />
            <MetaText>{formatBirthdate(birthdate)}</MetaText>
          </Meta>
        )}
      </Info>
      {apps.length > 0 && (
        <Apps>
          {apps.map(app => (
            <AppIcon key={app.value} source={APP_ICON[app.value].icon} />
          ))}
        </Apps>
      )}
    </Wrapper>
  );
};

const RADIUS = 15;
const FILL = { position: "absolute" as const, top: 0, left: 0 };

// 시안: 사진 왼쪽 24·위 22, 이름 왼쪽 83(사진 + 15), 아이콘 묶음 오른쪽 23·위 49
const Wrapper = styled.View`
  flex-direction: row;
  height: 100px;
  padding: 22px 23px 0px 24px;
`;

const Avatar = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const Info = styled.View`
  flex: 1;
  margin-left: 15px;
`;

// 시안: 이름 위 22, 아이디 줄 위 49 (이름 행간 26 + 1)
const Name = styled.Text`
  margin-bottom: 1px;
  ${({ theme }) => theme.fonts.titleProfile};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// 아이디·생년월일 줄은 이름보다 4dp 안쪽 (시안 왼쪽 87)
const Meta = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
`;

const MetaText = styled.Text`
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Apps = styled.View`
  flex-direction: row;
  margin-top: 27px;
`;

const AppIcon = styled.Image`
  width: 17px;
  height: 17px;
`;

export default ProfileCard;
