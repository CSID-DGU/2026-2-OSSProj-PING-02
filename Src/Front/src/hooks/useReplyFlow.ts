import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONVERSATION_ERROR_CODE,
  getErrorCode,
  services,
  type ReplyCandidate,
  type ReplyStance,
  type ReplyTone,
} from "@services";

// 05 연락 D03 "답장하기" 구역의 단계 (한 화면 안에서 바뀜, 뒤로가기는 한 단계씩)
// 시작 → (결정·질문이 있으면) 입장 → 말투 → 완성 답장 후보 → 수정 / 직접 쓰기
// - 미완료(loading): 답장을 아직 준비 중 → "아직 말씨가 답장을 준비하고 있어요." + 직접 답장 쓰기
// - 실패(failed): 같은 그림 + 다시 시도하기 / 직접 답장 쓰기
// - 도움 수준 "직접 쓰기"면 처음부터 직접 쓰기 (디자이너 확인)
export type ReplyFlowStep =
  | { kind: "start" }
  | { kind: "stance"; selected?: ReplyStance }
  | { kind: "loading"; stance?: ReplyStance }
  | { kind: "failed"; stance?: ReplyStance }
  | {
      kind: "tone";
      stance?: ReplyStance;
      candidates: ReplyCandidate[];
      selected?: ReplyTone;
    }
  | {
      kind: "candidates";
      stance?: ReplyStance;
      tone: ReplyTone;
      candidates: ReplyCandidate[];
      selectedIndex: number;
    }
  | { kind: "edit"; source: "candidate" | "write"; text: string };

interface Options {
  conversationId: string;
  // 결정·질문이 있는 메시지면 말투 전에 입장 먼저 (디자이너 확인)
  needsStance: boolean;
  startWithWrite: boolean;
}

export const useReplyFlow = ({
  conversationId,
  needsStance,
  startWithWrite,
}: Options) => {
  const [history, setHistory] = useState<ReplyFlowStep[]>(() => [
    startWithWrite
      ? { kind: "edit", source: "write", text: "" }
      : { kind: "start" },
  ]);
  const request = useRef(0);
  const step = history[history.length - 1];

  // 도움 수준은 저장소에서 늦게 읽혀서, 아직 시작 단계면 그때 직접 쓰기로 바꿈
  useEffect(() => {
    if (!startWithWrite) return;
    setHistory(h =>
      h.length === 1 && h[0].kind === "start"
        ? [{ kind: "edit", source: "write", text: "" }]
        : h
    );
  }, [startWithWrite]);

  const push = useCallback(
    (next: ReplyFlowStep) => setHistory(h => [...h, next]),
    []
  );
  const replace = useCallback(
    (next: ReplyFlowStep) => setHistory(h => [...h.slice(0, -1), next]),
    []
  );

  // 말투 단계에서 쓸 답장 후보를 불러옴 (불러오는 동안 미완료 모양)
  // 서비스는 고른 말투가 먼저인 3개(짧게·다정하게·공손하게)를 줌
  const loadTones = useCallback(
    async (stance: ReplyStance | undefined, mode: "push" | "replace") => {
      const id = ++request.current;
      (mode === "push" ? push : replace)({ kind: "loading", stance });
      try {
        const candidates = await services.conversation.getReplyCandidates(
          conversationId,
          { tone: "short", stance }
        );
        if (id !== request.current) return;
        if (candidates.length === 0) throw new Error("empty");
        replace({ kind: "tone", stance, candidates });
      } catch (error) {
        if (id !== request.current) return;
        // 화면 갈래(입장 먼저 / 말투 바로)와 AI의 결정 판단이 엇갈림 (#81) → 맞는 갈래로 바꿔 감
        if (getErrorCode(error) === CONVERSATION_ERROR_CODE.replyStepMismatch) {
          if (stance) {
            // 입장이 필요 없는 메시지 → 입장 단계를 빼고 입장 없이 말투로 (뒤로가기는 시작으로)
            setHistory(h => h.filter(s => s.kind !== "stance"));
            loadTones(undefined, "replace");
          } else {
            // 수락·보류·거절을 정해야 하는 메시지 → 불러오던 자리를 입장 고르기로
            replace({ kind: "stance" });
          }
          return;
        }
        replace({ kind: "failed", stance });
      }
    },
    [conversationId, push, replace]
  );

  const start = () =>
    needsStance ? push({ kind: "stance" }) : loadTones(undefined, "push");

  const chooseStance = (stance: ReplyStance) => {
    replace({ kind: "stance", selected: stance });
    loadTones(stance, "push");
  };

  const retry = () => {
    if (step.kind === "failed") loadTones(step.stance, "replace");
  };

  const chooseTone = (tone: ReplyTone) => {
    if (step.kind !== "tone") return;
    const chosen = step.candidates.filter(c => c.tone === tone);
    const others = step.candidates.filter(c => c.tone !== tone);
    replace({ ...step, selected: tone });
    push({
      kind: "candidates",
      stance: step.stance,
      tone,
      candidates: [...chosen, ...others],
      selectedIndex: 0,
    });
  };

  const selectCandidate = (index: number) => {
    if (step.kind === "candidates") replace({ ...step, selectedIndex: index });
  };

  const editSelected = () => {
    if (step.kind !== "candidates") return;
    push({
      kind: "edit",
      source: "candidate",
      text: step.candidates[step.selectedIndex].text,
    });
  };

  const writeMyself = () => push({ kind: "edit", source: "write", text: "" });

  const setText = (text: string) => {
    if (step.kind === "edit") replace({ ...step, text });
  };

  // 앱바 ←·안드로이드 뒤로가기: 한 단계 앞으로. 첫 단계면 false (화면을 나감)
  const back = () => {
    if (history.length <= 1) return false;
    request.current += 1; // 불러오던 후보는 버림
    setHistory(h => h.slice(0, -1));
    return true;
  };

  return {
    step,
    canGoBack: history.length > 1,
    start,
    chooseStance,
    retry,
    chooseTone,
    selectCandidate,
    editSelected,
    writeMyself,
    setText,
    back,
  };
};

export type ReplyFlow = ReturnType<typeof useReplyFlow>;
