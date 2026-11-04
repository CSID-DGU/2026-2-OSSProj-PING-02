import type { ReactNode } from "react";
import styled from "styled-components/native";

// Figma: Input / Text Field의 라벨·도움말 영역. 선택창·버튼 그룹에도 같은 라벨을 씀
export type FieldState = "default" | "focused" | "error" | "disabled";

export interface FieldProps {
  label?: string;
  helper?: string;
  state?: FieldState;
  children: ReactNode;
}

const Wrapper = styled.View<{ $disabled: boolean }>`
  width: 100%;
  gap: 8px;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const Label = styled.Text<{ $state: FieldState }>`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme, $state }) => {
    if ($state === "focused") return theme.colors.textBrand;
    if ($state === "error") return theme.colors.stateError;
    if ($state === "disabled") return theme.colors.textTertiary;
    return theme.colors.textSecondary;
  }};
`;

const Helper = styled.Text<{ $state: FieldState }>`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme, $state }) =>
    $state === "error" ? theme.colors.stateError : theme.colors.textTertiary};
`;

export const Field = ({
  label,
  helper,
  state = "default",
  children,
}: FieldProps) => {
  return (
    <Wrapper $disabled={state === "disabled"}>
      {label && <Label $state={state}>{label}</Label>}
      {children}
      {helper && <Helper $state={state}>{helper}</Helper>}
    </Wrapper>
  );
};

export default Field;
