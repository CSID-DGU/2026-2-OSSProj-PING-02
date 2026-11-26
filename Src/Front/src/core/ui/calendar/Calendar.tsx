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
export interface CalendarProps {
  value?: Date | null;
  onChange: (date: Date) => void;
  // 처음 보여 줄 달 (기본: value의 달, 없으면 이번 달)
  initialMonth?: Date;
  minDate?: Date;
  maxDate?: Date;
}

export const Calendar = ({
  value,
  onChange,
  initialMonth,
  minDate,
  maxDate,
}: CalendarProps) => {
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
    <Wrapper>
      <MonthRow>
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
          <Cell key={w} $height={32}>
            <WeekdayLabel>{w}</WeekdayLabel>
          </Cell>
        ))}
      </Week>

      {weeks.map((week, i) => (
        <Week key={i}>
          {week.map((day, j) => {
            if (!day) return <Cell key={`empty-${j}`} $height={DAY_HEIGHT} />;
            const selected = isSameDay(day, value);
            const isToday = isSameDay(day, today);
            const disabled = (!!min && day < min) || (!!max && day > max);
            return (
              <DayButton
                key={day.getDate()}
                onPress={() => onChange(day)}
                hitSlop={DAY_HIT_SLOP}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${formatDate(day, { withYear: true })}${
                  isToday ? ", 오늘" : ""
                }`}
                accessibilityState={{ selected, disabled }}
              >
                <DayCircle $selected={selected}>
                  <DayLabel
                    $selected={selected}
                    $today={isToday}
                    $disabled={disabled}
                  >
                    {day.getDate()}
                  </DayLabel>
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
// 위아래 줄과 겹치지 않게 줄 간격의 절반씩만
const DAY_HIT_SLOP = { top: ROW_GAP / 2, bottom: ROW_GAP / 2 };

const Wrapper = styled.View`
  gap: ${ROW_GAP}px;
`;

const MonthRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
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

const DayButton = styled.Pressable`
  flex: 1;
  height: ${DAY_HEIGHT}px;
  justify-content: center;
  align-items: center;
`;

const DayCircle = styled.View<{ $selected: boolean }>`
  width: ${DAY_HEIGHT}px;
  height: ${DAY_HEIGHT}px;
  border-radius: ${DAY_HEIGHT / 2}px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.brandSeed : "transparent"};
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
