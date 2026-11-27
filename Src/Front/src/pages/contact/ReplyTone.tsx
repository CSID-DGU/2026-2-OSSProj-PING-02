import { useCallback, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import RadioCard from "@components/contact/RadioCard";
import { DEFAULT_TONE, TONE_OPTIONS, toneCardTitle } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import {
  CONVERSATION_ERROR_CODE,
  getErrorCode,
  services,
  type ReplyTone as Tone,
} from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "./Contact_styled";

// 04 / 09-B 톤별 답장 후보: 축하·안부처럼 입장이 필요 없는 메시지는 말투만 고름
// 미리 골라 두지 않음. 고른 뒤 10에서 더 다듬을 수 있음
const ReplyTone = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "ReplyTone">>();
  const { conversationId } = params;
  const [selected, setSelected] = useState<Tone>();

  const load = useCallback(async () => {
    const [detail, candidates] = await Promise.all([
      services.conversation.get(conversationId),
      services.conversation.getReplyCandidates(conversationId, {
        tone: DEFAULT_TONE,
      }),
    ]).catch(error => {
      // AI가 수락·보류·거절을 정해야 하는 메시지로 판단함 → 입장 선택(09-A)으로 바꿔 감 (뒤로가기는 이전 화면으로)
      if (getErrorCode(error) === CONVERSATION_ERROR_CODE.replyStepMismatch) {
        navigation.replace("ReplyStance", { conversationId });
      }
      throw error;
    });
    const last = detail.messages[detail.messages.length - 1];
    return {
      cardTitle: toneCardTitle(detail.analysis.tags),
      about: detail.analysis.summary ?? last.text,
      // 말투 순서는 짧게·다정하게·공손하게로 고정 (후보 순서와 관계없이)
      options: TONE_OPTIONS.map(o => ({
        ...o,
        text: candidates.find(c => c.tone === o.value)?.text ?? "",
      })).filter(o => o.text),
    };
  }, [conversationId, navigation]);
  const { state, retry } = useLoad(load);

  const writeMyself = () =>
    navigation.navigate("ReplyEdit", { conversationId, text: "" });

  if (state.status !== "ready") {
    return (
      <AuthLayout title="답장 후보">
        <LoadState
          status={state.status}
          loadingLabel="답장 후보를 준비하는 중"
          errorTitle="답장 후보를 준비하지 못했어요"
          onRetry={retry}
        />
        {state.status === "error" && (
          <Button variant="secondary" fullWidth onPress={writeMyself}>
            직접 답장 쓰기
          </Button>
        )}
      </AuthLayout>
    );
  }

  const { cardTitle, about, options } = state.data;
  const chosen = options.find(o => o.value === selected);

  return (
    <AuthLayout title="답장 후보" gap={12} paddingBottom={32}>
      <AuthIntro
        title="어떤 말투가 편하세요?"
        description="축하·안부처럼 입장 선택이 필요 없는 메시지예요."
      />

      <s.Cards>
        <Card>
          <s.BlockTitle>{cardTitle}</s.BlockTitle>
          <s.BlockBody numberOfLines={3}>{about}</s.BlockBody>
        </Card>

        <s.Cards accessibilityRole="radiogroup">
          {options.map(o => (
            <RadioCard
              key={o.value}
              label={o.label}
              text={o.text}
              selected={selected === o.value}
              onSelect={() => setSelected(o.value)}
            />
          ))}
        </s.Cards>
      </s.Cards>

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          disabled={!chosen}
          accessibilityHint={
            chosen ? undefined : "말투를 하나 고르면 누를 수 있어요"
          }
          onPress={() =>
            chosen &&
            navigation.navigate("ReplyEdit", {
              conversationId,
              tone: chosen.value,
              text: chosen.text,
            })
          }
        >
          선택한 말투로 계속
        </Button>
        <Button variant="secondary" fullWidth onPress={writeMyself}>
          직접 답장 쓰기
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

export default ReplyTone;
