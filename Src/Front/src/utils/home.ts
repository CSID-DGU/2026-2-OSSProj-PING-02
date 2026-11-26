import { startOfDay } from "@core/ui/calendar";
import { isAdMessage } from "@services/ai/classifyMessage";
import type { ContactEvent, ConversationSummary } from "@services";

// 04 홈·도움 수준 화면이 같이 쓰는 선택 규칙 (모두 기기 안 규칙, AI 호출 없음)

export const MUST_CHECK_MAX = 3;

// 꼭 챙길 연락: 중요 + 답장 필요 + 아직 답하지 않음·미루지 않음, 광고 제외, 최신순 최대 3개
// (기관 연락은 광고가 아니면 남김. Figma 디자이너 댓글: 최신순, 광고가 들어가지 않게)
export const selectMustCheck = (items: ConversationSummary[]) =>
  items
    .filter(
      i =>
        i.analysis.status === "done" &&
        i.analysis.priority === "high" &&
        i.analysis.needsReply &&
        !i.replied &&
        !i.deferred &&
        !isAdMessage(i.lastMessage.text)
    )
    .sort((a, b) =>
      b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt)
    )
    .slice(0, MUST_CHECK_MAX);

// 카드에 보여 줄 요약: 저장된 요약이 있으면 요약, 없으면 마지막 메시지
// (AI는 대화방을 열 때만 부르므로 목록에서는 요약이 없을 수 있음)
export const summaryOf = (item: ConversationSummary) =>
  item.analysis.summary ?? item.lastMessage.text;

// 미뤄둔 답장 중 오늘(또는 이미 지난) 다시 보기로 한 것
export const selectDeferredToday = (
  items: ConversationSummary[],
  now = new Date()
) => {
  const end = startOfDay(now).getTime() + 24 * 60 * 60 * 1000;
  return items.filter(
    i =>
      i.deferred?.remindAt && new Date(i.deferred.remindAt).getTime() < end
  );
};

// 단체방 요약 카드: 요약이 있는 가장 최근 단체방 하나
export const selectGroupSummary = (items: ConversationSummary[]) =>
  items
    .filter(
      i =>
        i.conversation.kind === "group" &&
        i.analysis.status === "done" &&
        !!i.analysis.summary
    )
    .sort((a, b) =>
      b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt)
    )[0];

// 다가오는 일정: 오늘 이후 가장 가까운 일정 하나
export const selectUpcomingEvent = (events: ContactEvent[], now = new Date()) =>
  events
    .filter(e => new Date(e.date).getTime() >= startOfDay(now).getTime())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
