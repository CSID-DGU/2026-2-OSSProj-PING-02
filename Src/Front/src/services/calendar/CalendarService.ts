import { ServiceError } from "../common";
import type { ConversationService } from "../conversation/ConversationService";
import type { FriendService } from "../friend/FriendService";
import type { KeyValueStorage } from "../storage/KeyValueStorage";
import { eventKindOf, findEventsInMessages } from "./findEvents";
import type {
  CalendarEvent,
  EventInput,
  EventSuggestion,
} from "./types";

// 07 캘린더 일정 (#80)
// - 저장: 백엔드에 일정 API가 없고 원문처럼 기기에만 두는 정보라, 사용자별 암호화 저장소(userStorage, #49)에 둠
//   → 앱을 껐다 켜도 남고, 다른 계정으로 로그인하면 보이지 않음
// - 친구 생일: 친구 정보(services.friends)의 생일로 만든 일정. 고치거나 지울 수 없음
//   (생일은 "MM-DD"라 나이를 모름 → 시안의 "22살 생일" 대신 "생일". TODO(친구 생일 연도))
// - 새 일정 발견: findEventsInMessages (기기 안 규칙, TODO(AI 일정))
export interface CalendarService {
  // 저장한 일정 + 친구 생일 (날짜순)
  list(): Promise<CalendarEvent[]>;
  get(id: string): Promise<CalendarEvent>;
  add(input: EventInput): Promise<CalendarEvent>;
  update(id: string, input: EventInput): Promise<CalendarEvent>;
  remove(id: string): Promise<void>;
  // 05 연락 D03 관련 일정: 그 대화에서 찾았거나 그 사람이 인원에 있는 일정
  listForConversation(conversationId: string): Promise<CalendarEvent[]>;
  // 05 연락 D03 "새 일정이 발견됐어요": 아직 추가·무시하지 않은 것만
  findSuggestions(conversationId: string): Promise<EventSuggestion[]>;
  dismissSuggestion(key: string): Promise<void>;
}

export const CALENDAR_ERROR_CODE = {
  notFound: "EVENT_NOT_FOUND",
  readOnly: "EVENT_READ_ONLY",
} as const;

export const CALENDAR_STORAGE_KEYS = {
  events: "calendar.events",
  dismissed: "calendar.dismissedSuggestions",
} as const;

// 생일은 올해 앞뒤 한 해씩 (달력을 넘겨 봐도 보이게)
const BIRTHDAY_YEARS = [-1, 0, 1];

interface Deps {
  storage: KeyValueStorage;
  friends: Pick<FriendService, "list">;
  conversation: Pick<ConversationService, "get">;
  now?: () => Date;
}

const newId = () =>
  `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const readJson = async <T>(
  storage: KeyValueStorage,
  key: string,
  fallback: T
): Promise<T> => {
  const raw = await storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const byDate = (a: CalendarEvent, b: CalendarEvent) =>
  a.date.localeCompare(b.date) || a.title.localeCompare(b.title);

export const createCalendarService = ({
  storage,
  friends,
  conversation,
  now = () => new Date(),
}: Deps): CalendarService => {
  const readEvents = () =>
    readJson<CalendarEvent[]>(storage, CALENDAR_STORAGE_KEYS.events, []);
  const writeEvents = (events: CalendarEvent[]) =>
    storage.setItem(CALENDAR_STORAGE_KEYS.events, JSON.stringify(events));
  const readDismissed = () =>
    readJson<string[]>(storage, CALENDAR_STORAGE_KEYS.dismissed, []);

  // 친구 생일 → 일정 (친구 정보를 못 읽어도 저장한 일정은 보여 줌)
  const birthdays = async (): Promise<CalendarEvent[]> => {
    const list = await friends.list().catch(() => []);
    const year = now().getFullYear();
    const stamp = new Date(0).toISOString();
    return list.flatMap(({ person }) => {
      const match = person.birthday?.match(/^(\d{2})-(\d{2})$/);
      if (!match) return [];
      return BIRTHDAY_YEARS.map(offset => ({
        id: `birthday-${person.id}-${year + offset}`,
        title: `${person.displayName} 생일`,
        date: new Date(
          year + offset,
          Number(match[1]) - 1,
          Number(match[2])
        ).toISOString(),
        allDay: true,
        people: [],
        kind: "birthday" as const,
        readOnly: true,
        createdAt: stamp,
        updatedAt: stamp,
      }));
    });
  };

  const toEvent = (
    input: EventInput,
    base?: Pick<CalendarEvent, "id" | "createdAt" | "source">
  ): CalendarEvent => {
    const stamp = now().toISOString();
    const title = input.title.trim();
    return {
      id: base?.id ?? newId(),
      title,
      date: input.date,
      allDay: input.allDay ?? false,
      place: input.place?.trim() || undefined,
      people: input.people,
      kind: input.kind ?? eventKindOf(title),
      source: input.source ?? base?.source,
      createdAt: base?.createdAt ?? stamp,
      updatedAt: stamp,
    };
  };

  const findStored = async (id: string) => {
    const events = await readEvents();
    const index = events.findIndex(e => e.id === id);
    if (index < 0) {
      if (id.startsWith("birthday-")) {
        throw new ServiceError(
          CALENDAR_ERROR_CODE.readOnly,
          "친구 생일은 여기서 바꿀 수 없습니다."
        );
      }
      throw new ServiceError(CALENDAR_ERROR_CODE.notFound, "일정을 찾을 수 없습니다.");
    }
    return { events, index };
  };

  const service: CalendarService = {
    async list() {
      const [stored, born] = await Promise.all([readEvents(), birthdays()]);
      return [...stored, ...born].sort(byDate);
    },

    async get(id) {
      const found = (await service.list()).find(e => e.id === id);
      if (!found) {
        throw new ServiceError(CALENDAR_ERROR_CODE.notFound, "일정을 찾을 수 없습니다.");
      }
      return found;
    },

    async add(input) {
      const event = toEvent(input);
      await writeEvents([...(await readEvents()), event]);
      return event;
    },

    async update(id, input) {
      const { events, index } = await findStored(id);
      const next = toEvent(input, events[index]);
      events[index] = next;
      await writeEvents(events);
      return next;
    },

    async remove(id) {
      const { events, index } = await findStored(id);
      events.splice(index, 1);
      await writeEvents(events);
    },

    async listForConversation(conversationId) {
      return (await readEvents())
        .filter(
          e =>
            e.source?.conversationId === conversationId ||
            e.people.some(p => p.id === conversationId)
        )
        .sort(byDate);
    },

    async findSuggestions(conversationId) {
      const [detail, stored, dismissed] = await Promise.all([
        conversation.get(conversationId),
        readEvents(),
        readDismissed(),
      ]);
      const added = new Set(
        stored.map(e => e.source?.messageId).filter(Boolean)
      );
      const hidden = new Set(dismissed);
      return findEventsInMessages(detail.messages).filter(
        s => !added.has(s.source.messageId) && !hidden.has(s.key)
      );
    },

    async dismissSuggestion(key) {
      const dismissed = await readDismissed();
      if (dismissed.includes(key)) return;
      await storage.setItem(
        CALENDAR_STORAGE_KEYS.dismissed,
        JSON.stringify([...dismissed, key])
      );
    },
  };

  return service;
};
