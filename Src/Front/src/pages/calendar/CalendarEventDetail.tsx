import { useCallback, useState } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { DateTimeSheet } from "@core/ui/calendar";
import { Dialog } from "@core/ui/dialog";
import { useToast } from "@core/ui/toast";
import AuthLayout from "@components/auth/AuthLayout";
import EventCard from "@components/calendar/EventCard";
import EventForm, {
  eventFormOf,
  eventInputOf,
  isEventFormReady,
  type EventFormValue,
} from "@components/calendar/EventForm";
import PeopleSheet from "@components/calendar/PeopleSheet";
import LoadState from "@components/contact/LoadState";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import { services, type CalendarEvent } from "@services";
import type { AppParamList } from "@routes/types";

// 07 캘린더 F02 일정 상세 · 일정 상세_수정하기 (시안 ÷2)
// 보기: 일정 카드 · "일정 상세" · 제목·날짜 및 시간·장소·인원(보기만) · 수정하기 · 답장 보내기 · 원문 연락 확인하러 가기
// 수정: 날짜·인원 "선택", 칩 × · 저장하기 · "일정 삭제"(팀 확정, 확인 팝업)
// - 원문 연락·답장 보내기는 메시지에서 찾은 일정만 (팀 확정). 직접 추가한 일정은 두 버튼을 숨김
// - 친구 생일 일정은 친구 정보에서 만든 것이라 고치거나 지울 수 없음 (수정하기 없음)
// - 수정 중 ←·안드로이드 뒤로가기: 고친 내용을 버리고 보기로
// TODO(#77 머지 뒤): 앱바를 TabScreen onBack(가운데 제목)으로, "답장 보내기"는 연락 상세에서 답장하기를 바로 시작
const CalendarEventDetail = () => {
  const { params } = useRoute<RouteProp<AppParamList, "CalendarEvent">>();
  const { eventId } = params;
  const load = useCallback(() => services.calendar.get(eventId), [eventId]);
  const { state, retry } = useLoad(load);

  if (state.status !== "ready") {
    return (
      <AuthLayout title="캘린더">
        <LoadState
          status={state.status}
          loadingLabel="일정을 불러오는 중"
          errorTitle="일정을 불러오지 못했어요"
          onRetry={retry}
        />
      </AuthLayout>
    );
  }
  return <Detail key={state.data.updatedAt} initial={state.data} />;
};

const Detail = ({ initial }: { initial: CalendarEvent }) => {
  const navigation = useAuthNavigation();
  const toast = useToast();
  const [event, setEvent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<EventFormValue>(() => eventFormOf(initial));
  const [sheet, setSheet] = useState<"date" | "people" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancelEdit = useCallback(() => {
    setValue(eventFormOf(event));
    setEditing(false);
  }, [event]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!editing) return false;
        cancelEdit();
        return true;
      });
      return () => sub.remove();
    }, [editing, cancelEdit])
  );

  const save = async () => {
    if (!isEventFormReady(value) || busy) return;
    setBusy(true);
    try {
      const next = await services.calendar.update(event.id, eventInputOf(value));
      setEvent(next);
      setValue(eventFormOf(next));
      setEditing(false);
      // TODO(Figma 문구 확인): 시안에 없는 저장 완료 토스트
      toast.show("일정을 저장했어요");
    } catch {
      toast.show("일정을 저장하지 못했어요. 다시 시도해 주세요", { icon: "none" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await services.calendar.remove(event.id);
      // TODO(Figma 문구 확인): 시안에 없는 삭제 완료 토스트
      toast.show("일정을 지웠어요");
      navigation.goBack();
    } catch {
      setBusy(false);
      toast.show("일정을 지우지 못했어요. 다시 시도해 주세요", { icon: "none" });
    }
  };

  const source = event.source;
  const openSource = () =>
    source &&
    navigation.navigate("ConversationDetail", {
      conversationId: source.conversationId,
    });

  return (
    <AuthLayout
      title="캘린더"
      onBack={editing ? cancelEdit : undefined}
      gap={12}
      paddingBottom={24}
    >
      <EventCard event={event} />
      <SectionTitle accessibilityRole="header">일정 상세</SectionTitle>
      <EventForm
        value={value}
        onChange={setValue}
        editable={editing}
        onPickDate={() => setSheet("date")}
        onPickPeople={() => setSheet("people")}
      />

      <Actions>
        {editing ? (
          <>
            <Button
              fullWidth
              typo="labelButtonCompact"
              disabled={!isEventFormReady(value) || busy}
              onPress={save}
            >
              저장하기
            </Button>
            {/* 팀 확정: 시안에 없지만 잘못 넣은 일정을 지울 수 있게 */}
            <Button variant="text" disabled={busy} onPress={() => setConfirmDelete(true)}>
              일정 삭제
            </Button>
          </>
        ) : (
          <>
            {!event.readOnly && (
              <Button fullWidth typo="labelButtonCompact" onPress={() => setEditing(true)}>
                수정하기
              </Button>
            )}
            {source && (
              <>
                <Button
                  variant="secondary"
                  fullWidth
                  typo="labelButtonCompact"
                  onPress={openSource}
                >
                  답장 보내기
                </Button>
                <Button variant="text" onPress={openSource}>
                  원문 연락 확인하러 가기
                </Button>
              </>
            )}
          </>
        )}
      </Actions>

      <DateTimeSheet
        visible={sheet === "date"}
        onClose={() => setSheet(null)}
        initialValue={value.date ?? undefined}
        onConfirm={date => {
          setValue(v => ({ ...v, date, allDay: false }));
          setSheet(null);
        }}
      />
      <PeopleSheet
        visible={sheet === "people"}
        selected={value.people}
        onClose={() => setSheet(null)}
        onConfirm={people => {
          setValue(v => ({ ...v, people }));
          setSheet(null);
        }}
      />
      {/* TODO(Figma 문구 확인): 시안에 없는 삭제 확인 팝업 */}
      <Dialog
        visible={confirmDelete}
        icon={null}
        title="이 일정을 지울까요?"
        description="지운 일정은 되돌릴 수 없어요."
        confirmLabel="지우기"
        onConfirm={remove}
        closeLabel="닫기"
        onClose={() => setConfirmDelete(false)}
      />
    </AuthLayout>
  );
};

// TODO(Figma 스타일 확인): "일정 상세"는 연락 "요약"과 같은 titleHomeSection 16/22
const SectionTitle = styled.Text`
  padding-left: 6px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Actions = styled.View`
  gap: 5px;
  margin-top: 8px;
`;

export default CalendarEventDetail;
