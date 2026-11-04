import styled from "styled-components/native";

// Figma: Choice / Signup Gender Option (선택 시 브라운 바탕+흰 글씨)
export interface ChoiceOption<T extends string> {
  label: string;
  value: T;
}

export interface ChoiceGroupProps<T extends string> {
  options: ChoiceOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  error?: boolean;
}

const Group = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const Item = styled.TouchableOpacity<{ $selected: boolean; $error: boolean }>`
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme, $selected, $error }) => {
      if ($selected) return theme.colors.actionPrimaryBg;
      if ($error) return theme.colors.stateError;
      return theme.colors.borderDefault;
    }};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.actionPrimaryBg : theme.colors.surfaceDefault};
`;

const Label = styled.Text<{ $selected: boolean }>`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.actionPrimaryText : theme.colors.textTertiary};
`;

export const ChoiceGroup = <T extends string>({
  options,
  value,
  onChange,
  error = false,
}: ChoiceGroupProps<T>) => {
  return (
    <Group accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Item
            key={option.value}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            $selected={selected}
            $error={error}
          >
            <Label $selected={selected}>{option.label}</Label>
          </Item>
        );
      })}
    </Group>
  );
};

export default ChoiceGroup;
