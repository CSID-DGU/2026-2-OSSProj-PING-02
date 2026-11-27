import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { services, type ConversationSummary } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import { useAppForeground } from "./useAppForeground";

export type ConversationsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ConversationSummary[] };

/** 새 메시지 이벤트가 몰려 올 때(단톡 등) 이 시간 안의 것은 한 번만 다시 읽음 */
export const RELOAD_BATCH_MS = 500;

// 홈·연락 목록 공통: 화면에 올 때마다 다시 불러오고(답장·미루기 반영),
// 가리기 모델이 준비돼 있으면 분석 중(pending)인 대화를 분석함
// 화면이 보이는 동안에는 새 메시지가 저장되거나 앱이 앞으로 올 때도 다시 불러옴 (#71)
// - 다시 불러올 때는 로딩 없이 이전 목록을 둔 채 내용만 바꿈. 기기 DB만 읽고 AI는 부르지 않음
export const useConversations = () => {
  const { model } = useOnboarding();
  const modelReady = model.status === "done";
  const [state, setState] = useState<ConversationsState>({ status: "loading" });
  const loadedOnce = useRef(false);
  const analyzing = useRef(new Set<string>());
  const focused = useRef(false);
  // 여러 번 겹쳐 불렀을 때 늦게 끝난 옛 결과가 새 결과를 덮지 않게
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const seq = ++latestLoad.current;
    // 처음에만 로딩 화면, 다시 불러올 때는 이전 목록을 그대로 보여 줌
    if (!loadedOnce.current) setState({ status: "loading" });
    try {
      const items = await services.conversation.list();
      if (seq !== latestLoad.current) return;
      loadedOnce.current = true;
      setState({ status: "ready", items });
    } catch {
      if (seq !== latestLoad.current) return;
      if (!loadedOnce.current) setState({ status: "error" });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      load();
      // 새 메시지 저장 이벤트: 첫 이벤트부터 RELOAD_BATCH_MS 안에 온 것은 한 번으로 묶음
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unsubscribe = services.conversation.onChange(() => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = undefined;
          load();
        }, RELOAD_BATCH_MS);
      });
      return () => {
        focused.current = false;
        unsubscribe();
        if (timer) clearTimeout(timer);
      };
    }, [load])
  );

  // 다른 앱을 쓰다 돌아왔을 때 (그 사이 저장된 메시지 반영)
  useAppForeground(() => {
    if (focused.current) load();
  });

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
