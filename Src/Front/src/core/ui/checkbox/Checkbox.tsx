import styled from "styled-components/native";
import { CheckIcon } from "../icon";

// Figma: Control / Checkbox (unchecked: 흰 바탕+테두리, checked: 노랑 바탕+흰 체크)
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  emphasis?: boolean; // 전체 동의처럼 라벨을 한 단계 강조
  disabled?: boolean;
}

const Wrapper = styled.TouchableOpacity<{ $disabled: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const Box = styled.View<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  border: 1px solid
    ${({ theme, $checked }) =>
      $checked ? theme.colors.brandSeed : theme.colors.borderDefault};
  background-color: ${({ theme, $checked }) =>
    $checked ? theme.colors.brandSeed : theme.colors.surfaceDefault};
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
      activeOpacity={0.7}
      // 박스는 20px이라 위아래로 터치 영역을 넓힘
      hitSlop={{ top: 12, bottom: 12 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      $disabled={disabled}
    >
      <Box $checked={checked}>{checked && <CheckIcon size={17} />}</Box>
      <Label $emphasis={emphasis}>{label}</Label>
    </Wrapper>
  );
};

export default Checkbox;
