
import { useState } from "react";
import { FlatList, Modal, Pressable } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";

// Figma: Select / Birth Year · Birth Month · Birth Day, 이메일 도메인 선택
// 누르면 아래에서 목록(바텀시트)이 올라오고, 고르면 닫힘

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  sheetTitle?: string;
  errorText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const ROW_HEIGHT = 48;

// ───────── 선택창 (닫혀 있을 때) ─────────

const Wrapper = styled.View<{ $fullWidth: boolean }>`
  ${({ $fullWidth }) => $fullWidth && "align-self: stretch;"}
`;

const Label = styled.Text<{
  $error: boolean;
  $disabled: boolean;
}>`
  ${({ theme }) => theme.fonts.labelForm};

  color: ${({ theme, $error, $disabled }) =>
    $disabled
      ? theme.palette.neutral400
      : $error
        ? theme.colors.feedbackDangerText
        : theme.colors.textSecondary};

  margin-bottom: 6px;
`;

const Trigger = styled.View<{
  $active: boolean;
  $error: boolean;
  $disabled: boolean;
}>`
  height: 48px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0px 12px 0px 14px;
  border-radius: 10px;
  border-width: 1px;

  border-color: ${({ theme, $active, $error, $disabled }) =>
    $disabled
      ? theme.colors.borderDefault
      : $error
        ? theme.colors.stateError
        : $active
          ? theme.colors.stateFocus
          : theme.colors.borderDefault};

  background-color: ${({ theme, $disabled }) =>
    $disabled
      ? theme.colors.backgroundSubtle
      : theme.colors.surfaceDefault};
`;

const ValueText = styled.Text<{
  $empty: boolean;
  $disabled: boolean;
}>`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.bodyLarge};

  color: ${({ theme, $empty, $disabled }) =>
    $disabled
      ? theme.palette.neutral400
      : $empty
        ? theme.colors.textTertiary
        : theme.colors.textPrimary};
`;

// 임시 화살표 (나중에 chevron-down.svg로 교체)
const ChevronDown = styled.View<{ $disabled: boolean }>`
  width: 8px;
  height: 8px;
  margin-left: 8px;
  margin-top: -4px;
  border-right-width: 1.5px;
  border-bottom-width: 1.5px;

  border-color: ${({ theme, $disabled }) =>
    $disabled
      ? theme.palette.neutral300
      : theme.colors.iconSubtle};

  transform: rotate(45deg);
`;

const Helper = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.feedbackDangerText};
  margin-top: 6px;
`;

// ───────── 바텀시트 (열렸을 때) ─────────

const Backdrop = styled(Pressable)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: rgba(43, 39, 36, 0.4);
`;

const Sheet = styled.View<{ $bottom: number }>`
  position: absolute;
  left: 0px;
  right: 0px;
  bottom: 0px;
  max-height: 60%;
  padding-bottom: ${({ $bottom }) => $bottom + 8}px;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Handle = styled.View`
  width: 36px;
  height: 4px;
  border-radius: 2px;
  align-self: center;
  margin: 10px 0px 8px 0px;
  background-color: ${({ theme }) => theme.palette.neutral300};
`;

const SheetTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: 8px 20px 12px 20px;
`;

const OptionRow = styled.View<{
  $selected: boolean;
  $pressed: boolean;
}>`
  height: ${ROW_HEIGHT}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0px 20px;

  background-color: ${({ theme, $selected, $pressed }) =>
    $selected
      ? theme.colors.stateSelectedBg
      : $pressed
        ? theme.colors.backgroundSubtle
        : "transparent"};
`;

const OptionText = styled.Text<{ $selected: boolean }>`
  ${({ theme, $selected }) =>
    $selected
      ? theme.fonts.labelButton
      : theme.fonts.bodyLarge};

  color: ${({ theme, $selected }) =>
    $selected
      ? theme.colors.stateSelectedContent
      : theme.colors.textPrimary};
`;

// 선택된 항목에 체크 표시
const OptionCheck = styled.View`
  width: 6px;
  height: 11px;
  margin-top: -2px;
  border-right-width: 2px;
  border-bottom-width: 2px;
  border-color: ${({ theme }) => theme.colors.stateSelectedContent};
  transform: rotate(45deg);
`;

export const Select = ({
  options,
  value,
  onChange,
  placeholder = "선택",
  label,
  sheetTitle,
  errorText,
  disabled = false,
  fullWidth = true,
  style,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selected = options.find((o) => o.value === value) ?? null;
  const selectedIndex = selected ? options.indexOf(selected) : -1;
  const hasError = Boolean(errorText) && !disabled;

  const handleSelect = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Wrapper $fullWidth={fullWidth} style={style}>
      {label ? (
        <Label $error={hasError} $disabled={disabled}>
          {label}
        </Label>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={`${label ?? placeholder}, ${
          selected ? selected.label : "선택 안 됨"
        }`}
      >
        {({ pressed }) => (
          <Trigger
            $active={open || pressed}
            $error={hasError}
            $disabled={disabled}
          >
            <ValueText
              numberOfLines={1}
              $empty={!selected}
              $disabled={disabled}
            >
              {selected ? selected.label : placeholder}
            </ValueText>

            <ChevronDown $disabled={disabled} />
          </Trigger>
        )}
      </Pressable>

      {hasError ? <Helper>{errorText}</Helper> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Backdrop
          onPress={() => setOpen(false)}
          accessibilityLabel="선택 닫기"
        />

        <Sheet $bottom={insets.bottom}>
          <Handle />

          {sheetTitle || label ? (
            <SheetTitle>{sheetTitle ?? label}</SheetTitle>
          ) : null}

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            initialScrollIndex={
              selectedIndex > 0 ? selectedIndex : undefined
            }
            renderItem={({ item }) => {
              const isSelected = item.value === value;

              return (
                <Pressable
                  onPress={() => handleSelect(item.value)}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                  }}
                >
                  {({ pressed }) => (
                    <OptionRow
                      $selected={isSelected}
                      $pressed={pressed}
                    >
                      <OptionText $selected={isSelected}>
                        {item.label}
                      </OptionText>

                      {isSelected ? <OptionCheck /> : null}
                    </OptionRow>
                  )}
                </Pressable>
              );
            }}
          />
        </Sheet>
      </Modal>
    </Wrapper>
  );
};

export default Select;
