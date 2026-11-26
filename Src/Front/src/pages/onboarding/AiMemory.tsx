import { useState } from "react";
import { View } from "react-native";
import { Button } from "@core/ui/button";
import { ChoiceGroup } from "@core/ui/choice";
import { TextArea } from "@core/ui/field";
import { BottomSheet, BottomSheetActions } from "@core/ui/sheet";
import { useToast } from "@core/ui/toast";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import SkipButton from "@components/onboarding/SkipButton";
import {
  AVOID_TOPICS,
  MEMORY_MAX_LENGTH,
  type AvoidTopic,
} from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./AiMemory_styled";

const CUSTOM = "직접 입력";
type Chip = AvoidTopic | typeof CUSTOM;
const CHIPS: Chip[] = [...AVOID_TOPICS, CUSTOM];

// 11 / AI 메모리 작성 · 기본 (Figma 03 온보딩 11 최종, 선택 사항)
// - 상자 1: 답장에 사용해도 되는 내 상황 (500자)
// - 상자 2: 먼저 꺼내지 않을 이야기 칩(여러 개) + "직접 입력"을 고르면 입력칸 (500자)
// - 저장하기: 비어 있으면 11-1 건너뛰기 확인 시트, 아니면 저장 후 12
// - 건너뛰기: 11-1 시트 → "건너뛰기"면 저장하지 않고 12, "계속 작성하기"면 시트만 닫음
// 이 기기에만 저장 (서버로 보내지 않음)
const AiMemory = () => {
  const { goNext } = useOnboardingStep("AiMemory");
  const { data, update } = useOnboarding();
  const toast = useToast();
  const [status, setStatus] = useState(data.memory.status);
  const [avoid, setAvoid] = useState(data.memory.avoid);
  const [topics, setTopics] = useState<AvoidTopic[]>(data.memory.avoidTopics);
  const [custom, setCustom] = useState(!!data.memory.avoid.trim());
  const [skipOpen, setSkipOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEmpty =
    !status.trim() && !(custom && avoid.trim()) && topics.length === 0;

  const isSelected = (chip: Chip) =>
    chip === CUSTOM ? custom : topics.includes(chip);

  const toggleChip = (chip: Chip) => {
    if (chip === CUSTOM) {
      setCustom((prev) => !prev);
      return;
    }
    setTopics((prev) =>
      prev.includes(chip) ? prev.filter((t) => t !== chip) : [...prev, chip]
    );
  };

  const handleSave = async () => {
    if (saving) return;
    if (isEmpty) {
      setSkipOpen(true);
      return;
    }
    setSaving(true);
    try {
      await update({
        memory: {
          status: status.trim(),
          // "직접 입력"을 끄면 쓴 내용은 저장하지 않음
          avoid: custom ? avoid.trim() : "",
          avoidTopics: topics,
        },
      });
      goNext();
    } catch {
      toast.show("저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.", {
        icon: "none",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setSkipOpen(false);
    goNext();
  };

  return (
    <>
      <AuthLayout
        backOnly
        gap={12}
        footer={
          <>
            <Button
              variant="primary"
              fullWidth
              onPress={handleSave}
              disabled={saving}
              accessibilityState={{ busy: saving, disabled: saving }}
            >
              저장하기
            </Button>
            <SkipButton onPress={() => setSkipOpen(true)}>건너뛰기</SkipButton>
          </>
        }
      >
        <s.Top>
          <AuthIntro
            variant="onboarding"
            title={"내 상황을 조금\n알려주실래요?"}
            description="답장에 참고해도 되는 내용만 선택해서 적어요"
          />
        </s.Top>

        <s.Section>
          <s.SectionTitle accessibilityRole="header">
            AI 답장 맞춤 설정
          </s.SectionTitle>
          <s.SectionDescription>
            {
              "AI가 답장 생성에 참고할 내용을 작성해요.\n민감한 내용은 적지 않아도 괜찮아요."
            }
          </s.SectionDescription>
        </s.Section>

        <s.Boxes>
          <TextArea
            label="답장에 사용해도 되는 내 상황"
            placeholder="예: 요즘 시험 준비 중이라 답장이 늦을 수 있어요"
            value={status}
            onChangeText={setStatus}
            maxLength={MEMORY_MAX_LENGTH}
          />
          <TextArea
            label="먼저 꺼내지 않을 이야기"
            value={avoid}
            onChangeText={setAvoid}
            maxLength={MEMORY_MAX_LENGTH}
            minHeight={167}
            showInput={custom}
            accessibilityLabel="먼저 꺼내지 않을 이야기 직접 입력"
          >
            <s.Chips>
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
                      if (nativeEvent.actionName === "activate")
                        toggleChip(chip);
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
            </s.Chips>
          </TextArea>
        </s.Boxes>
      </AuthLayout>

      {/* 11-1 건너뛰기 확인 (화면 버튼보다 위에 그려지도록 AuthLayout 뒤에 둠) */}
      <BottomSheet
        visible={skipOpen}
        onClose={() => setSkipOpen(false)}
        title="작성하지 않고 넘어갈까요?"
        description={"지금 건너뛰어도 설정에서\n언제든 다시 작성할 수 있어요."}
        footer={
          <BottomSheetActions
            confirmLabel="계속 작성하기"
            onConfirm={() => setSkipOpen(false)}
            cancelLabel="건너뛰기"
            onCancel={handleSkip}
          />
        }
      />
    </>
  );
};

export default AiMemory;
