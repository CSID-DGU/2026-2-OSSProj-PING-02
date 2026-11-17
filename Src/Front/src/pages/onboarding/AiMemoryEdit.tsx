import { useState } from "react";
import { View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { ChoiceGroup } from "@core/ui/choice";
import { Field, Input } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import SkipButton from "@components/onboarding/SkipButton";
import { MEMORY_CATEGORIES, MEMORY_MAX_LENGTH } from "@constants/onboarding";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useOnboarding } from "@stores/OnboardingProvider";
import type { RootStackParamList } from "@routes/router";
import * as s from "./AiMemoryEdit_styled";

// 11 / AI 메모리 상세 작성 (Figma에 시안 없음 → 입력창 + 예시 칩 임시 구현)
// 이 기기에만 저장. 저장하면 11 목록으로 돌아감
const AiMemoryEdit = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "AiMemoryEdit">>();
  const { data, update } = useOnboarding();
  const category =
    MEMORY_CATEGORIES.find(c => c.value === params.category) ??
    MEMORY_CATEGORIES[0];
  const saved = data.memory[category.value];

  const [text, setText] = useState(saved);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const changed = text.trim() !== saved.trim();
  const inputLabel = `${category.title} 메모`;

  // 예시 칩: 없으면 줄로 추가, 이미 들어 있으면 그 줄을 뺌
  // TODO(팀 확인): 다시 누르면 빠지는 동작이 맞는지 (직접 고친 문장은 그대로 둠)
  const handleExample = (example: string) => {
    setText(prev => {
      const lines = prev.split("\n");
      if (lines.some(line => line.trim() === example)) {
        return lines.filter(line => line.trim() !== example).join("\n").trim();
      }
      const base = prev.trim();
      return (base ? `${base}\n${example}` : example).slice(0, MEMORY_MAX_LENGTH);
    });
    setError(undefined);
  };

  const handleSave = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      await update({
        memory: { ...data.memory, [category.value]: text.trim() },
      });
      navigation.goBack();
    } catch {
      setError("저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const state = error ? "error" : focused ? "focused" : "default";

  return (
    <AuthLayout backOnly
      gap={24}
      footer={
        <>
          <SkipButton onPress={navigation.goBack}>그만 쓸게요</SkipButton>
          <Button
            variant="primary"
            fullWidth
            onPress={handleSave}
            disabled={!changed || saving}
            accessibilityState={{ busy: saving, disabled: !changed || saving }}
          >
            {saving
              ? "저장하는 중…"
              : saved && !text.trim()
              ? "지우고 저장할게요"
              : "저장할게요"}
          </Button>
        </>
      }
    >
      <s.Top>
        <AuthIntro
          variant="onboarding"
          title={category.title}
          description={`${category.description}. 비워 둬도 괜찮아요.`}
        />
      </s.Top>

      <Field
        helper={
          error ??
          `${text.length} / ${MEMORY_MAX_LENGTH}자 · 이 휴대폰에만 저장돼요`
        }
        state={state}
      >
        <Input
          value={text}
          onChangeText={next => {
            setText(next);
            setError(undefined);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          state={state}
          placeholder={category.placeholder}
          multiline
          maxLength={MEMORY_MAX_LENGTH}
          textAlignVertical="top"
          accessibilityLabel={inputLabel}
          style={s.memoryInputStyle}
        />
      </Field>

      <s.Examples>
        <s.ExamplesTitle>이렇게 써 볼 수 있어요 (누르면 추가돼요)</s.ExamplesTitle>
        <s.ExampleList>
          {category.examples.map(example => {
            const added = text.split("\n").some(line => line.trim() === example);
            return (
              // ChoiceGroup은 항목을 "라디오 버튼"으로 읽어서, 예시마다 감싸
              // 스크린리더에는 "버튼" 하나로 보이게 함 (두 번 탭 = activate → 추가)
              <View
                key={example}
                accessible
                accessibilityRole="button"
                accessibilityLabel={example}
                accessibilityState={{ selected: added }}
                accessibilityHint={
                  added ? "다시 누르면 메모에서 빠져요" : "누르면 메모에 추가돼요"
                }
                accessibilityActions={[{ name: "activate" }]}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === "activate") {
                    handleExample(example);
                  }
                }}
              >
                <View
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  {/* 이미 들어간 예시는 ChoiceGroup의 선택 모양(채운 배경 + 흰 글자) */}
                  <ChoiceGroup
                    shape="chip"
                    options={[{ label: example, value: example }]}
                    value={added ? example : undefined}
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

export default AiMemoryEdit;
