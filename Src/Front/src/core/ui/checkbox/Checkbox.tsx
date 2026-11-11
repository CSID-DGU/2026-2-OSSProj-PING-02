import { Pressable } from "react-native";
import styled from "styled-components/native";

// Figma: Checkbox (unchecked · checked · pressed · disabled)
// 기준: design-system.md - 선택 상태는 색상만이 아니라 체크 표시를 함께 제공
export interface CheckboxProps {
  checked: boolean; // 체크 여부
  onChange?: (next: boolean) => void; // 눌렀을 때 바뀐 값을 알려줌
  label?: string; // 옆에 붙는 글자
  disabled?: boolean;
}

// 전체 줄 (최소 높이 44px로 터치 영역 확보)
const Row = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
  min-height: 44px;
`;

const Box = styled.View<{
  $checked: boolean;
  $pressed: boolean;
  $disabled: boolean;
}>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border-width: 1.5px;
  align-items: center;
  justify-content: center;

  border-color: ${({ theme, $checked, $pressed, $disabled }) => {
    if ($disabled) return theme.colors.borderDefault;
    if ($checked) return $pressed ? theme.colors.brandSeedStrong : theme.colors.brandSeed;
    return $pressed ? theme.colors.stateFocus : theme.colors.borderStrong;
  }};

  background-color: ${({ theme, $checked, $pressed, $disabled }) => {
    if ($disabled) return theme.colors.backgroundSubtle;
    if ($checked) return $pressed ? theme.colors.brandSeedStrong : theme.colors.brandSeed;
    return theme.colors.surfaceDefault;
  }};
`;

// 아이콘 파일 없이 "✓" 모양 만들기: 오른쪽·아래 테두리만 있는 세로 직사각형을 45도 회전
const CheckMark = styled.View<{ $disabled: boolean }>`
  width: 6px;
  height: 11px;
  margin-top: -2px;
  border-right-width: 2px;
  border-bottom-width: 2px;
  border-color: ${({ theme, $disabled }) =>
    $disabled ? theme.palette.neutral400 : theme.colors.stateSelectedContent};
  transform: rotate(45deg);
`;

const Label = styled.Text<{ $disabled: boolean }>`
  margin-left: 8px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.palette.neutral400 : theme.colors.textSecondary};
`;

export const Checkbox = ({
  checked,
  onChange,
  label,
  disabled = false,
}: CheckboxProps) => {
  return (
    <Row
      onPress={() => onChange?.(!checked)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <>
          <Box $checked={checked} $pressed={pressed} $disabled={disabled}>
            {checked ? <CheckMark $disabled={disabled} /> : null}
          </Box>
          {label ? <Label $disabled={disabled}>{label}</Label> : null}
        </>
      )}
    </Row>
  );
};

export default Checkbox;