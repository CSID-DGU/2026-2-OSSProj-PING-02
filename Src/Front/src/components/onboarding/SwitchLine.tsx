import type { StyleProp, ViewStyle } from "react-native";
import styled from "styled-components/native";
import { Switch } from "@core/ui/switch";

// 공통 Switch + 글자를 조합한 켜고 끄는 줄 (06 받을 알림)
// - 공통 SwitchRow는 연노랑 상자(56dp)라 Figma 06의 배경 없는 줄·48dp 상자와 달라서 조합함
// - 줄 전체를 누르면 바뀜. 스크린리더는 줄 전체를 스위치 하나로 한 번만 읽음 (안쪽 Switch는 숨김)
// - box: Figma 06 "전체 알림" 연노랑 상자 (높이 48, 좌우 20)
interface SwitchLineProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  box?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SwitchLine = ({
  label,
  description,
  value,
  onValueChange,
  box = false,
  style,
}: SwitchLineProps) => (
  <Row
    onPress={() => onValueChange(!value)}
    accessibilityRole="switch"
    accessibilityLabel={description ? `${label}, ${description}` : label}
    accessibilityState={{ checked: value }}
    $box={box}
    style={style}
  >
    <Texts>
      <Label $box={box}>{label}</Label>
      {description && <Description>{description}</Description>}
    </Texts>
    <HiddenFromReader
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Switch value={value} onValueChange={onValueChange} />
    </HiddenFromReader>
  </Row>
);

const Row = styled.Pressable<{ $box: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  ${({ theme, $box }) =>
    $box
      ? `
    padding: 0px 20px;
    border-radius: 12px;
    background-color: ${theme.colors.stateSelectedBg};
  `
      : ""}
`;

// Figma 06: 항목 제목 → 설명 3dp
const Texts = styled.View`
  flex: 1;
  gap: 3px;
`;

// Figma 06: 전체 알림 13/15 Regular(bodyCompact) · 항목 제목 14/20 SemiBold(titleSection)
const Label = styled.Text<{ $box: boolean }>`
  ${({ theme, $box }) => ($box ? theme.fonts.bodyCompact : theme.fonts.titleSection)};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// Figma 06: 항목 설명 11/12 Regular
const Description = styled.Text`
  ${({ theme }) => theme.fonts.captionDense};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const HiddenFromReader = styled.View``;

export default SwitchLine;
