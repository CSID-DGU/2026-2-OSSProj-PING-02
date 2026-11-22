import { useMemo } from "react";
import { Select } from "../select";
import { formatTime } from "./dateUtils";

// Figma: 05 연락 Screens(11.22) D03 "새 일정 추가_날짜및시간선택"의 "시간 [오후 1시 ⌄]"
// 기존 Select(누르면 목록 시트)를 그대로 쓰고 선택지만 시간으로 만듦
export interface TimeSelectProps {
  // 하루 중 분 (예: 13:30 → 810)
  value?: number;
  onChange: (minutes: number) => void;
  // 선택지 간격(분). 기본 30분
  step?: number;
  // 선택지 범위(분). 기본 0:00 ~ 23:30
  from?: number;
  to?: number;
  placeholder?: string;
  disabled?: boolean;
  flex?: number;
}

export const timeOptions = (step = 30, from = 0, to = 24 * 60 - step) => {
  const options: { label: string; value: number }[] = [];
  for (let m = from; m <= to; m += step) {
    options.push({ label: formatTime(m), value: m });
  }
  return options;
};

export const TimeSelect = ({
  value,
  onChange,
  step = 30,
  from,
  to,
  placeholder = "시간 선택",
  disabled,
  flex,
}: TimeSelectProps) => {
  const options = useMemo(() => timeOptions(step, from, to), [step, from, to]);
  return (
    <Select
      placeholder={placeholder}
      sheetTitle="시간"
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      flex={flex}
    />
  );
};

export default TimeSelect;
