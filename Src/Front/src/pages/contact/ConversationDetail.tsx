import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import { UnderlineTabs } from "@core/ui/tabs";
import { useToast } from "@core/ui/toast";
import DeferSheet from "@components/contact/DeferSheet";
import LoadState from "@components/contact/LoadState";
import LongMessageNotice from "@components/contact/LongMessageNotice";
import ProfileCard from "@components/contact/ProfileCard";
import RelationTab from "@components/contact/RelationTab";
import ReplySection, {
  type ReplySendKind,
} from "@components/contact/ReplySection";
import ScheduleEmpty from "@components/contact/ScheduleEmpty";
import SummaryBlock from "@components/contact/SummaryBlock";
import TabScreen from "@components/main/TabScreen";
import { RELATION_OPTIONS } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useConversationDetail } from "@hooks/useConversationDetail";
import { useHomeHelp } from "@hooks/useHomeHelp";
import { useReplyFlow } from "@hooks/useReplyFlow";
import {
  appsOf,
  CONVERSATION_ERROR_CODE,
  getErrorCode,
  services,
  type ConversationDetail as Detail,
  type MessengerApp,
} from "@services";
import type { AppParamList } from "@routes/types";

// 05 연락 D03 연락 상세 (1:1) · D05 단체방 (Figma "05 연락 최종")
// 앱바: ← 가운데 "연락" + 🔔 / 프로필 카드 / 탭(최근 연락·관계·관련 일정)
// 최근 연락: 장문 안내(잘린 메시지가 있을 때) → 요약(원문 확인하기) → 답장하기
// 예전 08·09-A·09-B·09-C·10 화면을 이 한 화면의 구역으로 합침 (팀 확정)
type DetailTab = "recent" | "relation" | "schedule";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "recent", label: "최근 연락" },
  { key: "relation", label: "관계" },
  { key: "schedule", label: "관련 일정" },
];

interface ContactInfo {
  apps: MessengerApp[];
  phone: string | null;
  birthday: string | null;
}

interface SendDialogState {
  mode: "direct" | "messenger";
  kind: ReplySendKind;
  text: string;
}

const SEND_WORD: Record<ReplySendKind, string> = {
  selected: "선택한",
  edited: "수정한",
  written: "작성한",
};

// 시안 문구 그대로. "선택한 + 메신저 열기"만 설명 없음
const sendDialogText = ({ mode, kind }: SendDialogState) => {
  const word = SEND_WORD[kind];
  return mode === "direct"
    ? {
        title: `${word} 답장을 지금 바로 보내볼까요?`,
        description: "아래 버튼만 누르면 자동으로 답장이 보내져요.",
        confirmLabel: "바로 보내기",
      }
    : {
        title: `${word} 답장을 지금 보내볼까요?`,
        description:
          kind === "selected"
            ? undefined
            : `${word} 답장이 복사가 됐어요.\n메신저에 붙여넣어 답장을 보낼 수 있어요.`,
        confirmLabel: "메신저 열기",
      };
};

const ConversationDetail = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "ConversationDetail">>();
  const { conversationId } = params;
  const { state, retry, reload } = useConversationDetail(conversationId);

  const goBack = () => navigation.goBack();

  if (state.status !== "ready") {
    return (
      <TabScreen title="연락" onBack={goBack} divider={false} background="surface">
        <LoadState
          status={state.status}
          loadingLabel="연락을 불러오는 중"
          errorTitle="연락을 불러오지 못했어요"
          onRetry={retry}
        />
      </TabScreen>
    );
  }

  return (
    <DetailBody
      key={conversationId}
      detail={state.detail}
      onReload={reload}
      onLeave={goBack}
    />
  );
};

interface DetailBodyProps {
  detail: Detail;
  onReload: () => void;
  onLeave: () => void;
}

