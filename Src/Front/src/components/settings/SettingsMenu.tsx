import styled from "styled-components/native";
import type {
  SettingsMenuItem,
  SettingsMenuSection,
} from "@constants/settings";

// 08 설정 메뉴 묶음 (Figma H01 Section Header + Card / 직접 써볼 수 있어요)
// 묶음 이름(높이 26, 좌우 10) 아래에 흰 카드 줄(좌우 16·위아래 10, 제목 13 Medium + 설명 12 Regular)
interface SettingsMenuGroupProps {
  section: SettingsMenuSection;
  // 없으면 그 줄은 누를 수 없음 (화면이 아직 없는 메뉴)
  onPress: (item: SettingsMenuItem) => void;
  isEnabled: (item: SettingsMenuItem) => boolean;
}

export const SettingsMenuGroup = ({
  section,
  onPress,
  isEnabled,
}: SettingsMenuGroupProps) => (
  <Group>
    <SectionHeader>
      <SectionTitle accessibilityRole="header">{section.title}</SectionTitle>
    </SectionHeader>
    {section.items.map((item) => {
      const enabled = isEnabled(item);
      return (
        <Row
          key={item.key}
          onPress={() => onPress(item)}
          disabled={!enabled}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          accessibilityHint={item.description}
          accessibilityState={{ disabled: !enabled }}
        >
          <Title>{item.title}</Title>
          {item.description && <Description>{item.description}</Description>}
        </Row>
      );
    })}
  </Group>
);

// 묶음 사이 구분선 (시안 폭 326 = 카드 폭 328에서 1dp씩 안쪽. 기기 폭에 맞춰 늘어남)
export const SettingsDivider = styled.View`
  align-self: stretch;
  margin: 0px 1px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.borderDefault};
`;

const Group = styled.View`
  align-self: stretch;
`;

const SectionHeader = styled.View`
  justify-content: center;
  height: 26px;
  padding: 0px 10px;
`;

const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.labelSettingSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// 제목만 있는 줄(로그아웃·회원 탈퇴)은 시안 높이 39.5dp로 48dp보다 낮음
// TODO(디자이너 공유): 두 줄이 붙어 있어 hitSlop으로 늘리면 서로 겹쳐 시안 높이 그대로 둠
const Row = styled.TouchableOpacity`
  gap: 4px;
  padding: 10px 16px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

// 시안 제목 칸 높이 19.5 (행간 18 + 1.5)
const Title = styled.Text`
  min-height: 19.5px;
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  min-height: 18px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
