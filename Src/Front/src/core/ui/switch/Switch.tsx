import { Pressable } from "react-native";
import styled from "styled-components/native";

// Figma: 05 연락 Screens "메신저 연결 관리" 시트의 "이 계정의 연락 분석" 토글
// 트랙 46×28dp · 손잡이 24dp · 켜짐 노랑(brandSeed) / 꺼짐 진한 갈색(brandBrown)
// (꺼짐 색은 Figma 03 온보딩 06·05 연락 Control 시안 #644B40 = brown600, #59에서 회색 → 갈색)
// 켜짐·꺼짐은 색뿐 아니라 손잡이 위치로도 구분, 스크린리더에는 switch 역할 + checked 상태
export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  // 혼자 쓸 때 스크린리더 이름 (SwitchRow 안에서는 줄 전체가 읽힘)
  accessibilityLabel?: string;
}

export const Switch = ({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchProps) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    disabled={disabled}
    // 보이는 크기는 46×28, 터치 영역만 48dp
    hitSlop={{ top: 10, bottom: 10, left: 1, right: 1 }}
    accessibilityRole="switch"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ checked: value, disabled }}
  >
    <SwitchTrack value={value} disabled={disabled} />
  </Pressable>
);

// 트랙 모양만 (SwitchRow에서 줄 전체를 누르게 할 때 사용)
const SwitchTrack = ({
  value,
  disabled,
}: {
  value: boolean;
  disabled: boolean;
}) => (
  <Track $on={value} $disabled={disabled} importantForAccessibility="no">
    <Thumb $on={value} />
  </Track>
);

// Figma: 연한 노랑 상자 안에 제목(굵게) + 설명 + 오른쪽 토글. 줄 전체가 터치 영역
export interface SwitchRowProps extends SwitchProps {
  label: string;
  description?: string;
}

export const SwitchRow = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchRowProps) => (
  <Row
    onPress={() => onValueChange(!value)}
    disabled={disabled}
    accessibilityRole="switch"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityHint={description}
    accessibilityState={{ checked: value, disabled }}
    $disabled={disabled}
  >
    <Texts>
      <Label>{label}</Label>
      {description && <Description>{description}</Description>}
    </Texts>
    <SwitchTrack value={value} disabled={disabled} />
  </Row>
);

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 28;
const THUMB = 24;
const PAD = (TRACK_HEIGHT - THUMB) / 2;

const Track = styled.View<{ $on: boolean; $disabled: boolean }>`
  width: ${TRACK_WIDTH}px;
  height: ${TRACK_HEIGHT}px;
  padding: ${PAD}px;
  border-radius: ${TRACK_HEIGHT / 2}px;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  background-color: ${({ theme, $on }) =>
    $on ? theme.colors.brandSeed : theme.colors.brandBrown};
`;

const Thumb = styled.View<{ $on: boolean }>`
  width: ${THUMB}px;
  height: ${THUMB}px;
  border-radius: ${THUMB / 2}px;
  margin-left: ${({ $on }) => ($on ? TRACK_WIDTH - THUMB - PAD * 2 : 0)}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  shadow-color: ${({ theme }) => theme.colors.textPrimary};
  shadow-offset: 0px 1px;
  shadow-opacity: 0.2;
  shadow-radius: 2px;
  elevation: 2;
`;

// 시안 상자: 높이 56dp · 좌우 12dp · 모서리 16dp · surfaceSeed
const Row = styled.Pressable<{ $disabled: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 12px;
  border-radius: 16px;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const Texts = styled.View`
  flex: 1;
  gap: 2px;
`;

const Label = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default Switch;
