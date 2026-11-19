import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { services, type ConversationSummary } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";

export type ConversationsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ConversationSummary[] };

// 홈·연락 목록 공통: 화면에 올 때마다 다시 불러오고(답장·미루기 반영),
// 가리기 모델이 준비돼 있으면 분석 중(pending)인 대화를 분석함
export const useConversations = () => {
  const { model } = useOnboarding();
  const modelReady = model.status === "done";
  const [state, setState] = useState<ConversationsState>({ status: "loading" });
  const loadedOnce = useRef(false);
  const analyzing = useRef(new Set<string>());

  const load = useCallback(async () => {
    // 처음에만 로딩 화면, 다시 불러올 때는 이전 목록을 그대로 보여 줌
    if (!loadedOnce.current) setState({ status: "loading" });
    try {
      const items = await services.conversation.list();
      loadedOnce.current = true;
      setState({ status: "ready", items });
    } catch {
      if (!loadedOnce.current) setState({ status: "error" });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const retry = useCallback(() => {
    loadedOnce.current = false;
    load();
  }, [load]);

  // 분석 중인 대화 → 모델이 있으면 분석 요청, 끝나면 그 카드만 바꿈
  useEffect(() => {
    if (!modelReady || state.status !== "ready") return;
    state.items
      .filter(
        item =>
          item.analysis.status === "pending" &&
          !analyzing.current.has(item.conversation.id)
      )
      .forEach(item => {
        const id = item.conversation.id;
        analyzing.current.add(id);
        services.conversation
          .analyze(id)
          .then(analysis =>
            setState(prev =>
              prev.status === "ready"
                ? {
                    status: "ready",
                    items: prev.items.map(it =>
                      it.conversation.id === id ? { ...it, analysis } : it
                    ),
                  }
                : prev
            )
          )
          .catch(() => {})
          .finally(() => analyzing.current.delete(id));
      });
  }, [modelReady, state]);

  return { state, modelReady, retry, reload: load };
};
