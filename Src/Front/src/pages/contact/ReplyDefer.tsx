import { useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import { ChoiceGroup } from "@core/ui/choice";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import {
  DEFER_OPTIONS,
  deferToDate,
  type DeferOption,
} from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { services } from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "./Contact_styled";

// 04 / 11 나중에 답하기: 다시 볼 때를 정하면 그때 조용히 한 번만 알림
// 기본 선택은 시안대로 "3일 뒤". "날짜 없이"도 고를 수 있음 (기한을 강요하지 않음)
// TODO(네이티브): 다시 볼 때 로컬 알림 예약 (지금은 mock 저장만)
const ReplyDefer = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "ReplyDefer">>();
  const [option, setOption] = useState<DeferOption>("in3days");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const label = DEFER_OPTIONS.find(o => o.value === option)!.label;
  const noDate = option === "none";

  const handleSave = async () => {
    setSaving(true);
    setError(false);
    try {
      await services.conversation.deferReply(
        params.conversationId,
        deferToDate(option)
      );
      // 목록으로 돌아가면 카드에 "N일 뒤 다시 보기"가 붙고 "나중에"에 모임
      navigation.popToTop();
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="나중에 답하기" gap={12} paddingBottom={32}>
      <AuthIntro
        title="언제 다시 볼까요?"
        description="미루는 기간을 정하면 그때 조용히 알려드릴게요."
      />

      <s.Cards>
        <Card>
          <ChoiceGroup
            shape="chip"
            options={DEFER_OPTIONS}
            value={option}
            onChange={setOption}
            disabled={saving}
          />
        </Card>

        <Card accessibilityLiveRegion="polite">
          <s.BlockTitle>{`선택: ${label}`}</s.BlockTitle>
          <s.BlockBody>
            {noDate
              ? "날짜 없이 보관해요. 알림은 보내지 않아요."
              : "그 전에는 알림을 보내지 않아요."}
          </s.BlockBody>
        </Card>

        <Card>
          <s.BlockTitle>작은 다음 행동</s.BlockTitle>
          <s.BlockBody>
            답장 전체가 아니라 안부 한마디부터 시작해도 괜찮아요.
          </s.BlockBody>
        </Card>
      </s.Cards>

      {error && (
        <Notice
          tone="danger"
          title="보관하지 못했어요. 잠시 뒤에 다시 해 주세요."
        />
      )}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          disabled={saving}
          accessibilityState={{ busy: saving, disabled: saving }}
          onPress={handleSave}
        >
          {saving
            ? "보관하는 중…"
            : noDate
            ? "날짜 없이 보관하기"
            : `${label} 다시 보기`}
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

export default ReplyDefer;
