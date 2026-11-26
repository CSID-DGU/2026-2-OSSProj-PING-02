import type { ConversationSummary } from "../src/services";
import {
  selectDeferredToday,
  selectMustCheck,
  selectUpcomingEvent,
} from "../src/utils/home";

// 04 홈 선택 규칙 (기기 안 규칙)
const item = (
  id: string,
  minutesAgo: number,
  text: string,
  extra: Partial<ConversationSummary> = {}
): ConversationSummary => {
  const at = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return {
    conversation: {
      id,
      app: "SMS",
      kind: "direct",
      title: id,
      personId: null,
      lastMessageAt: at,
    },
    lastMessage: {
      id: `${id}-m`,
      conversationId: id,
      accountId: null,
      senderName: id,
      text,
      receivedAt: at,
      truncated: false,
    },
    analysis: {
      conversationId: id,
      status: "done",
      needsReply: true,
      mentionsMe: false,
      tags: [],
      priority: "high",
      highlightedMessageIds: [],
    },
    replied: false,
    ...extra,
  };
};

test("꼭 챙길 연락: 광고 제외, 기관 연락은 남김, 최신순 최대 3개", () => {
  const list = [
    item("old", 300, "서류 마감이 이번주 금요일이에요"),
    item("ad", 1, "(광고) 오늘만 50% 할인! 무료거부 080-000-0000"),
    item("welfare", 10, "[Web발신] 복지관 서류 제출 안내"),
    item("new", 5, "주말에 잠깐 볼래?"),
    item("mid", 60, "내일 몇 시에 볼까?"),
  ];
  expect(selectMustCheck(list).map(i => i.conversation.id)).toEqual([
    "new",
    "welfare",
    "mid",
  ]);
});

test("미뤄둔 답장: 오늘(또는 지난) 다시 보기로 한 것만", () => {
  const deferred = (id: string, remindAt: string | null) =>
    item(id, 10, "…", {
      deferred: { id: `d-${id}`, conversationId: id, remindAt, topic: "", createdAt: "" },
    });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const list = [
    deferred("today", new Date().toISOString()),
    deferred("tomorrow", tomorrow.toISOString()),
    deferred("noDate", null),
  ];
  expect(selectDeferredToday(list).map(i => i.conversation.id)).toEqual([
    "today",
  ]);
});

test("다가오는 일정: 지난 일정은 빼고 가장 가까운 것", () => {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString();
  };
  const ev = (id: string, offset: number) => ({
    id,
    conversationId: "c",
    kind: "occasion" as const,
    title: id,
    date: day(offset),
  });
  expect(
    selectUpcomingEvent([ev("past", -2), ev("far", 10), ev("near", 1)])?.id
  ).toBe("near");
});
