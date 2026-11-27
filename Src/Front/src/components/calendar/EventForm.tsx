import styled, { useTheme } from "styled-components/native";
import { formatTime, minutesOfDay } from "@core/ui/calendar";
import { Field, Input } from "@core/ui/field";
import { CloseIcon } from "@core/ui/icon";
import type { CalendarEvent, EventInput, EventPerson } from "@services";

// 일정 입력 칸 (Figma 07 캘린더 F02 일정 상세·수정하기, F03 새 일정 추가, 05 연락 D03 일정 상세 수정)
// 제목 · 날짜 및 시간(선택) · 장소 · 인원(@이름 칩 + 선택)
// editable=false면 보기만 (F02 일정 상세): 선택 버튼·칩 × 없음, 입력칸은 고칠 수 없음
// 날짜·인원 고르기 시트는 쓰는 쪽이 띄움 (onPickDate·onPickPeople)
export interface EventFormValue {
  title: string;
  date: Date | null;
  allDay: boolean;
  place: string;
  people: EventPerson[];
}

export const emptyEventForm = (): EventFormValue => ({
  title: "",
  date: null,
  allDay: false,
  place: "",
  people: [],
});

export const eventFormOf = (event: CalendarEvent): EventFormValue => ({
  title: event.title,
  date: new Date(event.date),
  allDay: event.allDay,
  place: event.place ?? "",
  people: event.people,
});

export const isEventFormReady = (value: EventFormValue) =>
  !!value.title.trim() && !!value.date;

export const eventInputOf = (
  value: EventFormValue,
  source?: CalendarEvent["source"]
): EventInput => ({
  title: value.title,
  date: value.date!.toISOString(),
  allDay: value.allDay,
  place: value.place,
  people: value.people,
  source,
});

// "2026.11.22 오후 1시" (시간을 모르는 일정은 날짜만)
export const formatEventDate = (date: Date, allDay = false) => {
  const day = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(date.getDate()).padStart(2, "0")}`;
  return allDay ? day : `${day} ${formatTime(minutesOfDay(date))}`;
};

interface EventFormProps {
  value: EventFormValue;
  onChange?: (next: EventFormValue) => void;
  editable: boolean;
  onPickDate?: () => void;
  onPickPeople?: () => void;
}

const EventForm = ({
  value,
  onChange,
  editable,
  onPickDate,
  onPickPeople,
}: EventFormProps) => {
  const set = (patch: Partial<EventFormValue>) =>
    onChange?.({ ...value, ...patch });

  return (
    <Fields>
      <Field label="제목">
        <Input
          value={value.title}
          onChangeText={title => set({ title })}
          placeholder="일정 이름을 입력해 주세요"
          editable={editable}
          accessibilityLabel="일정 제목"
          maxLength={60}
        />
      </Field>

      <Field label="날짜 및 시간">
        <Box>
          <BoxText $empty={!value.date} numberOfLines={1}>
            {value.date
              ? formatEventDate(value.date, value.allDay)
              : "날짜 및 시간을 선택해 주세요"}
          </BoxText>
          {editable && onPickDate && (
            <PickButton onPress={onPickDate} label="날짜 및 시간 선택" />
          )}
        </Box>
      </Field>

      <Field label="장소">
        <Input
          value={value.place}
          onChangeText={place => set({ place })}
          placeholder={editable ? "장소를 입력해 주세요" : undefined}
          editable={editable}
          accessibilityLabel="장소"
          maxLength={60}
        />
      </Field>

      <Field label="인원">
        <PeopleRow>
          <Chips>
            {value.people.length === 0 ? (
              <Hint>{editable ? "인원을 추가해보세요." : "함께하는 사람이 없어요."}</Hint>
            ) : (
              value.people.map(p => (
                <PersonChip
                  key={p.id}
                  name={p.name}
                  onRemove={
                    editable
                      ? () => set({ people: value.people.filter(x => x.id !== p.id) })
                      : undefined
                  }
                />
              ))
            )}
          </Chips>
          {editable && onPickPeople && (
            <PickButton onPress={onPickPeople} label="인원 선택" />
          )}
        </PeopleRow>
      </Field>
    </Fields>
  );
};

// 노란 "선택" 작은 버튼 (시안 약 39×28, 터치 영역은 48dp)
const PickButton = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <Pick
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={10}
  >
    <PickText>선택</PickText>
  </Pick>
);

// "@어수빈" 칩 (수정 모드면 오른쪽 위 × 로 빼기)
const PersonChip = ({
  name,
  onRemove,
}: {
  name: string;
  onRemove?: () => void;
}) => {
  const theme = useTheme();
  return (
    <ChipWrap>
      <Chip>
        <ChipText>{`@${name}`}</ChipText>
      </Chip>
      {onRemove && (
        <Remove
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`${name} 빼기`}
          hitSlop={12}
        >
          <CloseIcon size={9} color={theme.colors.textOnDark} />
        </Remove>
      )}
    </ChipWrap>
  );
};

const Fields = styled.View`
  gap: 10px;
`;

// 보기·고르기 전용 칸: 입력칸과 같은 모양 (Input normal: 높이 52 · 모서리 10 · 테두리 borderDefault)
const Box = styled.View`
  flex-direction: row;
  align-items: center;
  height: 52px;
  padding: 0px 12px 0px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const BoxText = styled.Text<{ $empty: boolean }>`
  flex: 1;
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme, $empty }) =>
    $empty ? theme.colors.textTertiary : theme.colors.textPrimary};
`;

// TODO(Figma 스타일 확인): "선택" 글자는 가장 가까운 labelForm 13/18
const Pick = styled.Pressable`
  justify-content: center;
  align-items: center;
  height: 28px;
  padding: 0px 10px;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

const PickText = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PeopleRow = styled.View`
  flex-direction: row;
  align-items: center;
  min-height: 34px;
  padding: 0px 10px 0px 10px;
`;

const Chips = styled.View`
  flex: 1;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
`;

const Hint = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ChipWrap = styled.View`
  padding: 6px 6px 0px 0px;
`;

// TODO(Figma 스타일 확인): 칩 글자는 가장 가까운 bodySmall 13/19
const Chip = styled.View`
  height: 30px;
  justify-content: center;
  padding: 0px 12px;
  border-radius: 15px;
  border: 1px solid ${({ theme }) => theme.colors.actionPrimaryBg};
  background-color: ${({ theme }) => theme.colors.stateSelectedBg};
`;

const ChipText = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Remove = styled.Pressable`
  position: absolute;
  top: 0px;
  right: 0px;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.actionPrimaryBg};
`;

export default EventForm;
