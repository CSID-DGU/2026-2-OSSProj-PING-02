import { useEffect, useRef } from "react";
import {
  ScrollView,
  type LayoutChangeEvent,
  type ScrollViewInstance,
} from "react-native";
import styled from "styled-components/native";
import type { fonts } from "../../styles/fonts";

// Figma: 05 연락 Screens D01 연락 목록(전체/꼭 챙길 연락/미뤄둔 답장),
//        D03 연락 상세(최근 연락/관계/관련 일정), 06 친구(전체/NEW/친구/가족/직장/기타)
// 칸 높이 32dp(시안, 위아래 hitSlop 8로 터치 48dp) · 선택 밑줄 2dp(칸 폭의 70%) · 아래 바탕선 2dp
// 글자: 선택·기본 모두 Navigation/Label(labelTab 11/16), 색만 다름 (#77 디자이너 확인)
// 선택: 진한 색 + 밑줄 (색만으로 구분하지 않음)
export interface UnderlineTab<K extends string> {
  key: K;
  label: string;
  // 스크린리더용 이름 (예: "미뤄둔 답장 3개"). 없으면 label
  accessibilityLabel?: string;
}

export interface UnderlineTabsProps<K extends string> {
  tabs: UnderlineTab<K>[];
  value: K;
  onChange: (key: K) => void;
  // true: 글자 폭만큼 칸을 잡고 가로로 스크롤 (탭이 많거나 이름이 길 때)
  // false(기본): 칸을 똑같이 나눔
  scrollable?: boolean;
  // 글자 (기본 labelTab 11/16). #79 친구 상세 하위 탭은 11/13 SemiBold(labelRelationChip)
  typo?: keyof typeof fonts;
}

export const UnderlineTabs = <K extends string>({
  tabs,
  value,
  onChange,
  scrollable = false,
  typo,
}: UnderlineTabsProps<K>) => {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const positions = useRef<Partial<Record<K, { x: number; width: number }>>>(
    {}
  );
  const viewport = useRef(0);

  // 스크롤 모드: 선택한 탭이 화면 가운데쯤 오도록
  useEffect(() => {
    if (!scrollable) return;
    const pos = positions.current[value];
    if (!pos) return;
    const x = Math.max(pos.x + pos.width / 2 - viewport.current / 2, 0);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [scrollable, value]);

  const items = tabs.map(tab => {
    const selected = tab.key === value;
    return (
      <Item
        key={tab.key}
        onPress={() => onChange(tab.key)}
        onLayout={(e: LayoutChangeEvent) => {
          positions.current[tab.key] = e.nativeEvent.layout;
        }}
        accessibilityRole="tab"
        accessibilityLabel={tab.accessibilityLabel ?? tab.label}
        accessibilityState={{ selected }}
        hitSlop={TAB_HIT_SLOP}
        $scrollable={scrollable}
      >
        <Label $selected={selected} $typo={typo} numberOfLines={1}>
          {tab.label}
        </Label>
        <Indicator $selected={selected} $scrollable={scrollable} />
      </Item>
    );
  });

  return (
    <Wrapper accessibilityRole="tablist">
      <BaseLine importantForAccessibility="no" />
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={e => {
            viewport.current = e.nativeEvent.layout.width;
          }}
        >
          {items}
        </ScrollView>
      ) : (
        <Row>{items}</Row>
      )}
    </Wrapper>
  );
};

const TAB_HIT_SLOP = { top: 8, bottom: 8 };

const Wrapper = styled.View``;

// 아래 바탕선. 선택 밑줄이 이 위에 겹쳐 그려짐
const BaseLine = styled.View`
  position: absolute;
  left: 0px;
  right: 0px;
  bottom: 0px;
  height: 2px;
  background-color: ${({ theme }) => theme.colors.borderDefault};
`;

const Row = styled.View`
  flex-direction: row;
`;

const Item = styled.Pressable<{ $scrollable: boolean }>`
  ${({ $scrollable }) => ($scrollable ? "padding: 0px 16px;" : "flex: 1;")}
  height: 32px;
  justify-content: center;
  align-items: center;
`;

const Label = styled.Text<{ $selected: boolean; $typo?: keyof typeof fonts }>`
  ${({ theme, $typo }) => theme.fonts[$typo ?? "labelTab"]};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.textPrimary : theme.colors.textSecondary};
`;

const Indicator = styled.View<{ $selected: boolean; $scrollable: boolean }>`
  position: absolute;
  bottom: 0px;
  ${({ $scrollable }) =>
    $scrollable ? "left: 8px; right: 8px;" : "left: 15%; right: 15%;"}
  height: 2px;
  border-radius: 1px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.textPrimary : "transparent"};
`;

export default UnderlineTabs;
