import type {
  Analysis,
  Conversation,
  ContactEvent,
  Message,
  ReplyStance,
  ReplyTone,
} from "./types";

// mock 연락 데이터: 홈·연락 화면의 모든 상태를 볼 수 있게 구성
// - 1:1 질문(민지), 경조사(서연 선배), 마감 임박(상담센터), 조금 지난 안부(하늘), 축하(준호)
// - 단톡: 정보만(대학교 친구들), 나를 언급한 질문(긴 방 이름)
// - 분석 중(예린) → 화면에서 analyze 호출 시 완료, 분석 실패(시우), 잘린 메시지(민지)
const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const later = (days: number, hour: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const MY_NAME = "말씨";

interface Seed {
  conversation: Conversation;
  messages: Message[];
  analysis: Analysis;
  events?: ContactEvent[];
}

const msg = (
  conversationId: string,
  n: number,
  senderName: string,
  text: string,
  minutesAgo: number,
  truncated = false
): Message => ({
  id: `${conversationId}-m${n}`,
  conversationId,
  accountId: `${conversationId}-${senderName}`,
  senderName,
  text,
  receivedAt: ago(minutesAgo),
  truncated,
});

const done = (
  conversationId: string,
  rest: Omit<Analysis, "conversationId" | "status" | "highlightedMessageIds"> &
    Partial<Pick<Analysis, "highlightedMessageIds">>
): Analysis => ({
  conversationId,
  status: "done",
  highlightedMessageIds: [],
  ...rest,
});

export const SEEDS: Seed[] = [
  {
    conversation: {
      id: "minji",
      app: "KAKAOTALK",
      kind: "direct",
      title: "민지",
      personId: "p-minji",
      lastMessageAt: ago(60),
    },
    messages: [
      msg(
        "minji",
        1,
        "민지",
        "오랜만이야. 요즘 어떻게 지내? 이번 주말에 시간 괜찮으면 같이 밥 먹을래? 성수에 새로 생긴 곳이 있는데",
        60,
        true
      ),
    ],
    analysis: done("minji", {
      summary: "민지가 이번 주말에 만날 수 있는지 물었어요.",
      needsReply: true,
      mentionsMe: false,
      tags: ["question"],
      priority: "normal",
    }),
  },
  {
    conversation: {
      id: "seoyeon",
      app: "KAKAOTALK",
      kind: "direct",
      title: "김서연 선배",
      personId: "p-seoyeon",
      lastMessageAt: ago(60 * 5),
    },
    messages: [
      msg(
        "seoyeon",
        1,
        "김서연 선배",
        "오랜만이야! 12월 12일 오후 1시에 결혼식을 올려. 시간 괜찮으면 와서 축하해주면 좋겠어!",
        60 * 5
      ),
    ],
    analysis: done("seoyeon", {
      summary: "서연 선배가 12월 12일 오후 1시 결혼식에 초대했어요.",
      needsReply: true,
      mentionsMe: false,
      tags: ["occasion", "question"],
      priority: "high",
      highlight: "12월 12일 오후 1시 결혼식",
    }),
    events: [
      {
        id: "e-wedding",
        conversationId: "seoyeon",
        kind: "occasion",
        title: "서연 선배 결혼식",
        date: later(20, 13),
      },
    ],
  },
  {
    conversation: {
      id: "clinic",
      app: "SMS",
      kind: "direct",
      title: "마음숲 상담센터",
      personId: null,
      lastMessageAt: ago(60 * 3),
    },
    messages: [
      msg(
        "clinic",
        1,
        "마음숲 상담센터",
        "내일 오전 10시 상담 예약이 있어요. 변경이 필요하시면 오늘 오후 6시까지 회신 부탁드립니다.",
        60 * 3
      ),
    ],
    analysis: done("clinic", {
      summary:
        "내일 오전 10시 상담 예약 확인 문자예요. 변경은 오늘 오후 6시까지예요.",
      needsReply: true,
      mentionsMe: false,
      tags: ["deadline", "question"],
      priority: "high",
      highlight: "내일 오전 10시 상담 · 변경은 오늘 6시까지",
    }),
    events: [
      {
        id: "e-clinic",
        conversationId: "clinic",
        kind: "appointment",
        title: "상담 예약",
        date: later(1, 10),
      },
    ],
  },
  {
    conversation: {
      id: "haneul",
      app: "INSTAGRAM",
      kind: "direct",
      title: "하늘",
      personId: "p-haneul",
      lastMessageAt: ago(60 * 24 * 5),
    },
    messages: [
      msg(
        "haneul",
        1,
        "하늘",
        "요즘 뭐하고 지내? 갑자기 생각나서 연락해봤어 ㅎㅎ",
        60 * 24 * 5
      ),
    ],
    analysis: done("haneul", {
      summary: "하늘이 안부를 물었어요.",
      needsReply: true,
      mentionsMe: false,
      tags: ["greeting"],
      priority: "high",
      highlight: "반가운 안부예요. 편할 때 한마디면 충분해요",
    }),
  },
  {
    conversation: {
      id: "junho",
      app: "KAKAOTALK",
      kind: "direct",
      title: "준호",
      personId: "p-junho",
      lastMessageAt: ago(60 * 26),
    },
    messages: [msg("junho", 1, "준호", "생일 축하해! 잘 지내지?", 60 * 26)],
    analysis: done("junho", {
      summary: "준호가 생일 축하 메시지를 보냈어요.",
      needsReply: true,
      mentionsMe: false,
      tags: ["greeting"],
      priority: "normal",
    }),
  },
  {
    conversation: {
      id: "yerin",
      app: "KAKAOTALK",
      kind: "direct",
      title: "예린",
      personId: "p-yerin",
      lastMessageAt: ago(10),
    },
    messages: [
      msg(
        "yerin",
        1,
        "예린",
        "이번 달 스터디 회비 보냈어? 나 이번 주에 정리하려고!",
        10
      ),
    ],
    // 분석 중: 화면에서 analyze를 부르면 완료됨
    analysis: {
      conversationId: "yerin",
      status: "pending",
      needsReply: false,
      mentionsMe: false,
      tags: [],
      priority: "normal",
      highlightedMessageIds: [],
    },
  },
  {
    conversation: {
      id: "siwoo",
      app: "INSTAGRAM",
      kind: "direct",
      title: "시우",
      personId: "p-siwoo",
      lastMessageAt: ago(60 * 8),
    },
    messages: [msg("siwoo", 1, "시우", "ㅋㅋㅋ 이거 봐 [사진]", 60 * 8)],
    // 분석 실패: 요약 없이 기본 카드만
    analysis: {
      conversationId: "siwoo",
      status: "failed",
      needsReply: false,
      mentionsMe: false,
      tags: [],
      priority: "low",
      highlightedMessageIds: [],
    },
  },
  {
    conversation: {
      id: "team",
      app: "KAKAOTALK",
      kind: "group",
      title: "2026 봄학기 오픈소스 프로젝트 PING 운영진 방",
      personId: null,
      lastMessageAt: ago(30),
    },
    messages: [
      msg("team", 1, "지훈", "이번 주 회의는 목요일 저녁 8시로 할게요", 90),
      msg("team", 2, "유나", "네 좋아요!", 80),
      msg(
        "team",
        3,
        "도윤",
        `@${MY_NAME} 다음 주 발표 자료 금요일까지 올려줄 수 있어?`,
        30
      ),
    ],
    analysis: done("team", {
      summary:
        "회의가 목요일 저녁 8시로 정해졌고, 도윤이 발표 자료를 금요일까지 올려줄 수 있는지 물었어요.",
      needsReply: true,
      mentionsMe: true,
      tags: ["question"],
      priority: "normal",
      highlightedMessageIds: ["team-m3"],
    }),
  },
  {
    conversation: {
      id: "univ",
      app: "KAKAOTALK",
      kind: "group",
      title: "대학교 친구들",
      personId: null,
      lastMessageAt: ago(60 * 24 * 3),
    },
    messages: [
      msg(
        "univ",
        1,
        "지훈",
        "모임 장소 오후 6시 강남역으로 정해졌어",
        60 * 24 * 3 + 20
      ),
      msg("univ", 2, "유나", "좋아! 그날 보자~", 60 * 24 * 3),
    ],
    analysis: done("univ", {
      summary: "모임이 오후 6시 강남역으로 정해졌어요.",
      needsReply: false,
      mentionsMe: false,
      tags: ["info"],
      priority: "low",
    }),
  },
];

// 분석 중이던 예린 대화가 끝났을 때 결과
export const PENDING_RESULTS: Record<string, Omit<Analysis, "status">> = {
  yerin: {
    conversationId: "yerin",
    summary: "예린이 이번 달 스터디 회비를 보냈는지 물었어요.",
    needsReply: true,
    mentionsMe: false,
    tags: ["question"],
    priority: "normal",
    highlightedMessageIds: [],
  },
};

// 답장 후보 문장: [대화][입장 또는 "greeting"][말투]
type Texts = Record<ReplyTone, string>;
export const REPLY_TEXTS: Record<
  string,
  Partial<Record<ReplyStance | "greeting", Texts>>
> = {
  minji: {
    accept: {
      short: "좋아! 주말에 보자.",
      warm: "좋아! 나도 오랜만에 보고 싶었어. 주말에 보자!",
      polite: "좋아요. 이번 주말에 뵐게요.",
    },
    decline: {
      short: "이번 주말은 어려울 것 같아.",
      warm: "연락 줘서 고마워. 이번 주말은 조금 어려울 것 같아. 다음에 편한 날 보자.",
      polite: "연락 고마워요. 이번 주말은 어려울 것 같아요. 다음에 꼭 봬요.",
    },
    hold: {
      short: "일정 보고 알려줄게.",
      warm: "연락 고마워! 주말 일정 확인해 보고 다시 알려줄게.",
      polite: "연락 감사해요. 일정 확인하고 다시 말씀드릴게요.",
    },
  },
  seoyeon: {
    accept: {
      short: "축하해요! 꼭 갈게요.",
      warm: "선배 정말 축하해요! 그날 꼭 가서 축하할게요.",
      polite: "결혼 진심으로 축하드려요. 그날 꼭 찾아뵐게요.",
    },
    decline: {
      short: "축하해요! 마음만 보낼게요.",
      warm: "선배 정말 축하해요! 그날은 어려울 것 같아서 마음만 먼저 보낼게요.",
      polite: "결혼 진심으로 축하드려요. 참석이 어려워 마음으로 축하드릴게요.",
    },
    hold: {
      short: "축하해요! 일정 보고 말씀드릴게요.",
      warm: "선배 축하해요! 일정 확인해 보고 다시 연락드릴게요.",
      polite: "결혼 축하드려요. 일정 확인 후 다시 말씀드리겠습니다.",
    },
  },
  clinic: {
    accept: {
      short: "예약대로 갈게요.",
      warm: "안내 감사합니다. 예약대로 방문할게요.",
      polite: "안내 감사합니다. 내일 오전 10시에 예약대로 방문하겠습니다.",
    },
    decline: {
      short: "시간 변경하고 싶어요.",
      warm: "안내 감사합니다. 예약 시간을 바꾸고 싶은데 가능할까요?",
      polite: "안내 감사합니다. 예약 시간 변경이 가능할지 여쭤봐도 될까요?",
    },
    hold: {
      short: "확인하고 연락드릴게요.",
      warm: "안내 감사합니다. 일정 확인하고 오늘 안에 연락드릴게요.",
      polite: "안내 감사합니다. 일정 확인 후 오늘 중으로 연락드리겠습니다.",
    },
  },
  team: {
    accept: {
      short: "네, 금요일까지 올릴게요!",
      warm: "네 좋아요! 금요일까지 올려 둘게요.",
      polite: "네, 금요일까지 올려 두겠습니다.",
    },
    decline: {
      short: "금요일은 어려울 것 같아요.",
      warm: "금요일까지는 조금 어려울 것 같아요. 주말까지 괜찮을까요?",
      polite: "금요일까지는 어려울 것 같습니다. 주말까지 가능할까요?",
    },
    hold: {
      short: "확인하고 알려줄게요.",
      warm: "제 일정 확인해 보고 오늘 안에 알려줄게요!",
      polite: "일정 확인 후 오늘 중으로 말씀드릴게요.",
    },
  },
  yerin: {
    accept: {
      short: "응 보냈어!",
      warm: "응 보냈어! 정리해줘서 고마워.",
      polite: "네, 보냈어요. 정리해 주셔서 감사해요.",
    },
    decline: {
      short: "아직 못 보냈어, 오늘 보낼게!",
      warm: "아직 못 보냈어. 오늘 안에 보낼게, 알려줘서 고마워!",
      polite: "아직 못 보냈어요. 오늘 안에 보낼게요.",
    },
    hold: {
      short: "확인해 볼게!",
      warm: "보냈는지 확인해 보고 알려줄게!",
      polite: "확인해 보고 말씀드릴게요.",
    },
  },
  junho: {
    greeting: {
      short: "고마워! 잘 지내.",
      warm: "준호야 축하해줘서 정말 고마워! 너도 잘 지내지?",
      polite: "축하해 줘서 고마워요. 잘 지내고 있어요.",
    },
  },
  haneul: {
    greeting: {
      short: "나도 반가워! 잘 지내.",
      warm: "연락 줘서 반가워! 나는 천천히 지내고 있어. 너는 요즘 어때?",
      polite: "연락 반가워요. 저는 잘 지내고 있어요.",
    },
  },
};

// 알림이 아직 남아 있어 바로 답장할 수 있는 대화
// 하늘(5일 전 인스타그램)·대학교 친구들(3일 전)은 알림이 사라져 복사하고 메신저 열기만 가능
export const DIRECT_REPLY_IDS = [
  "minji",
  "seoyeon",
  "clinic",
  "junho",
  "yerin",
  "siwoo",
  "team",
];

// 대화별로 데이터가 없을 때 쓰는 기본 문장
export const FALLBACK_TEXTS: Record<ReplyTone, string> = {
  short: "연락 고마워!",
  warm: "연락 줘서 고마워. 천천히 답할게!",
  polite: "연락 감사합니다.",
};
