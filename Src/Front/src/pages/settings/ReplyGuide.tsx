import { useState } from "react";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { useToast } from "@core/ui/toast";
import AiMemoryForm, {
  fromMemoryDraft,
  toMemoryDraft,
} from "@components/onboarding/AiMemoryForm";
import SettingsLayout from "@components/settings/SettingsLayout";
import { REPLY_GUIDE_COPY as C } from "@constants/settings";
import { useOnboarding } from "@stores/OnboardingProvider";

// 08 설정 H05 내 상황과 답장 기준 (Figma 526:19250 등)
// - 입력은 온보딩 11과 같은 AiMemoryForm, 값도 온보딩에서 쓴 AI 메모리(memory)를 그대로 고침 (기기에만 저장)
// - 버튼은 상자 아래 (시안: 고정이 아니라 내용 끝), 바꾼 것이 있을 때만 진한 노랑
// - 비워서 저장해도 됨 (온보딩처럼 건너뛰기 확인을 묻지 않음: 설정에서는 지우는 것도 선택)
const ReplyGuide = () => {
  const toast = useToast();
  const { data, update } = useOnboarding();
  const [draft, setDraft] = useState(() => toMemoryDraft(data.memory));
  const [saving, setSaving] = useState(false);

  const saved = fromMemoryDraft(toMemoryDraft(data.memory));
  const next = fromMemoryDraft(draft);
  const dirty =
    next.status !== saved.status ||
    next.avoid !== saved.avoid ||
    next.avoidTopics.length !== saved.avoidTopics.length ||
    next.avoidTopics.some((t) => !saved.avoidTopics.includes(t));

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await update({ memory: next });
      toast.show(C.saved);
    } catch {
      toast.show(C.saveFailed, { icon: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout title={C.title} gap={12}>
      <AiMemoryForm
        value={draft}
        onChange={setDraft}
        sectionInset={10}
        boxOutset={0}
      />
      {/* 시안 Content / Screen: 상자 아래 안쪽 20에 버튼 */}
      <Actions>
        <Button
          variant={dirty ? "primary" : "secondary"}
          fullWidth
          onPress={handleSave}
          disabled={saving}
          accessibilityState={{ disabled: !dirty || saving, busy: saving }}
        >
          {C.save}
        </Button>
      </Actions>
    </SettingsLayout>
  );
};

const Actions = styled.View`
  padding: 20px 10px;
`;

export default ReplyGuide;
