import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { ChoiceGroup } from "../choice";
import { BottomSheet, BottomSheetActions } from "../sheet";
import { Calendar } from "./Calendar";
import { TimeSelect } from "./TimeSelect";
import {
  formatDate,
  formatDateTime,
  formatTime,
  minutesOfDay,
  startOfDay,
  withMinutes,
} from "./dateUtils";

// Figma: 05 연락 Screens D03
//  - "날짜와 시간 직접 선택"(나중에 답하기): 달력 + 시간 칩(오전 9시/오후 6시, pill) → timePresets
//  - "새 일정 추가_날짜및시간선택": 달력 + "시간 [오후 1시 ⌄]" → 기본(드롭다운)
// 구성: 바텀 시트(제목) · 달력 · 구분선 · 시간 · 노란 확인 버튼(선택 내용이 들어간 문구) · 취소
export interface DateTimeSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialValue?: Date;
  title?: string;
  // "date"면 시간 없이 날짜만
  mode?: "datetime" | "date";
  // 있으면 드롭다운 대신 시간 칩 (하루 중 분, 예: [540, 1080] = 오전 9시·오후 6시)
  timePresets?: number[];
  // 드롭다운 간격(분)
  timeStep?: number;
  minDate?: Date;
  maxDate?: Date;
  // 이 시각보다 이른 날짜+시간은 확인할 수 없음 (시간 칩도 막음). 예: 지금 → 오늘의 지난 시간
  minDateTime?: Date;
  // 확인 버튼 문구. 기본 "11월 29일 일요일 오후 1시 선택하기"
  confirmLabel?: (date: Date) => string;
  cancelLabel?: string;
}

const DEFAULT_MINUTES = 13 * 60;

export const DateTimeSheet = ({
  visible,
  onClose,
  onConfirm,
  initialValue,
  title = "날짜와 시간을 선택해 주세요",
  mode = "datetime",
  timePresets,
  timeStep,
  minDate,
  maxDate,
  minDateTime,
  confirmLabel,
  cancelLabel,
}: DateTimeSheetProps) => {
  const [day, setDay] = useState<Date | null>(null);
  const [minutes, setMinutes] = useState<number | undefined>();

  // 열 때마다 처음 값으로 (부모가 매번 새 Date·배열을 넘겨도 다시 초기화되지 않게 값으로 비교)
  const initialTime = initialValue?.getTime();
  const hasPresets = !!timePresets;
  useEffect(() => {
    if (!visible) return;
    const initial = initialTime === undefined ? null : new Date(initialTime);
    setDay(initial ? startOfDay(initial) : null);
    setMinutes(
      initial
        ? minutesOfDay(initial)
        : hasPresets
        ? undefined
        : DEFAULT_MINUTES
    );
  }, [visible, initialTime, hasPresets]);

  const withTime = mode === "datetime";
  const ready = !!day && (!withTime || minutes !== undefined);
  const result =
    day && ready ? (withTime ? withMinutes(day, minutes!) : day) : null;
  const isTooEarly = (date: Date) =>
    !!minDateTime && date.getTime() < minDateTime.getTime();
  const tooEarly = !!result && isTooEarly(result);

  const label = result
    ? confirmLabel?.(result) ??
      `${withTime ? formatDateTime(result) : formatDate(result)} 선택하기`
    : withTime
    ? "날짜와 시간을 골라 주세요"
    : "날짜를 골라 주세요";

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <BottomSheetActions
          confirmLabel={label}
          confirmDisabled={!result || tooEarly}
          onConfirm={() => result && !tooEarly && onConfirm(result)}
          cancelLabel={cancelLabel}
          onCancel={onClose}
        />
      }
    >
      <Calendar
        value={day}
        onChange={setDay}
        initialMonth={initialValue}
        minDate={minDate}
        maxDate={maxDate}
      />
      {withTime && (
        <TimeArea>
          {timePresets ? (
            <ChoiceGroup
              shape="pill"
              options={timePresets.map(m => ({
                label: formatTime(m),
                value: String(m),
                disabled: !!day && isTooEarly(withMinutes(day, m)),
              }))}
              value={minutes === undefined ? undefined : String(minutes)}
              onChange={v => setMinutes(Number(v))}
            />
          ) : (
            <TimeRow>
              <TimeLabel>시간</TimeLabel>
              <TimeBox>
                <TimeSelect
                  value={minutes}
                  onChange={setMinutes}
                  step={timeStep}
                />
              </TimeBox>
            </TimeRow>
          )}
        </TimeArea>
      )}
    </BottomSheet>
  );
};

// 달력 아래 구분선 + 시간 (시안: 선 아래 약 16dp)
const TimeArea = styled.View`
  margin-top: 8px;
  padding-top: 16px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderDefault};
`;

const TimeRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 20px;
  padding-left: 20px;
`;

const TimeLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelButton};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// 시안 드롭다운 폭 약 88dp. "오전 10시 30분"까지 들어가게 조금 넓힘
const TimeBox = styled.View`
  flex-direction: row;
  width: 148px;
`;

export default DateTimeSheet;
