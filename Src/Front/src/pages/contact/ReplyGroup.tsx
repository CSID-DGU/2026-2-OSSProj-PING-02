import { useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import ModelNotice from "@components/contact/ModelNotice";
import RadioCard from "@components/contact/RadioCard";
import Notice from "@components/onboarding/Notice";
import { replyStepFor } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useConversationDetail } from "@hooks/useConversationDetail";
import { services } from "@services";
import type { RootStackParamList } from "@routes/router";
import * as s from "./Contact_styled";

// 04 / 09-C 요약만·답장 선택: 단톡·정보 전달 (단톡 카드는 08 없이 바로 여기로)
// - 나를 언급한 메시지·나에게 온 질문은 색 + "나를 언급" 글자 + 굵은 글씨로 강조
// - 확인만 하거나, 원하면 답장을 만들 수 있음 (미리 골라 두지 않음)
// TODO(디자이너 공유): 시안은 ○ 3줄 + 버튼 2개. 첫 줄("나를 언급한 질문은 없어요")은 고르는 항목이
//   아니라 분석 결과라 안내 줄로 두고, 버튼은 고른 항목에 맞춰 하나로 합침
type Choice = "check" | "reply";

const ReplyGroup = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ReplyGroup">>();
  const { conversationId } = params;
  const { state, modelReady, retry } = useConversationDetail(conversationId);
  const [choice, setChoice] = useState<Choice>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  if (state.status !== "ready") {
    return (
      <AuthLayout title="단톡">
        <LoadState
          status={state.status}
          loadingLabel="단톡을 불러오는 중"
          errorTitle="단톡을 불러오지 못했어요"
          onRetry={retry}
        />
      </AuthLayout>
    );
  }

  const { conversation, messages, analysis } = state.detail;
  const analyzed = modelReady && analysis.status === "done";
  const highlighted = analyzed
    ? messages.filter(m => analysis.highlightedMessageIds.includes(m.id))
    : [];
  const askedMe = highlighted.length > 0;
  // 최근 메시지 몇 개만 (오래된 것까지 다 보여 주면 부담)
  const recent = messages.slice(-5);

  const handleConfirm = async () => {
    if (choice === "reply") {
      navigation.navigate(replyStepFor(analysis.tags), { conversationId });
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      await services.conversation.markChecked(conversationId);
      navigation.goBack();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="단톡" gap={12} paddingBottom={32}>
      <AuthIntro
        // TODO(Figma 문구 확인): 질문이 있는 경우의 제목·설명은 시안에 없어 임시 문구
        title={
          askedMe
            ? "나에게 온 질문이 있어요"
            : "지금은 답장이 꼭 필요하지 않아요"
        }
        description={
          askedMe
            ? "답할지는 천천히 정해도 괜찮아요."
            : "단체 대화나 정보 전달은 먼저 요약해드려요."
        }
      />

      <ModelNotice />

      <s.Cards>
        <Card>
          {/* 긴 방 이름은 한 줄 말줄임 */}
          <s.Sender numberOfLines={1}>{conversation.title}</s.Sender>
          <s.BlockTitle>단체 대화 요약</s.BlockTitle>
          <s.BlockBody>
            {analyzed && analysis.summary
              ? analysis.summary
              : "요약 없이 최근 메시지를 그대로 보여 드려요."}
          </s.BlockBody>
        </Card>

        {analyzed && (
          <s.Muted>
            {askedMe
              ? `나를 언급한 메시지가 ${highlighted.length}개 있어요.`
              : "나를 언급한 질문은 없어요."}
          </s.Muted>
        )}

        <Card>
          <s.BlockTitle>최근 메시지</s.BlockTitle>
          <s.Cards>
            {recent.map(m => {
              const strong = highlighted.includes(m);
              return (
                <s.MessageRow
                  key={m.id}
                  accessible
                  accessibilityLabel={`${strong ? "나를 언급. " : ""}${
                    m.senderName
                  }: ${m.text}`}
                >
                  {strong && (
                    <s.MentionBadge>
                      <s.MentionText>나를 언급</s.MentionText>
                    </s.MentionBadge>
                  )}
                  <s.Sender numberOfLines={1}>{m.senderName}</s.Sender>
                  <s.MessageText $strong={strong}>{m.text}</s.MessageText>
                </s.MessageRow>
              );
            })}
          </s.Cards>
        </Card>

        <s.Cards accessibilityRole="radiogroup">
          <RadioCard
            text="답장 없이 확인만 할게요."
            selected={choice === "check"}
            onSelect={() => setChoice("check")}
          />
          <RadioCard
            text={
              askedMe
                ? "답장을 만들어 볼게요."
                : "그래도 짧은 답장을 만들고 싶어요."
            }
            selected={choice === "reply"}
            onSelect={() => setChoice("reply")}
          />
        </s.Cards>
      </s.Cards>

      {saveError && (
        <Notice
          tone="danger"
          title="확인 표시를 하지 못했어요. 잠시 뒤에 다시 해 주세요."
        />
      )}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          disabled={!choice || saving}
          accessibilityState={{ busy: saving, disabled: !choice || saving }}
          accessibilityHint={
            choice ? undefined : "하나를 고르면 누를 수 있어요"
          }
          onPress={handleConfirm}
        >
          {choice === "reply"
            ? "답장 만들기"
            : saving
            ? "저장하는 중…"
            : "확인했어요"}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate("ReplyDefer", { conversationId })}
        >
          나중에 답하기
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

export default ReplyGroup;
