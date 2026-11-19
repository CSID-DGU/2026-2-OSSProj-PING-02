import { useCallback, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import RadioCard from "@components/contact/RadioCard";
import { DEFAULT_TONE, STANCE_OPTIONS } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import { services, type ReplyStance as Stance } from "@services";
import type { RootStackParamList } from "@routes/router";
import * as s from "./Contact_styled";

// 04 / 09-A 의도별 답장 후보: 수락·거절·보류 중 입장을 먼저 고름
// 미리 골라 두지 않음 (어느 쪽도 권하지 않음). 고른 뒤 10에서 말투를 다듬음
const ReplyStance = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ReplyStance">>();
  const { conversationId } = params;
  const [selected, setSelected] = useState<Stance>();

  const load = useCallback(async () => {
    const [detail, ...byStance] = await Promise.all([
      services.conversation.get(conversationId),
      ...STANCE_OPTIONS.map(o =>
        services.conversation.getReplyCandidates(conversationId, {
          tone: DEFAULT_TONE,
          stance: o.value,
        })
      ),
    ]);
    // 이 화면에서 바로 이어지는 질문: 나를 언급한 메시지 > 마지막 메시지
    const question =
      detail.messages.find(m =>
        detail.analysis.highlightedMessageIds.includes(m.id)
      ) ?? detail.messages[detail.messages.length - 1];
    return {
      question: question.text,
      options: STANCE_OPTIONS.map((o, i) => ({
        ...o,
        text: byStance[i][0].text,
      })),
    };
  }, [conversationId]);
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

  const { question, options } = state.data;
  const chosen = options.find(o => o.value === selected);

  return (
    <AuthLayout title="답장 후보" gap={12} paddingBottom={32}>
      <AuthIntro
        title="어떻게 답하고 싶으세요?"
        description="입장을 먼저 고르면 그 방향에 맞춰 답장을 준비해요."
      />

      <s.Cards>
        <Card>
          <s.BlockTitle>의견 선택이 필요한 메시지</s.BlockTitle>
          <s.BlockBody numberOfLines={3}>{`“${question}”`}</s.BlockBody>
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
            chosen ? undefined : "입장을 하나 고르면 누를 수 있어요"
          }
          onPress={() =>
            chosen &&
            navigation.navigate("ReplyEdit", {
              conversationId,
              stance: chosen.value,
              tone: DEFAULT_TONE,
              text: chosen.text,
            })
          }
        >
          선택한 입장으로 계속
        </Button>
        <Button variant="secondary" fullWidth onPress={writeMyself}>
          직접 답장 쓰기
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

export default ReplyStance;
