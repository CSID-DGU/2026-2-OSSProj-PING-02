import { useEffect, useState } from "react";
import { DateTimeSheet } from "@core/ui/calendar";
import { BottomSheet, BottomSheetActions } from "@core/ui/sheet";
import { useToast } from "@core/ui/toast";
import { services, type CalendarEvent, type EventPerson } from "@services";
import EventForm, {
  emptyEventForm,
  eventInputOf,
  isEventFormReady,
  type EventFormValue,
} from "./EventForm";
import PeopleSheet from "./PeopleSheet";

// 새 일정 추가 바텀시트 (Figma 07 캘린더 F03 새 일정 추가 · 입력내용 있는 상태 → 일정 등록 완료 토스트)
// 날짜 및 시간·인원 "선택"은 이 시트를 잠시 내리고 그 시트를 띄움 (모달을 겹쳐 띄우지 않음). 닫으면 다시 이 시트로
// initial: 처음 채울 값 (예: 캘린더에서 고른 날짜, 연락 D03에서 그 사람)
interface NewEventSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (event: CalendarEvent) => void;
  initialDate?: Date;
  initialPeople?: EventPerson[];
}

type Step = "form" | "date" | "people";

const NewEventSheet = ({
  visible,
  onClose,
  onAdded,
  initialDate,
  initialPeople,
}: NewEventSheetProps) => {
  const toast = useToast();
  const [step, setStep] = useState<Step>("form");
  const [value, setValue] = useState<EventFormValue>(emptyEventForm);
  const [saving, setSaving] = useState(false);

  const initialTime = initialDate?.getTime();
  useEffect(() => {
    if (!visible) return;
    setStep("form");
    setSaving(false);
    setValue({
      ...emptyEventForm(),
      people: initialPeople ?? [],
    });
    // 열 때의 값만 씀
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async () => {
    if (!isEventFormReady(value) || saving) return;
    setSaving(true);
    try {
      const event = await services.calendar.add(eventInputOf(value));
      toast.show("일정을 등록했어요");
      onAdded(event);
      onClose();
    } catch {
      setSaving(false);
      // TODO(Figma 문구 확인): 시안에 없는 저장 실패 문구
      toast.show("일정을 저장하지 못했어요. 다시 시도해 주세요", { icon: "none" });
    }
  };

  // 날짜 시트를 처음 열 때: 캘린더에서 고른 날 오후 1시 (DateTimeSheet 기본 시간)
  const dateSeed =
    value.date ??
    (initialTime !== undefined
      ? new Date(new Date(initialTime).setHours(13, 0, 0, 0))
      : undefined);

  return (
    <>
      <BottomSheet
        visible={visible && step === "form"}
        onClose={onClose}
        title="새 일정 추가"
        footer={
          <BottomSheetActions
            confirmLabel="추가하기"
            confirmDisabled={!isEventFormReady(value) || saving}
            onConfirm={save}
            onCancel={onClose}
          />
        }
      >
        <EventForm
          value={value}
          onChange={setValue}
          editable
          onPickDate={() => setStep("date")}
          onPickPeople={() => setStep("people")}
        />
      </BottomSheet>

      <DateTimeSheet
        visible={visible && step === "date"}
        onClose={() => setStep("form")}
        initialValue={dateSeed}
        onConfirm={date => {
          setValue(v => ({ ...v, date, allDay: false }));
          setStep("form");
        }}
      />

      <PeopleSheet
        visible={visible && step === "people"}
        selected={value.people}
        onClose={() => setStep("form")}
        onConfirm={people => {
          setValue(v => ({ ...v, people }));
          setStep("form");
        }}
      />
    </>
  );
};

export default NewEventSheet;
