import { StyleSheet } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { ChevronRightIcon } from "@core/ui/icon";
import SeedGradientBox from "@components/main/SeedGradientBox";
import { HERO, type HelpMode } from "@constants/homeHelp";

// 04 홈 히어로 카드 (Figma C01): 328×176, 모서리 28, 왼쪽 surfaceSeed → 오른쪽 stateSelectedBg 가로 그라데이션
// 칩 "오늘의 도움 수준" · 제목 · 설명 · "상태 바꾸기 >" + 오른쪽 캐릭터 (모드마다 문구·캐릭터가 다름)
interface HomeHeroProps {
  mode: HelpMode | null; // null = 아직 선택하지 않음(건너뛴 날 포함)
  onChange: () => void;
}

// 캐릭터 상자: 홈 히어로 96dp(시안 위치), 모드 캐릭터 100dp는 같은 중심에 둠
const HERO_IMAGE = { size: 96, right: 14, top: 56.5 };
const MODE_IMAGE = { size: 100, right: 12, top: 54.5 };

const HomeHero = ({ mode, onChange }: HomeHeroProps) => {
  const theme = useTheme();
  const copy = HERO[mode ?? "unset"];
  const image = mode ? MODE_IMAGE : HERO_IMAGE;

  return (
    <SeedGradientBox id="homeHero" radius={RADIUS} style={styles.wrapper}>
      <Character
        source={copy.image}
        $size={image.size}
        $right={image.right}
        $top={image.top}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <Chip>
        <ChipText>오늘의 도움 수준</ChipText>
      </Chip>
      <Title accessibilityRole="header" $compact={!!copy.compactTitle}>
        {copy.title}
      </Title>
      <Description>{copy.description}</Description>
      <ChangeButton
        onPress={onChange}
        accessibilityRole="button"
        accessibilityLabel="상태 바꾸기"
        hitSlop={{ top: 10, bottom: 10 }}
      >
        <ChangeText>상태 바꾸기</ChangeText>
        <ChevronRightIcon size={15} color={theme.colors.brandBrown} />
      </ChangeButton>
    </SeedGradientBox>
  );
};

const RADIUS = 28;

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 176,
    paddingTop: 18,
    paddingBottom: 27,
    paddingLeft: 18,
  },
});

const Character = styled.Image<{ $size: number; $right: number; $top: number }>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  right: ${({ $right }) => $right}px;
  top: ${({ $top }) => $top}px;
`;

const Chip = styled.View`
  align-self: flex-start;
  height: 24px;
  padding: 0px 10px;
  border-radius: 12px;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const ChipText = styled.Text`
  ${({ theme }) => theme.fonts.captionXSmall};
  color: ${({ theme }) => theme.colors.brandBrown};
`;

// 글자가 캐릭터(왼쪽 끝 약 233dp)에 겹치지 않게 폭 제한. 길면 두 줄 (시안에 긴 문구 프레임 없음)
// $compact: 한 줄에 안 들어가는 문구만 18/26 (행간이 같아 카드 높이는 그대로)
const Title = styled.Text<{ $compact: boolean }>`
  max-width: 214px;
  margin-top: 11px;
  ${({ theme, $compact }) =>
    $compact ? theme.fonts.headingDialog : theme.fonts.headingHomeHero};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  max-width: 214px;
  margin-top: 4px;
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 시안: 높이 29, 글자 앞 15 · 화살표 뒤 9
const ChangeButton = styled.TouchableOpacity`
  align-self: flex-start;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  height: 29px;
  margin-top: 20px;
  padding: 0px 9px 0px 15px;
  border-radius: 14.5px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const ChangeText = styled.Text`
  ${({ theme }) => theme.fonts.labelLink};
  color: ${({ theme }) => theme.colors.brandBrown};
`;

export default HomeHero;
