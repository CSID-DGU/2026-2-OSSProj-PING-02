import { useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  useWindowDimensions,
  type ViewInstance,
} from "react-native";
import styled, { useTheme } from "styled-components/native";
import { ChevronDownIcon, SettingsIcon } from "@core/ui/icon";
import { UnderlineTabs } from "@core/ui/tabs";
import {
  CONTACT_TABS,
  RELATION_OPTIONS,
  type ContactTab,
  type RelationFilter,
} from "@constants/contact";

// 05 연락 D01·D02 공통: 밑줄 탭(전체/꼭 챙길 연락/미뤄둔 답장) + 오른쪽 톱니·"관계 ∨" 필터
// 시안(÷2): 탭 좌우 16 · 탭 밑줄에서 9 아래 높이 20 줄, 오른쪽 18 안쪽
// 관계 필터는 하나만 고름. 전체면 "관계", 고르면 그 관계 이름 (디자이너 확인)
// 메뉴: 줄 바로 아래 오른쪽, 폭 43 · 항목 높이 31 (시안대로라 터치 영역 48dp 미만)
interface ContactListControlsProps {
  tab: ContactTab;
  onTabChange: (tab: ContactTab) => void;
  laterCount: number;
  relation: RelationFilter;
  onRelationChange: (relation: RelationFilter) => void;
  // 톱니 → D02 분석 대화방 관리. 없으면 톱니는 모양만 (D02 자기 화면)
  onSettings?: () => void;
}

const ContactListControls = ({
  tab,
  onTabChange,
  laterCount,
  relation,
  onRelationChange,
  onSettings,
}: ContactListControlsProps) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const anchor = useRef<ViewInstance>(null);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(
    null
  );

  const relationLabel =
    relation === "all"
      ? "관계"
      : RELATION_OPTIONS.find(o => o.value === relation)!.label;

  // 줄 바로 아래 오른쪽 끝에 맞춰 메뉴를 띄움 (먼저 열고, 위치를 재면 옮김)
  const openMenu = () => {
    setMenu({ top: 0, right: 18 });
    anchor.current?.measureInWindow((x, y, w, h) => {
      setMenu({ top: y + h, right: width - (x + w) });
    });
  };

  const choose = (value: RelationFilter) => {
    setMenu(null);
    onRelationChange(value);
  };

  return (
    <>
      <TabsSlot>
        <UnderlineTabs
          tabs={CONTACT_TABS.map(t => ({
            ...t,
            accessibilityLabel:
              t.key === "later" && laterCount > 0
                ? `${t.label} ${laterCount}개`
                : t.label,
          }))}
          value={tab}
          onChange={onTabChange}
        />
      </TabsSlot>
      <Toolbar>
        {/* TODO(에셋): 작은 톱니 아이콘 (지금은 탭바 설정 아이콘) */}
        {onSettings ? (
          <IconButton
            onPress={onSettings}
            accessibilityRole="button"
            accessibilityLabel="분석 대화방 관리"
            hitSlop={14}
          >
            <SettingsIcon size={14} color={theme.colors.textSecondary} />
          </IconButton>
        ) : (
          <GearSlot importantForAccessibility="no-hide-descendants">
            <SettingsIcon size={14} color={theme.colors.textSecondary} />
          </GearSlot>
        )}
        <FilterButton
          ref={anchor}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={`관계 필터, ${
            relation === "all" ? "전체" : relationLabel
          }`}
          accessibilityState={{ expanded: !!menu }}
          hitSlop={14}
        >
          {/* TODO(에셋): 깔때기 아이콘 (Figma에서 내보내면 교체) */}
          <FunnelSlot />
          <FilterText>{relationLabel}</FilterText>
          <ChevronDownIcon size={9} color={theme.colors.textSecondary} />
        </FilterButton>
      </Toolbar>

      <Modal
        visible={!!menu}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setMenu(null)}
      >
        <Backdrop
          style={StyleSheet.absoluteFill}
          onPress={() => setMenu(null)}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        />
        {menu && (
          <Menu
            style={{ top: menu.top, right: menu.right }}
            accessibilityRole="menu"
          >
            {RELATION_OPTIONS.map((option, index) => {
              const selected = option.value === relation;
              return (
                <MenuItem
                  key={option.value}
                  onPress={() => choose(option.value)}
                  accessibilityRole="menuitem"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  $divider={index > 0}
                >
                  <MenuText>{option.label}</MenuText>
                </MenuItem>
              );
            })}
          </Menu>
        )}
      </Modal>
    </>
  );
};

const TabsSlot = styled.View`
  padding: 0px 16px;
`;

const Toolbar = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  height: 20px;
  margin-top: 9px;
  padding-right: 18px;
`;

const IconButton = styled.Pressable`
  width: 14px;
  height: 20px;
  justify-content: center;
  align-items: center;
`;

const GearSlot = styled.View`
  width: 14px;
  height: 20px;
  justify-content: center;
  align-items: center;
`;

const FilterButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  height: 20px;
  gap: 3px;
`;

const FunnelSlot = styled.View`
  width: 9px;
  height: 9px;
`;

const FilterText = styled.Text`
  margin-right: 2px;
  ${({ theme }) => theme.fonts.labelLink};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Backdrop = styled.Pressable``;

const Menu = styled.View`
  position: absolute;
  width: 43px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  overflow: hidden;
`;

const MenuItem = styled.Pressable<{ $divider: boolean }>`
  height: 31px;
  justify-content: center;
  align-items: center;
  border-top-width: ${({ $divider }) => ($divider ? 1 : 0)}px;
  border-top-color: ${({ theme }) => theme.colors.borderDefault};
`;

const MenuText = styled.Text`
  ${({ theme }) => theme.fonts.labelMenu};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default ContactListControls;
