import styled, { useTheme } from "styled-components/native";
import { formatTime, minutesOfDay, WEEKDAYS } from "@core/ui/calendar";
import { ChevronRightIcon } from "@core/ui/icon";
import type { CalendarEvent } from "@services";

// 일정 카드 (Figma Card/일정 카드: 04 홈 다가오는 일정, 07 캘린더 F01·F02, 05 연락 D03 관련 일정)
// 높이 78 · 모서리 22 · 날짜 원 50(월 brandDateMonth + 일 brandDateDay) · 제목 titleCard · 설명 captionCard
// tone: default(연노랑 원) / dark(진한 갈색 원 + 회색 바탕: 홈 오늘 일정, D03 지난 일정)
// onPress가 없으면 화살표 없이 보여 주기만 (F02 일정 상세 맨 위)
type EventLike = Pick<CalendarEvent, "title" | "date" | "place"> &
  Partial<Pick<CalendarEvent, "allDay" | "kind" | "readOnly">>;

export const describeEvent = (event: EventLike) => {
  // 친구 생일 (나이를 몰라 "생일"만, TODO(친구 생일 연도))
  if (event.kind === "birthday" && event.readOnly) return "생일";
  const date = new Date(event.date);
  const day = `${WEEKDAYS[date.getDay()]}요일`;
  const when = event.allDay ? day : `${day} ${formatTime(minutesOfDay(date))}`;
  return event.place ? `${when} ${event.place}` : when;
};

interface EventCardProps {
  event: EventLike;
  onPress?: () => void;
  tone?: "default" | "dark";
  top?: number;
}

const EventCard = ({
  event,
  onPress,
  tone = "default",
  top = 0,
}: EventCardProps) => {
  const theme = useTheme();
  const date = new Date(event.date);
  const dark = tone === "dark";
  const description = describeEvent(event);
  const label = `${date.getMonth() + 1}월 ${date.getDate()}일 ${event.title}, ${description}`;
  return (
    <Card
      $dark={dark}
      $top={top}
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={label}
    >
      <DateCircle $dark={dark}>
        <DateMonth $dark={dark}>{`${date.getMonth() + 1}월`}</DateMonth>
        <DateDay $dark={dark}>{String(date.getDate()).padStart(2, "0")}</DateDay>
      </DateCircle>
      <Texts>
        <Title numberOfLines={1}>{event.title}</Title>
        <Description numberOfLines={1}>{description}</Description>
      </Texts>
      {onPress && (
        <ChevronRightIcon size={21} color={theme.colors.iconSubtle} />
      )}
    </Card>
  );
};

const Card = styled.Pressable<{ $dark: boolean; $top: number }>`
  flex-direction: row;
  align-items: center;
  height: 78px;
  margin-top: ${({ $top }) => $top}px;
  padding: 0px 14px 0px 13px;
  border-radius: 22px;
  border-width: 1px;
  border-color: ${({ theme, $dark }) =>
    $dark ? theme.colors.borderStrong : theme.colors.borderDefault};
  background-color: ${({ theme, $dark }) =>
    $dark ? theme.colors.backgroundSubtle : theme.colors.backgroundBase};
`;

const DateCircle = styled.View<{ $dark: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, $dark }) =>
    $dark ? theme.colors.actionPrimaryBg : theme.colors.stateSelectedBg};
`;

const DateMonth = styled.Text<{ $dark: boolean }>`
  ${({ theme }) => theme.fonts.brandDateMonth};
  color: ${({ theme, $dark }) =>
    $dark ? theme.colors.textOnDark : theme.colors.textSecondary};
`;

const DateDay = styled.Text<{ $dark: boolean }>`
  ${({ theme }) => theme.fonts.brandDateDay};
  color: ${({ theme, $dark }) =>
    $dark ? theme.colors.textOnDark : theme.colors.textPrimary};
`;

const Texts = styled.View`
  flex: 1;
  gap: 5px;
  margin: 0px 8px 0px 12px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.titleCard};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.captionCard};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default EventCard;
