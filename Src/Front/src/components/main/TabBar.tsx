import styled, { useTheme } from "styled-components/native";
import { MAIN_TABS, type MainTabKey } from "@constants/tabs";

// 하단 탭바 (Figma 00 하단탭바 / 04 홈 C01 화면 기준, 2x PNG ÷ 2)
// 360×80: 위 선 1 · 위 여백 15 · 아이콘 알약 40×28 · 간격 4 · 글자 16 · 아래 여백 16
// 선택: 아이콘 뒤 노란 알약 + 진한 아이콘(_active) + 굵은 진한 글자 (색만으로 구분하지 않음)
interface TabBarProps {
  current: MainTabKey;
  onChange: (key: MainTabKey) => void;
  bottomInset: number;
}

const TabBar = ({ current, onChange, bottomInset }: TabBarProps) => {
  const theme = useTheme();
  return (
    <Bar $bottom={bottomInset} accessibilityRole="tablist">
      {MAIN_TABS.map(tab => {
        const selected = tab.key === current;
        const Icon = tab.icon;
        return (
          <Item
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
          >
            {/* collapsable={false}: 선택 안 된 Pill(투명 배경)은 안드로이드에서 생략됐다가
                선택될 때 새로 만들어지는데, 이때 둥글기가 빠져 네모로 보임 (#44 bottom-tabs 이후).
                항상 같은 뷰를 유지해 배경색만 바꿈 */}
            <Pill $selected={selected} collapsable={false}>
              <Icon
                color={selected ? theme.colors.iconDefault : theme.colors.iconSubtle}
              />
            </Pill>
            <Label $selected={selected} numberOfLines={1}>
              {tab.label}
            </Label>
          </Item>
        );
      })}
    </Bar>
  );
};

const Bar = styled.View<{ $bottom: number }>`
  flex-direction: row;
  padding-bottom: ${({ $bottom }) => $bottom}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

// 칸 하나 = 터치 영역 (가로 1/5 · 세로 79 ≥ 48dp)
const Item = styled.Pressable`
  flex: 1;
  height: 79px;
  padding-top: 15px;
  align-items: center;
`;

const Pill = styled.View<{ $selected: boolean }>`
  width: 40px;
  height: 28px;
  border-radius: 14px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedBg : "transparent"};
`;

// 글자 11 (선택 SemiBold·stateSelectedContent / 기본 Regular·textTertiary)
const Label = styled.Text<{ $selected: boolean }>`
  margin-top: 4px;
  ${({ theme, $selected }) =>
    $selected ? theme.fonts.labelCompact : theme.fonts.captionSmall};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedContent : theme.colors.textTertiary};
`;

export default TabBar;
