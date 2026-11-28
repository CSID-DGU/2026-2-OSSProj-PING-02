import { useState } from "react";
import { Button } from "@core/ui/button";
import { BottomSheet, BottomSheetActions } from "@core/ui/sheet";
import { useToast } from "@core/ui/toast";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import AiMemoryForm, {
  fromMemoryDraft,
  isMemoryDraftEmpty,
  toMemoryDraft,
} from "@components/onboarding/AiMemoryForm";
import SkipButton from "@components/onboarding/SkipButton";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./AiMemory_styled";

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
  const [draft, setDraft] = useState(() => toMemoryDraft(data.memory));
  const [skipOpen, setSkipOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEmpty = isMemoryDraftEmpty(draft);

  const handleSave = async () => {
    if (saving) return;
    if (isEmpty) {
      setSkipOpen(true);
      return;
    }
    setSaving(true);
    try {
      await update({ memory: fromMemoryDraft(draft) });
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

        <AiMemoryForm value={draft} onChange={setDraft} />
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
