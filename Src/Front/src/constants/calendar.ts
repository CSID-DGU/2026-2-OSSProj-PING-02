import type { colors as Colors } from "@core/styles/colors";
import type { CalendarEvent } from "@services";

// 07 캘린더 날짜 아래 점 색 (이슈 #80: 경조사 파랑 · 생일 빨강 · 그 외 초록)
// 하루에 여러 일정이 있으면 경조사 > 생일 > 그 외 순으로 한 점만 (시안은 점 하나)
export const eventDotColor = (
  events: Pick<CalendarEvent, "kind">[],
  colors: typeof Colors
): string | undefined => {
  if (events.length === 0) return undefined;
  if (events.some(e => e.kind === "occasion")) return colors.eventOccasion;
  if (events.some(e => e.kind === "birthday")) return colors.eventBirthday;
  return colors.eventOther;
};
