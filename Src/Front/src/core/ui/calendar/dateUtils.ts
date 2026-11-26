// 달력·시간 선택용 날짜 도우미 (기기 시간대 기준, 라이브러리 없이)

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export const isSameDay = (a?: Date | null, b?: Date | null) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// 달력 칸: 첫 주 앞은 빈칸(null), 이후 1일~말일
export const monthCells = (month: Date): (Date | null)[] => {
  const first = startOfMonth(month);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// 하루 중 분 (0 ~ 1439) ↔ 날짜
export const minutesOfDay = (date: Date) =>
  date.getHours() * 60 + date.getMinutes();

export const withMinutes = (day: Date, minutes: number) =>
  new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60
  );

// "오후 1시", "오전 9시 30분"
export const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const half = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${h12}시${m ? ` ${m}분` : ""}`;
};

// "2026년 11월"
export const formatMonth = (date: Date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

// "11월 29일 일요일" (withYear면 앞에 연도)
export const formatDate = (
  date: Date,
  { withYear = false, withWeekday = true } = {}
) =>
  `${withYear ? `${date.getFullYear()}년 ` : ""}${date.getMonth() + 1}월 ${date.getDate()}일${
    withWeekday ? ` ${WEEKDAYS[date.getDay()]}요일` : ""
  }`;

// "11월 29일 일요일 오후 1시"
export const formatDateTime = (date: Date) =>
  `${formatDate(date)} ${formatTime(minutesOfDay(date))}`;
