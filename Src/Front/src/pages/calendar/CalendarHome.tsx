import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Calendar, isSameDay, startOfDay, WEEKDAYS } from "@core/ui/calendar";
import { PlusIcon } from "@core/ui/icon";
import EventCard from "@components/calendar/EventCard";
import NewEventSheet from "@components/calendar/NewEventSheet";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import { eventDotColor } from "@constants/calendar";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { services, type CalendarEvent } from "@services";

// 07 캘린더 F01 (Figma "07 캘린더 최종" 캘린더 · 선택 날짜 빈 상태 · 일정 등록 완료, 시안 ÷2)
// 월 달력 카드(일정 점) → 고른 날의 일정 → 다가오는 일정. 첫 화면은 오늘을 고른 상태
// - 다가오는 일정: 오늘과 고른 날 중 늦은 날 다음부터 (고른 날 일정과 겹치지 않게)
// - 오른쪽 아래 + 버튼: 새 일정 추가 시트 (고른 날로 시작)
//   TODO(디자이너 공유): F01(일정 있음) 시안에는 + 버튼이 안 보이지만 빈 상태 문구가 가리키는 버튼이라 늘 보여 줌
// - 탭 첫 화면이라 왼쪽 위 뒤로가기 없음 (팀 확정, D01·E01과 같음). 안드로이드 뒤로가기는 홈 탭
// TODO(#77 머지 뒤): TabScreen divider={false} background="surface" (시안: 앱바 구분선 없음, 흰 바탕)
const CalendarHome = ({ title }: { title: string }) => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    services.calendar
      .list()
      .then(list => {
        if (!alive) return;
        setEvents(list);
        setFailed(false);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  // 상세에서 고치거나 지우고 돌아오면 다시 읽음
  useFocusEffect(load);

  const open = (event: CalendarEvent) =>
    navigation.navigate("CalendarEvent", { eventId: event.id });

  const list = events ?? [];
  const today = startOfDay(new Date());
  const after = selected > today ? selected : today;
  const dayEvents = list.filter(e => isSameDay(new Date(e.date), selected));
  const upcoming = list.filter(
    e => startOfDay(new Date(e.date)).getTime() > after.getTime()
  );

  return (
    <TabScreen title={title}>
      <Surface>
        <ScrollView contentContainerStyle={styles.content}>
          <CalendarCard>
            <Calendar
              size="month"
              value={selected}
              onChange={setSelected}
              marks={day =>
                eventDotColor(
                  list.filter(e => isSameDay(new Date(e.date), day)),
                  theme.colors
                )
              }
            />
          </CalendarCard>

          {events === null && !failed ? (
            <Center>
              <ActivityIndicator
                color={theme.colors.brandBrown}
                accessibilityLabel="일정을 불러오는 중"
              />
            </Center>
          ) : failed ? (
            // TODO(Figma 문구 확인): 시안에 없는 오류 상태
            <Block>
              <Notice align="center" title="일정을 불러오지 못했어요">
                <Button variant="text" onPress={load}>
                  다시 불러오기
                </Button>
              </Notice>
            </Block>
          ) : (
            <>
              <SectionTitle accessibilityRole="header">
                {`${selected.getMonth() + 1}월 ${selected.getDate()}일 ${
                  WEEKDAYS[selected.getDay()]
                }요일`}
              </SectionTitle>
              {dayEvents.length === 0 ? (
                <EmptyText>
                  {"아직 일정이 없어요.\n오른쪽 아래 + 버튼으로 일정을 추가해 보세요."}
                </EmptyText>
              ) : (
                <Cards $top={11}>
                  {dayEvents.map(e => (
                    <EventCard key={e.id} event={e} onPress={() => open(e)} />
                  ))}
                </Cards>
              )}

              {/* 다가오는 일정이 없으면 구역을 숨김 */}
              {upcoming.length > 0 && (
                <>
                  <SectionTitle accessibilityRole="header">다가오는 일정</SectionTitle>
                  <Cards $top={5}>
                    {upcoming.map(e => (
                      <EventCard key={e.id} event={e} onPress={() => open(e)} />
                    ))}
                  </Cards>
                </>
              )}
            </>
          )}
        </ScrollView>

        <Fab
          onPress={() => setAdding(true)}
          accessibilityRole="button"
          accessibilityLabel="새 일정 추가"
          // 보이는 지름 40, 터치 영역 48dp
          hitSlop={4}
        >
          <PlusIcon size={22} color={theme.colors.textOnDark} />
        </Fab>
      </Surface>

      <NewEventSheet
        visible={adding}
        onClose={() => setAdding(false)}
        initialDate={selected}
        onAdded={event => {
          setSelected(startOfDay(new Date(event.date)));
          load();
        }}
      />
    </TabScreen>
  );
};

// + 버튼에 가리지 않게 아래 여백
const styles = StyleSheet.create({ content: { paddingBottom: 88 } });

const Surface = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

// 시안: 좌우 16 · 앱바 아래 약 2 · 모서리 20 · 안쪽 위 9 좌우 16.5 아래 15
const CalendarCard = styled.View`
  margin: 2px 16px 0px;
  padding: 9px 16.5px 15px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Center = styled.View`
  padding: 32px 0px;
  align-items: center;
`;

const Block = styled.View`
  margin-top: 20px;
  padding: 0px 16px;
`;

// TODO(Figma 스타일 확인): 날짜·"다가오는 일정" 제목은 연락 "요약"과 같은 titleHomeSection 16/22
const SectionTitle = styled.Text`
  margin-top: 20px;
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Cards = styled.View<{ $top: number }>`
  gap: 4px;
  margin-top: ${({ $top }) => $top}px;
  padding: 0px 16px;
`;

// TODO(Figma 스타일 확인): 빈 상태 문구는 가장 가까운 bodyMedium 14/20 (시안 줄 간격 22)
const EmptyText = styled.Text`
  margin-top: 10px;
  text-align: center;
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 시안: 지름 40 · 오른쪽 끝에서 37 · 탭바 위 25
const Fab = styled.Pressable`
  position: absolute;
  right: 37px;
  bottom: 25px;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.actionPrimaryBg};
  elevation: 4;
`;

export default CalendarHome;
