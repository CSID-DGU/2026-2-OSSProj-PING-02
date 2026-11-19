import styled from "styled-components/native";
import { MAIN_TABS, type MainTabKey } from "@constants/tabs";

// 하단 탭바 (Figma 07·12 와이어프레임 구조: 탭 5개, 선택 탭은 알약 배경 + 굵은 글자)
// TODO(디자인): 탭바 시안·아이콘이 오면 맞춤 (설정은 constants/tabs 한 곳)
interface TabBarProps {
  current: MainTabKey;
  onChange: (key: MainTabKey) => void;
  bottomInset: number;
}

const TabBar = ({ current, onChange, bottomInset }: TabBarProps) => (
  <Bar $bottom={bottomInset} accessibilityRole="tablist">
    {MAIN_TABS.map(tab => {
      const selected = tab.key === current;
      return (
        <Item
          key={tab.key}
          onPress={() => onChange(tab.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          accessibilityLabel={tab.label}
        >
          <Pill $selected={selected}>
            <Label $selected={selected} numberOfLines={1}>
              {tab.label}
            </Label>
          </Pill>
        </Item>
      );
    })}
  </Bar>
);

const Bar = styled.View<{ $bottom: number }>`
  flex-direction: row;
  padding: 4px 4px ${({ $bottom }) => $bottom + 4}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

// 칸 하나 = 터치 영역 (높이 56 ≥ 48dp)
const Item = styled.Pressable`
  flex: 1;
  min-height: 56px;
  justify-content: center;
  align-items: center;
`;

const Pill = styled.View<{ $selected: boolean }>`
  min-width: 52px;
  padding: 6px 10px;
  border-radius: 999px;
  align-items: center;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedBg : "transparent"};
`;

// 선택 상태는 배경색 + 글자 굵기·색을 함께 바꿈 (색만으로 구분하지 않음)
const Label = styled.Text<{ $selected: boolean }>`
  ${({ theme, $selected }) =>
    $selected ? theme.fonts.labelButton : theme.fonts.labelForm};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedContent : theme.colors.textTertiary};
`;

export default TabBar;
