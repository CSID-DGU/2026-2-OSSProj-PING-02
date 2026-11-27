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
  appsOf,
  CONVERSATION_ERROR_CODE,
  getErrorCode,
  services,
  type MessengerApp,
  type ReplyTone,
} from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "./Contact_styled";

// 04 / 10 답장 수정·말투 조절 (05 / 15 첫마디도 이 화면에서 다듬음)
// 자동 전송 없음. 보내는 방법은 두 가지
// - 복사하고 메신저 열기: 항상 보이는 기본 동작 (보낼지는 메신저에서 사용자가 정함)
// - 확인하고 보내기: 알림의 바로 답장이 가능할 때만 보이고, 누르면 확인 팝업을 꼭 거침
// 친구에게 먼저 보내는 첫마디는 받은 알림이 없어서 복사하고 메신저 열기만 (나중에 답하기도 없음)
// 전송·복사·앱 열기는 mock (TODO(네이티브): MessengerService를 Kotlin 모듈로 교체)
type SendState = "idle" | "copied" | "sending" | "unavailable" | "error";

const ReplyEdit = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "ReplyEdit">>();
  const conversationId =
    "conversationId" in params ? params.conversationId : undefined;
  const personId = "personId" in params ? params.personId : undefined;
  const stance = "stance" in params ? params.stance : undefined;
  // 말투 조절은 후보에서 왔을 때만 (직접 쓰기·첫마디는 사용자가 고른 문장을 바꾸지 않음)
  const fromCandidate = "tone" in params && !!params.tone;

  const [text, setText] = useState(params.text);
  const [tone, setTone] = useState<ReplyTone | undefined>(
    "tone" in params ? params.tone : undefined
  );
  const [app, setApp] = useState<MessengerApp>();
  const [toneLoading, setToneLoading] = useState(false);
  const [toneError, setToneError] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    if (personId) {
      const friend = await services.friends.get(personId);
      return {
        name: friend.person.displayName,
        apps: appsOf(friend.accounts),
        direct: false,
      };
    }
    const id = conversationId!;
    const [detail, direct] = await Promise.all([
      services.conversation.get(id),
      services.messenger.canReplyDirectly(id),
    ]);
    return {
      name: detail.conversation.title,
      apps: [detail.conversation.app],
      direct,
    };
  }, [conversationId, personId]);
  const { state, retry } = useLoad(load);

  const screenTitle = personId ? "첫마디 다듬기" : "답장 다듬기";

  if (state.status !== "ready") {
    return (
      <AuthLayout title={screenTitle}>
        <LoadState status={state.status} onRetry={retry} />
      </AuthLayout>
    );
  }

  const { name, apps } = state.data;
  // 보내는 중 알림이 사라졌다고 확인되면 바로 보내기를 숨김
  const direct = state.data.direct && sendState !== "unavailable";
  // 친구의 계정이 여러 앱에 있으면 보낼 앱을 고름 (기본은 첫 번째)
  const chosenApp = app ?? apps[0];
  const appName = chosenApp ? APP_LABEL[chosenApp] : undefined;
  const empty = !text.trim();
  const busy = sendState === "sending" || toneLoading;

  const changeTone = async (next: ReplyTone) => {
    if (next === tone || !conversationId) return;
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
      if (chosenApp) await services.messenger.openApp(chosenApp);
      setSendState("copied");
    } catch {
      setSendState("error");
    }
  };

  // 메신저에서 보낸 뒤 돌아와서 직접 표시 (앱은 실제로 보냈는지 알 수 없음)
  const markSent = async () => {
    try {
      if (personId) {
        await services.friends.markContacted(personId);
        // 06 E05에서 고른 친구: 친구 고르기 화면으로 (마지막 연락 시간이 오늘로 바뀐 것이 보임)
        navigation.popTo("FirstWordsPick");
      } else {
        await services.conversation.markReplied(conversationId!);
        navigation.popToTop();
      }
    } catch {
      setSendState("error");
    }
  };

  const sendDirectly = async () => {
    if (!conversationId) return;
    setConfirmOpen(false);
    setSendState("sending");
    try {
      await services.messenger.sendReply(conversationId, text.trim());
      await services.conversation.markReplied(conversationId);
      navigation.popToTop();
    } catch (error) {
      setSendState(
        getErrorCode(error) === CONVERSATION_ERROR_CODE.replyUnavailable
          ? "unavailable"
          : "error"
      );
    }
  };

  const intro = personId
    ? {
        title: empty ? "편하게 첫마디를 써 보세요" : "첫마디를 편하게 다듬어 보세요",
        description: "짧은 한마디여도 충분해요. 보낼지는 메신저에서 천천히 정해도 괜찮아요.",
      }
    : fromCandidate
    ? {
        title: "보내기 전에 말투를 다듬어보세요",
        description: stance
          ? "입장은 유지하고 표현만 편하게 바꿀 수 있어요."
          : "표현은 마음에 들게 얼마든지 바꿔도 괜찮아요.",
      }
    : {
        title: "편하게 답장을 써 보세요",
        description: "짧은 한마디여도 충분해요. 보내기 전에 한 번 더 확인해요.",
      };

  return (
    <AuthLayout title={screenTitle} gap={12} paddingBottom={32}>
      <AuthIntro title={intro.title} description={intro.description} />

      <s.Cards>
        <Field label={personId ? "첫마디 내용" : "답장 내용"}>
          <Input
            value={text}
            onChangeText={setText}
            placeholder="하고 싶은 말을 적어 주세요"
            multiline
            textAlignVertical="top"
            accessibilityLabel={personId ? "첫마디 내용" : "답장 내용"}
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

        {apps.length > 1 && chosenApp && (
          <Field label="어디로 보낼까요?">
            <ChoiceGroup
              shape="chip"
              options={apps.map(a => ({ value: a, label: APP_LABEL[a] }))}
              value={chosenApp}
              onChange={next => {
                setApp(next);
                if (sendState === "copied") setSendState("idle");
              }}
              disabled={busy}
            />
          </Field>
        )}
      </s.Cards>

      {sendState === "copied" && (
        <Notice tone="success" title={personId ? "첫마디를 복사했어요" : "답장을 복사했어요"}>
          <s.Muted>{`${appName ?? "메신저"}에서 붙여 넣어 보내 주세요. 보냈다면 아래에서 표시해 둘 수 있어요.`}</s.Muted>
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
            empty ? "내용을 적으면 누를 수 있어요" : undefined
          }
          onPress={copyAndOpen}
        >
          {appName ? `복사하고 ${appName} 열기` : "복사하기"}
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
          // 첫마디는 받은 알림이 없으니 안내하지 않음
          !personId &&
          sendState !== "unavailable" && (
            // 바로 답장이 안 되면 버튼을 숨기고 이유만 알려 줌
            <s.Hint>알림이 남아 있지 않아 여기서 바로 보낼 수는 없어요.</s.Hint>
          )
        )}
        {conversationId && (
          <Button
            variant="secondary"
            fullWidth
            disabled={busy}
            onPress={() => navigation.navigate("ReplyDefer", { conversationId })}
          >
            나중에 답하기
          </Button>
        )}
      </s.Actions>

      {/* 바로 보내기 전 확인 팝업 (필수) */}
      <Dialog
        visible={confirmOpen}
        icon={null}
        title="이 답장을 보낼까요?"
        description={`${name}에게 ${appName} 알림으로 바로 보내요.`}
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
