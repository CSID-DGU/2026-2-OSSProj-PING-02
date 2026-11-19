import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  services,
  type Conversation,
  type ConversationDetail,
} from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import { useAuthNavigation } from "./useAuthNavigation";

export type ConversationDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; detail: ConversationDetail };

// 08 연락 상세·09 답장 후보 화면 공통: 대화 하나를 불러오고,
// 가리기 모델이 있는데 분석 중(pending)이면 분석을 요청함
export const useConversationDetail = (conversationId: string) => {
  const { model } = useOnboarding();
  const modelReady = model.status === "done";
  const [state, setState] = useState<ConversationDetailState>({
    status: "loading",
  });
  const loadedOnce = useRef(false);
  const analyzing = useRef(false);

  const load = useCallback(async () => {
    if (!loadedOnce.current) setState({ status: "loading" });
    try {
      const detail = await services.conversation.get(conversationId);
      loadedOnce.current = true;
      setState({ status: "ready", detail });
    } catch {
      if (!loadedOnce.current) setState({ status: "error" });
    }
  }, [conversationId]);

  // 다른 화면(11 나중에 답하기 등)에서 돌아오면 다시 불러옴
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const retry = useCallback(() => {
    loadedOnce.current = false;
    load();
  }, [load]);

  const pending =
    state.status === "ready" && state.detail.analysis.status === "pending";

  useEffect(() => {
    if (!modelReady || !pending || analyzing.current) return;
    analyzing.current = true;
    services.conversation
      .analyze(conversationId)
      .then(analysis =>
        setState(prev =>
          prev.status === "ready"
            ? { status: "ready", detail: { ...prev.detail, analysis } }
            : prev
        )
      )
      .catch(() => {})
      .finally(() => {
        analyzing.current = false;
      });
  }, [modelReady, pending, conversationId]);

  return { state, modelReady, retry, reload: load };
};

// 연락 카드를 눌렀을 때: 단톡은 08을 건너뛰고 09-C로, 1:1은 08 연락 상세로
export const useOpenConversation = () => {
  const navigation = useAuthNavigation();
  return useCallback(
    (conversation: Conversation) =>
      navigation.navigate(
        conversation.kind === "group" ? "ReplyGroup" : "ConversationDetail",
        { conversationId: conversation.id }
      ),
    [navigation]
  );
};
