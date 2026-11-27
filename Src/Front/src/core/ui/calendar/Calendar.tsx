import { useState } from "react";
import styled from "styled-components/native";
import { fontFamily } from "../../styles/fonts";
import { BackIcon, ChevronRightIcon } from "../icon";
import {
  WEEKDAYS,
  addMonths,
  formatDate,
  formatMonth,
  isSameDay,
  monthCells,
  startOfDay,
  startOfMonth,
} from "./dateUtils";

// Figma: 05 연락 Screens D03 "날짜와 시간 직접 선택", Local/Calendar Day(Default·Empty·Selected)
// 월 제목 18 Bold · 요일 13 보조색 · 날짜 15 · 선택은 지름 32dp 노란 원 + 굵은 글씨
// 날짜 칸: 시안대로 세로 32 (시안 가로 40, 여기선 7칸 균등 flex)
// 터치 영역은 옆 칸과 겹치지 않는 만큼만: 가로는 칸 폭 전체, 세로는 줄 간격 절반씩(hitSlop) → 약 36dp
// size="month" (#80 07 캘린더 F01 월 화면): 줄 간격 44 · 선택 원 40 · 날짜 아래 점(marks) 지름 4, 원 안 아래쪽
export interface CalendarProps {
  value?: Date | null;
  onChange: (date: Date) => void;
  // 처음 보여 줄 달 (기본: value의 달, 없으면 이번 달)
  initialMonth?: Date;
  minDate?: Date;
  maxDate?: Date;
  size?: "sheet" | "month";
  // 날짜 아래 점 색 (없으면 점 없음). 예: 그날 일정 종류의 색
  marks?: (day: Date) => string | undefined;
}

export const Calendar = ({
  value,
  onChange,
  initialMonth,
  minDate,
  maxDate,
  size = "sheet",
  marks,
}: CalendarProps) => {
  const metric = METRICS[size];
  const [month, setMonth] = useState(() =>
    startOfMonth(initialMonth ?? value ?? new Date())
  );
  const today = new Date();
  const min = minDate && startOfDay(minDate);
  const max = maxDate && startOfDay(maxDate);
  const canPrev = !min || addMonths(month, -1) >= startOfMonth(min);
  const canNext = !max || addMonths(month, 1) <= startOfMonth(max);

  const cells = monthCells(month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7)
  );

  return (
    <Wrapper $gap={metric.rowGap}>
      <MonthRow $bottom={metric.monthRowBottom} $inset={metric.navInset}>
        <NavButton
          onPress={() => setMonth(m => addMonths(m, -1))}
          disabled={!canPrev}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          accessibilityState={{ disabled: !canPrev }}
          $disabled={!canPrev}
        >
          <BackIcon />
        </NavButton>
        <MonthTitle accessibilityRole="header" accessibilityLiveRegion="polite">
          {formatMonth(month)}
        </MonthTitle>
        <NavButton
          onPress={() => setMonth(m => addMonths(m, 1))}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          accessibilityState={{ disabled: !canNext }}
          $disabled={!canNext}
        >
          <ChevronRightIcon />
        </NavButton>
      </MonthRow>

      <Week importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map(w => (
          <Cell key={w} $height={metric.weekdayHeight}>
            <WeekdayLabel>{w}</WeekdayLabel>
          </Cell>
        ))}
      </Week>

      {weeks.map((week, i) => (
        <Week key={i}>
          {week.map((day, j) => {
            if (!day) {
              return <Cell key={`empty-${j}`} $height={metric.dayHeight} />;
            }
            const selected = isSameDay(day, value);
            const isToday = isSameDay(day, today);
            const disabled = (!!min && day < min) || (!!max && day > max);
            const mark = marks?.(day);
            return (
              <DayButton
                key={day.getDate()}
                onPress={() => onChange(day)}
                hitSlop={metric.hitSlop}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${formatDate(day, { withYear: true })}${
                  isToday ? ", 오늘" : ""
                }${mark ? ", 일정 있음" : ""}`}
                accessibilityState={{ selected, disabled }}
                $height={metric.dayHeight}
              >
                <DayCircle $selected={selected} $size={metric.circle}>
                  <DayLabel
                    $selected={selected}
                    $today={isToday}
                    $disabled={disabled}
                  >
                    {day.getDate()}
                  </DayLabel>
                  {mark ? (
                    <Dot $color={mark} $bottom={metric.dotBottom} />
                  ) : null}
                </DayCircle>
              </DayButton>
            );
          })}
        </Week>
      ))}
    </Wrapper>
  );
};

const ROW_GAP = 4;
const DAY_HEIGHT = 32;

// 위아래 줄과 겹치지 않게 줄 간격의 절반씩만 hitSlop
// month: 칸이 44라 hitSlop 없이도 세로 44dp (48dp 미만, 시안 줄 간격 우선)
const METRICS = {
  sheet: {
    rowGap: ROW_GAP,
    dayHeight: DAY_HEIGHT,
    circle: DAY_HEIGHT,
    dotBottom: 2,
    hitSlop: { top: ROW_GAP / 2, bottom: ROW_GAP / 2 },
    weekdayHeight: 32,
    monthRowBottom: 8,
    navInset: 0,
  },
  // 시안 F01: 월 제목 → 요일 29.5 → 첫 줄 34 · 화살표 중심은 카드 끝에서 25 (카드 안쪽 여백 16.5)
  month: {
    rowGap: 0,
    dayHeight: 44,
    circle: 40,
    dotBottom: 6,
    hitSlop: undefined,
    weekdayHeight: 24,
    monthRowBottom: -6,
    navInset: -16,
  },
} as const;

const Wrapper = styled.View<{ $gap: number }>`
  gap: ${({ $gap }) => $gap}px;
`;

const MonthRow = styled.View<{ $bottom: number; $inset: number }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0px ${({ $inset }) => $inset}px ${({ $bottom }) => $bottom}px;
`;

const NavButton = styled.TouchableOpacity<{ $disabled: boolean }>`
  width: 48px;
  height: 48px;
  justify-content: center;
  align-items: center;
  opacity: ${({ $disabled }) => ($disabled ? 0.3 : 1)};
`;

const MonthTitle = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Week = styled.View`
  flex-direction: row;
`;

const Cell = styled.View<{ $height: number }>`
  flex: 1;
  height: ${({ $height }) => $height}px;
  justify-content: center;
  align-items: center;
`;

const WeekdayLabel = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DayButton = styled.Pressable<{ $height: number }>`
  flex: 1;
  height: ${({ $height }) => $height}px;
  justify-content: center;
  align-items: center;
`;

const DayCircle = styled.View<{ $selected: boolean; $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ $size }) => $size / 2}px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.brandSeed : "transparent"};
`;

const Dot = styled.View<{ $color: string; $bottom: number }>`
  position: absolute;
  bottom: ${({ $bottom }) => $bottom}px;
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background-color: ${({ $color }) => $color};
`;

// 오늘: 갈색 글씨 + 중간 굵기 (선택과 겹치면 선택 우선)
const DayLabel = styled.Text<{
  $selected: boolean;
  $today: boolean;
  $disabled: boolean;
}>`
  ${({ theme, $selected, $today }) =>
    $selected || $today ? theme.fonts.labelButton : theme.fonts.bodyLarge};
  ${({ $selected }) => $selected && `font-family: ${fontFamily.bold};`}
  color: ${({ theme, $selected, $today, $disabled }) => {
    if ($disabled) return theme.colors.textTertiary;
    if ($today && !$selected) return theme.colors.textBrand;
    return theme.colors.textPrimary;
  }};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`;

export default Calendar;
