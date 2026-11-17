import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import { ChoiceGroup } from "@core/ui/choice";
import { Dialog, DialogDescription } from "@core/ui/dialog";
import { Field, Input } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import Notice from "@components/onboarding/Notice";
import { APP_LABEL, TONE_OPTIONS } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import {
  CONVERSATION_ERROR_CODE,
  getErrorCode,
  services,
  type ReplyTone,
} from "@services";
import type { RootStackParamList } from "@routes/router";
import * as s from "./Contact_styled";

// 04 / 10 답장 수정·말투 조절
// 자동 전송 없음. 보내는 방법은 두 가지
// - 복사하고 메신저 열기: 항상 보이는 기본 동작 (보낼지는 메신저에서 사용자가 정함)
// - 확인하고 보내기: 알림의 바로 답장이 가능할 때만 보이고, 누르면 확인 팝업을 꼭 거침
// 전송·복사·앱 열기는 mock (TODO(네이티브): MessengerService를 Kotlin 모듈로 교체)
type SendState = "idle" | "copied" | "sending" | "unavailable" | "error";

const ReplyEdit = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ReplyEdit">>();
  const { conversationId, stance } = params;
  // 말투 조절은 후보에서 왔을 때만 (직접 쓰기는 사용자가 쓴 문장을 바꾸지 않음)
  const fromCandidate = !!params.tone;

  const [text, setText] = useState(params.text);
  const [tone, setTone] = useState<ReplyTone | undefined>(params.tone);
  const [toneLoading, setToneLoading] = useState(false);
  const [toneError, setToneError] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    const [detail, direct] = await Promise.all([
      services.conversation.get(conversationId),
      services.messenger.canReplyDirectly(conversationId),
    ]);
    return { conversation: detail.conversation, direct };
  }, [conversationId]);
  const { state, retry } = useLoad(load);

  if (state.status !== "ready") {
    return (
      <AuthLayout title="답장 다듬기">
        <LoadState status={state.status} onRetry={retry} />
      </AuthLayout>
    );
  }

  const { conversation } = state.data;
  // 보내는 중 알림이 사라졌다고 확인되면 바로 보내기를 숨김
  const direct = state.data.direct && sendState !== "unavailable";
  const appName = APP_LABEL[conversation.app];
  const empty = !text.trim();
  const busy = sendState === "sending" || toneLoading;

  const changeTone = async (next: ReplyTone) => {
    if (next === tone) return;
    setTone(next);
    setToneLoading(true);
    setToneError(false);
    try {
      const candidates = await services.conversation.getReplyCandidates(
        conversationId,
        { tone: next, stance }
      );
      const found = candidates.find(c => c.tone === next);
      if (found) setText(found.text);
    } catch {
      setToneError(true);
    } finally {
      setToneLoading(false);
    }
  };

  const copyAndOpen = async () => {
    try {
      await services.messenger.copyText(text.trim());
      await services.messenger.openApp(conversation.app);
      setSendState("copied");
    } catch {
      setSendState("error");
    }
  };

  // 메신저에서 보낸 뒤 돌아와서 직접 표시 (앱은 실제로 보냈는지 알 수 없음)
  const markSent = async () => {
    try {
      await services.conversation.markReplied(conversationId);
      navigation.popTo("Home");
    } catch {
      setSendState("error");
    }
  };

  const sendDirectly = async () => {
    setConfirmOpen(false);
    setSendState("sending");
    try {
      await services.messenger.sendReply(conversationId, text.trim());
      await services.conversation.markReplied(conversationId);
      navigation.popTo("Home");
    } catch (error) {
      setSendState(
        getErrorCode(error) === CONVERSATION_ERROR_CODE.replyUnavailable
          ? "unavailable"
          : "error"
      );
    }
  };

  return (
    <AuthLayout title="답장 다듬기" gap={12} paddingBottom={32}>
      <AuthIntro
        title={
          fromCandidate
            ? "보내기 전에 말투를 다듬어보세요"
            : "편하게 답장을 써 보세요"
        }
        description={
          fromCandidate
            ? stance
              ? "입장은 유지하고 표현만 편하게 바꿀 수 있어요."
              : "표현은 마음에 들게 얼마든지 바꿔도 괜찮아요."
            : "짧은 한마디여도 충분해요. 보내기 전에 한 번 더 확인해요."
        }
      />

      <s.Cards>
        <Field label="답장 내용">
          <Input
            value={text}
            onChangeText={setText}
            placeholder="하고 싶은 말을 적어 주세요"
            multiline
            textAlignVertical="top"
            accessibilityLabel="답장 내용"
            style={styles.editor}
            editable={!busy}
          />
        </Field>

        {fromCandidate && (
          <Card>
            <s.BlockTitle>말투 조절</s.BlockTitle>
            <s.Muted>말투를 바꾸면 문장이 새로 바뀌어요.</s.Muted>
            <s.Actions>
              <ChoiceGroup
                shape="chip"
                options={TONE_OPTIONS}
                value={tone}
                onChange={changeTone}
                disabled={busy}
              />
            </s.Actions>
            {toneError && (
              <s.Muted>
                말투를 바꾸지 못했어요. 지금 문장은 그대로 두었어요.
              </s.Muted>
            )}
          </Card>
        )}
      </s.Cards>

      {sendState === "copied" && (
        <Notice tone="success" title="답장을 복사했어요">
          <s.Muted>{`${appName}에서 붙여 넣어 보내 주세요. 보냈다면 아래에서 표시해 둘 수 있어요.`}</s.Muted>
          <Button variant="text" onPress={markSent}>
            보냈다고 표시하기
          </Button>
        </Notice>
      )}
      {sendState === "unavailable" && (
        <Notice title="알림이 사라져서 여기서 바로 보내지 못했어요">
          복사해서 메신저에서 보내 주세요. 내용은 그대로 남아 있어요.
        </Notice>
      )}
      {sendState === "error" && (
        <Notice
          tone="danger"
          title="잠시 문제가 생겼어요. 조금 뒤에 다시 해 주세요."
        />
      )}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          disabled={empty || busy}
          accessibilityHint={
            empty ? "답장 내용을 적으면 누를 수 있어요" : undefined
          }
          onPress={copyAndOpen}
        >
          {`복사하고 ${appName} 열기`}
        </Button>
        {direct ? (
          <Button
            variant="secondary"
            fullWidth
            disabled={empty || busy}
            accessibilityState={{
              busy: sendState === "sending",
              disabled: empty || busy,
            }}
            onPress={() => setConfirmOpen(true)}
          >
            {sendState === "sending" ? "보내는 중…" : "확인하고 보내기"}
          </Button>
        ) : (
          sendState !== "unavailable" && (
            // 바로 답장이 안 되면 버튼을 숨기고 이유만 알려 줌
            <s.Hint>알림이 남아 있지 않아 여기서 바로 보낼 수는 없어요.</s.Hint>
          )
        )}
        <Button
          variant="secondary"
          fullWidth
          disabled={busy}
          onPress={() => navigation.navigate("ReplyDefer", { conversationId })}
        >
          나중에 답하기
        </Button>
      </s.Actions>

      {/* 바로 보내기 전 확인 팝업 (필수) */}
      <Dialog
        visible={confirmOpen}
        icon={null}
        title="이 답장을 보낼까요?"
        description={`${conversation.title}에게 ${appName} 알림으로 바로 보내요.`}
        confirmLabel="보내기"
        onConfirm={sendDirectly}
        closeLabel="조금 더 볼게요"
        onClose={() => setConfirmOpen(false)}
      >
        <DialogDescription>{`“${text.trim()}”`}</DialogDescription>
      </Dialog>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  // 여러 줄 답장 입력 (Figma 10 큰 회색 상자 약 150dp)
  editor: { height: 150, paddingTop: 12 },
});

export default ReplyEdit;
