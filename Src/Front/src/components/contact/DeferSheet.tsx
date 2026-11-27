import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { DateTimeSheet, startOfDay } from "@core/ui/calendar";
import { ChoiceGroup } from "@core/ui/choice";
import { CalendarIcon, ChevronRightIcon } from "@core/ui/icon";
import { BottomSheet, BottomSheetActions } from "@core/ui/sheet";
import {
  DEFAULT_DEFER_OPTION,
  DEFER_OPTIONS,
  DEFER_TIME_PRESETS,
  deferButtonLabel,
  deferRemindAt,
  formatDeferAt,
  isDeferOptionAvailable,
  type DeferOption,
} from "@constants/contact";

// 05 연락 D03 "나중에 답하기" 시트 (Figma "최근 연락_나중에답하기 선택" ÷2)
// 제목 "언제 다시 알려드릴까요?" · 설명 · 칩 4개(Delay Chip, 기본 "내일") · "날짜와 시간 직접 선택" 줄
// · "{칩} 다시 알려주기" · 취소
// 직접 선택(Figma "날짜와 시간 직접 선택"): 달력 + 오전 9시/오후 6시 칩 → "11월 25일 오후 6시에 다시 알려주기"
// 두 시트를 한 번에 띄우지 않고 바꿔 끼움. 직접 선택에서 취소·뒤로가기면 첫 시트로 돌아감
// 저장은 부모가 함: onConfirm(다시 알려 줄 때, 토스트용 "내일 오전 9시")
interface DeferSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (remindAt: Date, label: string) => void;
  // 저장하는 동안 버튼을 막음
  saving?: boolean;
}

const DeferSheet = ({
  visible,
  onClose,
  onConfirm,
  saving = false,
}: DeferSheetProps) => {
  const [option, setOption] = useState<DeferOption>(DEFAULT_DEFER_OPTION);
  const [custom, setCustom] = useState(false);
  // 시트를 연 시각 기준 (오후 6시가 지나면 "오늘 저녁"을 막음)
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!visible) return;
    setOption(DEFAULT_DEFER_OPTION);
    setCustom(false);
    setNow(new Date());
  }, [visible]);

  const options = DEFER_OPTIONS.map(o => ({
    ...o,
    disabled: !isDeferOptionAvailable(o.value, now),
  }));

  const confirmPreset = () => {
    const remindAt = deferRemindAt(option, now);
    onConfirm(remindAt, formatDeferAt(remindAt, option));
  };

  return (
    <>
      <BottomSheet
        visible={visible && !custom}
        onClose={onClose}
        title="언제 다시 알려드릴까요?"
        description="선택한 시간에 이 연락을 다시 알려드릴게요"
        footer={
          <BottomSheetActions
            confirmLabel={deferButtonLabel(option)}
            confirmDisabled={saving}
            onConfirm={confirmPreset}
            onCancel={onClose}
          />
        }
      >
        <Chips>
          <ChoiceGroup
            shape="pill"
            options={options}
            value={option}
            onChange={setOption}
            disabled={saving}
          />
        </Chips>
        <CustomRow
          onPress={() => setCustom(true)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="날짜와 시간 직접 선택"
        >
          {/* TODO(에셋): 시안의 작은 달력 아이콘(안쪽 점 없음) SVG가 없어 탭바 달력 아이콘을 씀 */}
          <CalendarIcon size={18} />
          <CustomLabel>날짜와 시간 직접 선택</CustomLabel>
          <ChevronRightIcon size={20} />
        </CustomRow>
      </BottomSheet>

      <DateTimeSheet
        visible={visible && custom}
        onClose={() => setCustom(false)}
        onConfirm={date => onConfirm(date, formatDeferAt(date))}
        initialValue={deferRemindAt(option, now)}
        timePresets={DEFER_TIME_PRESETS}
        minDate={startOfDay(now)}
        confirmLabel={date => `${formatDeferAt(date)}에 다시 알려주기`}
      />
    </>
  );
};

// 시안: 칩 줄은 시트 왼쪽에서 16 (시트 내용 여백 20에서 4 당김)
const Chips = styled.View`
  margin: 0px -4px;
`;

// 시안: 칩 아래 약 18 · 아이콘 왼쪽 36 · 글자 왼쪽 64 · 오른쪽 > 끝 40 (시트 기준)
// 줄 높이 48dp (터치 영역)
const CustomRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  height: 48px;
  margin-top: 18px;
  padding: 0px 12px 0px 16px;
`;

const CustomLabel = styled.Text`
  flex: 1;
  ${({ theme }) => theme.fonts.captionRelaxed};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default DeferSheet;
