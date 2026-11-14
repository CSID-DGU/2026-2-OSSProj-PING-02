import { Pressable } from "react-native";
import styled from "styled-components/native";
import { CheckIcon } from "../icon";

// Figma: Control / Checkbox (unchecked: 흰 바탕+테두리, checked: 노랑 바탕+흰 체크)
// 누르는 중에는 테두리(미선택)나 바탕(선택)이 한 단계 진해짐
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  emphasis?: boolean; // 전체 동의처럼 라벨을 한 단계 강조
  disabled?: boolean;
}

const Wrapper = styled(Pressable)<{ $disabled: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const Box = styled.View<{ $checked: boolean; $pressed: boolean }>`
  width: 20px;
  height: 20px;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  border: 1px solid
    ${({ theme, $checked, $pressed }) => {
      if ($checked)
        return $pressed ? theme.colors.brandSeedStrong : theme.colors.brandSeed;
      return $pressed ? theme.colors.stateFocus : theme.colors.borderDefault;
    }};
  background-color: ${({ theme, $checked, $pressed }) => {
    if ($checked)
      return $pressed ? theme.colors.brandSeedStrong : theme.colors.brandSeed;
    return theme.colors.surfaceDefault;
  }};
`;

const Label = styled.Text<{ $emphasis: boolean }>`
  flex-shrink: 1;
  ${({ theme, $emphasis }) =>
    $emphasis ? theme.fonts.labelForm : theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Checkbox = ({
  checked,
  onChange,
  label,
  emphasis = false,
  disabled = false,
}: CheckboxProps) => {
  return (
    <Wrapper
      onPress={() => onChange(!checked)}
      disabled={disabled}
      // 박스는 20px이라 위아래로 터치 영역을 넓힘
      hitSlop={{ top: 12, bottom: 12 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      $disabled={disabled}
    >
      {({ pressed }) => (
        <>
          <Box $checked={checked} $pressed={pressed}>
            {checked && <CheckIcon size={17} />}
          </Box>
          <Label $emphasis={emphasis}>{label}</Label>
        </>
      )}
    </Wrapper>
  );
};

export default Checkbox;
