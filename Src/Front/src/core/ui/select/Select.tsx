import { useState } from "react";
import { FlatList, Modal, StyleSheet } from "react-native";
import styled, { css, useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckIcon, ChevronDownIcon } from "../icon";

// Figma: Select / Birth Year·Month·Day, Select / Email Domain
// 누르면 아래에서 목록 시트가 올라옴 (시트는 시안이 없어 기본 토큰으로 구성)
export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
}

export interface SelectProps<T extends string | number> {
  placeholder: string;
  options: SelectOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  error?: boolean;
  sheetTitle?: string;
  flex?: number;
}

export const Select = <T extends string | number>({
  placeholder,
  options,
  value,
  onChange,
  error = false,
  sheetTitle,
  flex = 1,
}: SelectProps<T>) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  const handleSelect = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <Trigger
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={sheetTitle ?? placeholder}
        accessibilityValue={{ text: selected?.label }}
        $flex={flex}
        $open={open}
        $error={error}
      >
        <Value $filled={!!selected} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Value>
        <ChevronDownIcon />
      </Trigger>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Container>
          <Dim
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityLabel="닫기"
          />
          <Sheet $bottom={insets.bottom}>
            {sheetTitle && <SheetTitle>{sheetTitle}</SheetTitle>}
            <FlatList
              data={options}
              keyExtractor={item => String(item.value)}
              initialScrollIndex={Math.max(
                options.findIndex(option => option.value === value),
                0
              )}
              getItemLayout={(_, index) => ({
                length: OPTION_HEIGHT,
                offset: OPTION_HEIGHT * index,
                index,
              })}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Option
                    onPress={() => handleSelect(item.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    $selected={isSelected}
                  >
                    <OptionLabel $selected={isSelected}>{item.label}</OptionLabel>
                    {isSelected && (
                      <CheckIcon color={theme.colors.stateSelectedContent} />
                    )}
                  </Option>
                );
              }}
            />
          </Sheet>
        </Container>
      </Modal>
    </>
  );
};

const OPTION_HEIGHT = 48;

const Trigger = styled.TouchableOpacity<{
  $flex: number;
  $open: boolean;
  $error: boolean;
}>`
  flex: ${({ $flex }) => $flex};
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0px 12px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  ${({ theme, $open, $error }) => {
    if ($error) {
      return css`
        border: 2px solid ${theme.colors.stateError};
      `;
    }
    if ($open) {
      return css`
        border: 2px solid ${theme.palette.seed500};
      `;
    }
    return css`
      border: 1px solid ${theme.colors.borderDefault};
    `;
  }}
`;

const Value = styled.Text<{ $filled: boolean }>`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme, $filled }) =>
    $filled ? theme.colors.textPrimary : theme.colors.textTertiary};
`;

const Container = styled.View`
  flex: 1;
  justify-content: flex-end;
`;

const Dim = styled.Pressable`
  background-color: ${({ theme }) => theme.colors.overlayDim};
`;

const Sheet = styled.View<{ $bottom: number }>`
  max-height: 60%;
  padding: 12px 0px ${({ $bottom }) => $bottom + 12}px;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const SheetTitle = styled.Text`
  padding: 8px 20px 12px;
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Option = styled.TouchableOpacity<{ $selected: boolean }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: ${OPTION_HEIGHT}px;
  padding: 0px 20px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedBg : theme.colors.surfaceDefault};
`;

const OptionLabel = styled.Text<{ $selected: boolean }>`
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedContent : theme.colors.textPrimary};
`;

export default Select;