const DetailBody = ({ detail, onReload, onLeave }: DetailBodyProps) => {
  const navigation = useAuthNavigation();
  const toast = useToast();
  const { mode } = useHomeHelp();
  const { conversation, messages, analysis, lastMessage } = detail;
  const group = conversation.kind === "group";
  const [tab, setTab] = useState<DetailTab>("recent");
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  // null = 아직 확인 중
  const [direct, setDirect] = useState<boolean | null>(null);
  const [sendDialog, setSendDialog] = useState<SendDialogState | null>(null);
  const [deferOpen, setDeferOpen] = useState(false);
  const [deferSaving, setDeferSaving] = useState(false);
  const sending = useRef(false);

  // 알림의 바로 답장을 쓸 수 있는지 (보내기 팝업 종류)
  useEffect(() => {
    let alive = true;
    services.messenger
      .canReplyDirectly(conversation.id)
      .then(value => alive && setDirect(value))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [conversation.id]);

  const flow = useReplyFlow({
    conversationId: conversation.id,
    needsStance: analysis.tags.includes("question"),
    startWithWrite: mode === "write",
  });

  // 1:1 친구: 전화번호·생일·연결된 메신저 (TODO(06 친구): 기기 연락처와 연결)
  useEffect(() => {
    if (group || !conversation.personId) return;
    let alive = true;
    services.friends
      .get(conversation.personId)
      .then(friend => {
        if (!alive) return;
        const apps = appsOf(friend.accounts);
        setContact({
          apps: apps.length > 0 ? apps : [conversation.app],
          phone: friend.person.phone ?? null,
          birthday: friend.person.birthday ?? null,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [group, conversation.personId, conversation.app]);

  // 앱바 ←와 안드로이드 뒤로가기가 같은 동작: 답장 단계를 한 단계씩 되돌리고, 첫 단계면 나감
  const back = () => {
    if (tab === "recent" && flow.back()) return;
    onLeave();
  };
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () =>
        tab === "recent" ? flow.back() : false
      );
      return () => sub.remove();
    }, [tab, flow])
  );

  // 입력 상자 안 복사 아이콘 (시안에 토스트 없음, 팀 확정)
  const copy = async (text: string) => {
    try {
      await services.messenger.copyText(text.trim());
      toast.show("답장을 복사했어요");
      setCopied(true);
    } catch {
      toast.show("복사하지 못했어요. 다시 시도해 주세요");
    }
  };

  // 보내기 팝업 (Figma "Dialog_선택한 답장 복사하기 이후 메신저 열기 / 바로 보내기 팝업창")
  // - 바로 답장이 되는 대화: "바로 보내기" 팝업 (자동 전송 없음, 팝업에서 눌러야 보냄)
  // - 안 되는 대화: 누르는 순간 복사 → "메신저 열기" 팝업
  const send = async (text: string, kind: ReplySendKind) => {
    // 화면을 열자마자 눌러 아직 모르면 그때 확인
    const canDirect =
      direct ??
      (await services.messenger
        .canReplyDirectly(conversation.id)
        .catch(() => false));
    if (canDirect) {
      setSendDialog({ mode: "direct", kind, text });
      return;
    }
    try {
      await services.messenger.copyText(text.trim());
      setSendDialog({ mode: "messenger", kind, text });
    } catch {
      toast.show("복사하지 못했어요. 다시 시도해 주세요");
    }
  };

  // 팝업 버튼을 누른 뒤 (시안 없음, 팀 확정) TODO(Figma 문구 확인): 토스트 문구
  // 메신저 열기 → 앱을 열고, 돌아오면 "보냈다고 표시하기"
  const openMessenger = async () => {
    setSendDialog(null);
    setCopied(true);
    await services.messenger.openApp(conversation.app).catch(() => {});
  };

  // 바로 보내기 → 보낸 뒤 토스트 + 목록으로. 실패하면 토스트만 (상세에 남음)
  const sendDirectly = async () => {
    if (!sendDialog || sending.current) return;
    const text = sendDialog.text.trim();
    setSendDialog(null);
    sending.current = true;
    try {
      await services.messenger.sendReply(conversation.id, text);
    } catch (error) {
      sending.current = false;
      // 알림이 사라졌으면 다음부터는 메신저 열기 팝업으로
      if (getErrorCode(error) === CONVERSATION_ERROR_CODE.replyUnavailable) {
        setDirect(false);
      }
      toast.show("보내지 못했어요. 복사해서 메신저에서 보내 주세요");
      return;
    }
    // 보내기는 끝났으니 답장함 표시가 실패해도 보낸 것으로 안내
    await services.conversation.markReplied(conversation.id).catch(() => {});
    toast.show("답장을 보냈어요");
    navigation.popToTop();
  };

  // 나중에 답하기: 저장하면 시안대로 상세에 남고 토스트만 ("내일 오전 9시에 다시 알려드릴게요")
  // TODO(네이티브): 다시 알려 줄 때 로컬 알림 예약 (지금은 저장만)
  const defer = async (remindAt: Date, label: string) => {
    setDeferSaving(true);
    try {
      await services.conversation.deferReply(
        conversation.id,
        remindAt.toISOString()
      );
      toast.show(`${label}에 다시 알려드릴게요`);
    } catch {
      toast.show("잠시 문제가 생겼어요. 조금 뒤에 다시 해 주세요");
    } finally {
      setDeferSaving(false);
      setDeferOpen(false);
    }
  };

  // 메신저에서 보낸 뒤 사용자가 직접 표시 (앱은 실제로 보냈는지 알 수 없음)
  // "Figma와 다르게 간 부분"(팀 확정): 시안에 없지만 기존 텍스트 버튼으로 작게 남김
  const markSent = async () => {
    try {
      await services.conversation.markReplied(conversation.id);
      navigation.popToTop();
    } catch {
      toast.show("잠시 문제가 생겼어요. 조금 뒤에 다시 해 주세요");
    }
  };

  const relationLabel = RELATION_OPTIONS.find(
    o => o.value === conversation.relation
  )?.label;
  const truncated = messages.some(m => m.truncated);
  const summaryBody =
    analysis.status === "done" && analysis.summary
      ? analysis.summary
      : analysis.status === "pending"
      ? "정리하는 중이에요…"
      : lastMessage.text;

  // D05: 나를 언급한 메시지 (없으면 "나를 언급한 질문은 없어요", 디자이너 확인)
  const mentions = messages.filter(m =>
    analysis.highlightedMessageIds.includes(m.id)
  );
  const mentionBody = mentions.map(m => `${m.senderName}: ${m.text}`).join("\n");
  const replyNeeded = group && analysis.needsReply && mentions.length > 0;

  return (
    <TabScreen title="연락" onBack={back} divider={false} background="surface">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Top>
          <ProfileCard
            name={conversation.title}
            relationLabel={relationLabel}
            apps={contact?.apps ?? [conversation.app]}
            contact={
              group
                ? undefined
                : { phone: contact?.phone ?? null, birthday: contact?.birthday ?? null }
            }
          />
        </Top>
        <TabsSlot>
          <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
        </TabsSlot>

        {tab === "relation" && (
          <RelationTab conversation={conversation} onSaved={onReload} />
        )}
        {tab === "schedule" && <ScheduleEmpty name={conversation.title} />}
        {tab === "recent" && (
          <>
            {truncated && (
              <Block $top={12}>
                <LongMessageNotice
                  onPress={() =>
                    navigation.navigate("TruncatedMessage", {
                      conversationId: conversation.id,
                    })
                  }
                />
              </Block>
            )}

            {group ? (
              <>
                <Block $top={truncated ? 18 : 30}>
                  <BigTitle accessibilityRole="header">요약</BigTitle>
                </Block>
                <Block $top={4}>
                  <SummaryBlock
                    title="전체 대화"
                    titleSize="sub"
                    body={summaryBody}
                    app={conversation.app}
                    receivedAt={conversation.lastMessageAt}
                    messages={messages}
                  />
                </Block>
                <Block $top={20}>
                  <SummaryBlock
                    title="나를 언급한 내용"
                    titleSize="sub"
                    body={mentionBody || "나를 언급한 질문은 없어요"}
                    app={conversation.app}
                    receivedAt={
                      mentions.at(-1)?.receivedAt ?? conversation.lastMessageAt
                    }
                    messages={mentions}
                  />
                </Block>
                {replyNeeded && (
                  <>
                    <Block $top={20}>
                      <BigTitle accessibilityRole="header">요약</BigTitle>
                    </Block>
                    <Block $top={4}>
                      <SummaryBlock
                        title="답장 필요"
                        titleSize="sub"
                        cardTitle="직접 질문 건"
                        body={mentionBody}
                        app={conversation.app}
                        receivedAt={mentions.at(-1)!.receivedAt}
                        messages={mentions}
                      />
                    </Block>
                  </>
                )}
              </>
            ) : (
              <Block $top={truncated ? 18 : 30}>
                <SummaryBlock
                  title="요약"
                  titleSize="section"
                  body={summaryBody}
                  app={conversation.app}
                  receivedAt={conversation.lastMessageAt}
                  messages={messages}
                />
              </Block>
            )}

            <Block $top={20}>
              <ReplySection
                flow={flow}
                mode={mode}
                startLabel={replyNeeded ? "답장 필요 건에 답장하기" : "답장 추천 받기"}
                onDefer={() => setDeferOpen(true)}
                onCopy={copy}
                onSend={send}
              />
            </Block>
            {copied && (
              <Block $top={4}>
                <Button variant="text" onPress={markSent}>
                  보냈다고 표시하기
                </Button>
              </Block>
            )}
          </>
        )}
      </ScrollView>

      <DeferSheet
        visible={deferOpen}
        onClose={() => setDeferOpen(false)}
        onConfirm={defer}
        saving={deferSaving}
      />
      {sendDialog && (
        <Dialog
          visible
          {...sendDialogText(sendDialog)}
          onConfirm={sendDialog.mode === "direct" ? sendDirectly : openMessenger}
          onClose={() => setSendDialog(null)}
        />
      )}
    </TabScreen>
  );
};

const styles = StyleSheet.create({ content: { paddingBottom: 24 } });

const Top = styled.View`
  padding-top: 2px;
`;

const TabsSlot = styled.View`
  margin-top: 16px;
  padding: 0px 16px;
`;

const Block = styled.View<{ $top: number }>`
  margin-top: ${({ $top }) => $top}px;
`;

const BigTitle = styled.Text`
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default ConversationDetail;
