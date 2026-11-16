import { useState } from "react";
import { View } from "react-native";
import { Button } from "@core/ui/button";
import { ChoiceGroup } from "@core/ui/choice";
import { Field, Input } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { MEMORY_EXAMPLES, MEMORY_MAX_LENGTH } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./AiMemory_styled";

const EXAMPLE_OPTIONS = MEMORY_EXAMPLES.map(text => ({
  label: text,
  value: text,
}));

// 07 / AI 메모리 작성 (온보딩 5단계, 선택 사항)
// 답장 제안에 참고할 나에 대한 메모. 기기 안에만 저장
const AiMemory = () => {
  const { goNext, progress } = useOnboardingStep("AiMemory");
  const { data, update, setSkipped } = useOnboarding();
  const [text, setText] = useState(data.memory);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const empty = text.trim().length === 0;

  const handleExample = (example: string) => {
    setText(prev => {
      const base = prev.trim();
      if (base.includes(example)) return prev;
      return (base ? `${base}\n${example}` : example).slice(0, MEMORY_MAX_LENGTH);
    });
    setError(undefined);
  };

  const handleSave = async () => {
    if (empty || saving) return;
    setSaving(true);
    try {
      await update({ memory: text.trim() });
      await setSkipped("AiMemory", false);
      goNext();
    } catch {
      setError("저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setSkipped("AiMemory", empty).catch(() => {});
    goNext();
  };

  return (
    <AuthLayout
      title="AI 메모리"
      progress={progress}
      footer={
        <>
          <Button
            variant="primary"
            fullWidth
            onPress={handleSave}
            disabled={empty || saving}
            accessibilityState={{ busy: saving, disabled: empty || saving }}
          >
            {saving ? "저장하는 중…" : "저장하고 다음으로"}
          </Button>
          <Button variant="text" onPress={handleSkip}>
            건너뛸게요
          </Button>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title="말씨에게 알려 주고 싶은 게 있나요?"
        description="적어 두면 답장 제안이 조금 더 나다워져요. 비워 둬도 괜찮고, 나중에 언제든 쓸 수 있어요."
      />

      <Field
        label="나에 대한 메모"
        helper={error ?? `${text.length} / ${MEMORY_MAX_LENGTH}자 · 이 휴대폰에만 저장돼요`}
        state={error ? "error" : focused ? "focused" : "default"}
      >
        <Input
          value={text}
          onChangeText={next => {
            setText(next);
            setError(undefined);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          state={error ? "error" : focused ? "focused" : "default"}
          placeholder="예) 답장은 짧게 쓰는 편이에요"
          multiline
          maxLength={MEMORY_MAX_LENGTH}
          textAlignVertical="top"
          accessibilityLabel="나에 대한 메모"
          style={s.memoryInputStyle}
        />
      </Field>

      <s.Examples>
        <s.ExamplesTitle>이렇게 써 볼 수 있어요 (누르면 추가돼요)</s.ExamplesTitle>
        <s.ExampleList>
          {EXAMPLE_OPTIONS.map(option => {
            const added = text.includes(option.value);
            return (
              // ChoiceGroup은 항목을 "라디오 버튼"으로 읽어서, 예시마다 감싸
              // 스크린리더에는 "버튼" 하나로 보이게 함 (두 번 탭 = activate → 추가)
              <View
                key={option.value}
                accessible
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityHint={
                  added ? "이미 메모에 들어 있어요" : "누르면 메모에 추가돼요"
                }
                accessibilityActions={[{ name: "activate" }]}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === "activate") {
                    handleExample(option.value);
                  }
                }}
              >
                <View
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <ChoiceGroup
                    shape="chip"
                    options={[option]}
                    onChange={handleExample}
                  />
                </View>
              </View>
            );
          })}
        </s.ExampleList>
      </s.Examples>
    </AuthLayout>
  );
};

export default AiMemory;
