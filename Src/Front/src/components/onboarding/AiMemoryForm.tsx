import { View } from "react-native";
import styled from "styled-components/native";
import { ChoiceGroup } from "@core/ui/choice";
import { TextArea } from "@core/ui/field";
import {
  AVOID_TOPICS,
  MEMORY_MAX_LENGTH,
  type AvoidTopic,
} from "@constants/onboarding";

// AI 메모리 입력: "AI 답장 맞춤 설정" 소제목 + 상자 2개 (Figma 03 온보딩 11, 08 설정 H05 같은 모양, #60)
// - 상자 1: 답장에 사용해도 되는 내 상황 (500자)
// - 상자 2: 먼저 꺼내지 않을 이야기 칩(여러 개) + "직접 입력"을 고르면 입력칸 (500자)
// 값은 부르는 쪽이 들고 있음 (온보딩 11은 저장 후 다음 단계, 설정 H05는 저장 후 토스트)
export const CUSTOM_TOPIC = "직접 입력";
type Chip = AvoidTopic | typeof CUSTOM_TOPIC;
const CHIPS: Chip[] = [...AVOID_TOPICS, CUSTOM_TOPIC];

export interface MemoryDraft {
  status: string;
  avoid: string;
  topics: AvoidTopic[];
  // "직접 입력" 칩을 골랐는지 (끄면 쓴 내용은 저장하지 않음)
  custom: boolean;
}

export const toMemoryDraft = (memory: {
  status: string;
  avoid: string;
  avoidTopics: AvoidTopic[];
}): MemoryDraft => ({
  status: memory.status,
  avoid: memory.avoid,
  topics: memory.avoidTopics,
  custom: !!memory.avoid.trim(),
});

// 저장할 값 ("직접 입력"을 끄면 쓴 내용은 저장하지 않음)
export const fromMemoryDraft = (draft: MemoryDraft) => ({
  status: draft.status.trim(),
  avoid: draft.custom ? draft.avoid.trim() : "",
  avoidTopics: draft.topics,
});

export const isMemoryDraftEmpty = (draft: MemoryDraft) =>
  !draft.status.trim() &&
  !(draft.custom && draft.avoid.trim()) &&
  draft.topics.length === 0;

interface AiMemoryFormProps {
  value: MemoryDraft;
  onChange: (next: MemoryDraft) => void;
  // 소제목 좌우 안쪽 (온보딩 11: 6, 설정 H05: 10)
  sectionInset?: number;
  // 상자를 본문 여백보다 넓힐 폭 (온보딩 11: 4, 설정 H05: 0)
  boxOutset?: number;
}

const AiMemoryForm = ({
  value,
  onChange,
  sectionInset = 6,
  boxOutset = 4,
}: AiMemoryFormProps) => {
  const isSelected = (chip: Chip) =>
    chip === CUSTOM_TOPIC ? value.custom : value.topics.includes(chip);

  const toggleChip = (chip: Chip) => {
    if (chip === CUSTOM_TOPIC) {
      onChange({ ...value, custom: !value.custom });
      return;
    }
    onChange({
      ...value,
      topics: value.topics.includes(chip)
        ? value.topics.filter((t) => t !== chip)
        : [...value.topics, chip],
    });
  };

  return (
    <>
      <Section $inset={sectionInset}>
        <SectionTitle accessibilityRole="header">
          AI 답장 맞춤 설정
        </SectionTitle>
        <SectionDescription>
          {
            "AI가 답장 생성에 참고할 내용을 작성해요.\n민감한 내용은 적지 않아도 괜찮아요."
          }
        </SectionDescription>
      </Section>

      <Boxes $outset={boxOutset}>
        <TextArea
          label="답장에 사용해도 되는 내 상황"
          placeholder="예: 요즘 시험 준비 중이라 답장이 늦을 수 있어요"
          value={value.status}
          onChangeText={(status) => onChange({ ...value, status })}
          maxLength={MEMORY_MAX_LENGTH}
        />
        <TextArea
          label="먼저 꺼내지 않을 이야기"
          value={value.avoid}
          onChangeText={(avoid) => onChange({ ...value, avoid })}
          maxLength={MEMORY_MAX_LENGTH}
          minHeight={167}
          showInput={value.custom}
          accessibilityLabel="먼저 꺼내지 않을 이야기 직접 입력"
        >
          <Chips>
            {CHIPS.map((chip) => {
              const selected = isSelected(chip);
              return (
                // ChoiceGroup은 하나만 고르는 라디오라, 칩마다 감싸 여러 개를 고르는 버튼으로 읽게 함
                <View
                  key={chip}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={chip}
                  accessibilityState={{ selected }}
                  accessibilityActions={[{ name: "activate" }]}
                  onAccessibilityAction={({ nativeEvent }) => {
                    if (nativeEvent.actionName === "activate") toggleChip(chip);
                  }}
                >
                  <View
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                  >
                    <ChoiceGroup
                      shape="chip"
                      options={[{ label: chip, value: chip }]}
                      value={selected ? chip : undefined}
                      onChange={toggleChip}
                    />
                  </View>
                </View>
              );
            })}
          </Chips>
        </TextArea>
      </Boxes>
    </>
  );
};

// Figma 11 (2x PNG ÷ 2)
// - "AI 답장 맞춤 설정"은 왼쪽 정렬, 소제목(16/24) → 설명(13/20) 약 2
// - 상자 사이 12, 칩은 가로 2.5 · 세로 4 간격
const Section = styled.View<{ $inset: number }>`
  gap: 2px;
  padding: 0px ${({ $inset }) => $inset}px;
`;

const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSubsection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const SectionDescription = styled.Text`
  ${({ theme }) => theme.fonts.bodySmallRelaxed};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Boxes = styled.View<{ $outset: number }>`
  gap: 12px;
  margin: 0px -${({ $outset }) => $outset}px;
`;

const Chips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: 2.5px;
  row-gap: 4px;
`;

export default AiMemoryForm;
