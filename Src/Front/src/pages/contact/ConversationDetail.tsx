import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import ModelNotice from "@components/contact/ModelNotice";
import Notice from "@components/onboarding/Notice";
import { formatRemind, replyStepFor, withWa } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useConversationDetail } from "@hooks/useConversationDetail";
import { services } from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "./Contact_styled";

// 04 / 08 1:1 연락 상세 (와이어프레임 구조·문구, 색·컴포넌트는 design-system)
// - 요약: 가리기 모델이 있고 분석이 끝났을 때만. 분석 실패·모델 없음은 요약 없이 받은 메시지만 (기본 카드)
// - 답장 후보는 요약이 있을 때만. 없으면 직접 답장 쓰기
// TODO(디자인): 시안 앱바 제목 "Label" 자리는 화면 이름("연락")으로 둠
const ConversationDetail = () => {
  const navigation = useAuthNavigation();
  const { params } =
    useRoute<RouteProp<AppParamList, "ConversationDetail">>();
  const { conversationId } = params;
  const { state, modelReady, retry, reload } =
    useConversationDetail(conversationId);

  if (state.status !== "ready") {
    return (
      <AuthLayout title="연락">
        <LoadState
          status={state.status}
          loadingLabel="연락을 불러오는 중"
          errorTitle="연락을 불러오지 못했어요"
          onRetry={retry}
        />
      </AuthLayout>
    );
  }

  const { conversation, messages, analysis, deferred } = state.detail;
  const summaryReady =
    modelReady && analysis.status === "done" && !!analysis.summary;
  const analyzing = modelReady && analysis.status === "pending";
  const truncated = messages.some(m => m.truncated);

  const openCandidates = () =>
    navigation.navigate(replyStepFor(analysis.tags), { conversationId });
  const writeMyself = () =>
    navigation.navigate("ReplyEdit", { conversationId, text: "" });
  const stopDeferring = async () => {
    try {
      await services.conversation.cancelDeferred(conversationId);
    } finally {
      reload();
    }
  };

  return (
    <AuthLayout title="연락" gap={12} paddingBottom={32}>
      <AuthIntro
        title={`${withWa(conversation.title)}의 연락`}
        description={
          summaryReady
            ? "메시지를 짧게 정리해드렸어요."
            : "받은 메시지를 그대로 보여 드려요."
        }
      />

      <ModelNotice />

      {deferred && (
        <Notice title={formatRemind(deferred.remindAt)}>
          <s.Muted>그 전에는 재촉하지 않고 조용히 기다릴게요.</s.Muted>
          <Button variant="text" onPress={stopDeferring}>
            미뤄두기 그만하기
          </Button>
        </Notice>
      )}

      <s.Cards>
        {summaryReady && (
          <Card accessibilityLabel={`요약. ${analysis.summary}`}>
            <s.BlockTitle>요약</s.BlockTitle>
            <s.BlockBody>{analysis.summary}</s.BlockBody>
          </Card>
        )}
        {analyzing && (
          <Card>
            <s.BlockTitle>요약</s.BlockTitle>
            <s.BlockBody>정리하는 중이에요…</s.BlockBody>
          </Card>
        )}
        {modelReady && analysis.status === "failed" && (
          // 분석 실패: 요약 없이 기본 카드. 실패를 탓하지 않는 문장으로
          <s.Muted>
            이번 메시지는 정리하지 못했어요. 받은 메시지는 그대로 볼 수 있어요.
          </s.Muted>
        )}

        <Card>
          <s.BlockTitle>받은 메시지</s.BlockTitle>
          {messages.map(m => (
            <s.BlockBody key={m.id}>
              {m.truncated ? `${m.text}…` : m.text}
            </s.BlockBody>
          ))}
        </Card>
      </s.Cards>

      <s.Actions>
        {summaryReady ? (
          <Button variant="primary" fullWidth onPress={openCandidates}>
            답장 후보 살펴보기
          </Button>
        ) : (
          <Button variant="primary" fullWidth onPress={writeMyself}>
            직접 답장 쓰기
          </Button>
        )}
        {/* 알림에 앞부분만 온 메시지가 있을 때만 */}
        {truncated && (
          <Button
            variant="secondary"
            fullWidth
            onPress={() =>
              navigation.navigate("TruncatedMessage", { conversationId })
            }
          >
            메시지가 잘린 상태 보기
          </Button>
        )}
        <Button
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate("ReplyDefer", { conversationId })}
        >
          나중에 답하기
        </Button>
        {/* 친구로 연결된 1:1 대화만 → 05 / 14 친구 상세
            TODO(디자이너 공유): 08 시안에 없는 텍스트 버튼 */}
        {conversation.kind === "direct" && conversation.personId && (
          <Button
            variant="text"
            onPress={() =>
              navigation.navigate("FriendDetail", {
                personId: conversation.personId!,
              })
            }
          >
            친구 정보 보기
          </Button>
        )}
      </s.Actions>
    </AuthLayout>
  );
};

export default ConversationDetail;
