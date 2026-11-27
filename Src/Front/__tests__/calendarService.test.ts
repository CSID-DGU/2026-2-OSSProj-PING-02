import {
  CALENDAR_ERROR_CODE,
  createCalendarService,
} from "../src/services/calendar/CalendarService";
import {
  eventKindOf,
  findEventsInMessages,
} from "../src/services/calendar/findEvents";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";
import { getErrorCode, type ConversationDetail } from "../src/services";

// 07 캘린더 일정 데이터 (#80): 저장·생일·메시지에서 일정 찾기
const NOW = new Date(2026, 10, 22, 10); // 2026-11-22 일요일

const message = (text: string, id = "m1", receivedAt = NOW) => ({
  id,
  conversationId: "c1",
  senderName: "박소현",
  text,
  receivedAt: receivedAt.toISOString(),
});

describe("메시지에서 일정 찾기 (기기 안 규칙)", () => {
  test("날짜·시간·종류·장소를 읽어 '{보낸 사람} {종류}' 일정으로", () => {
    const [found] = findEventsInMessages([
      message("11월 29일 오후 1시에 청첩장 모임 하자! 충무로역 4번 출구에서 봐"),
    ]);
    expect(found.title).toBe("박소현 청모");
    expect(found.kind).toBe("occasion");
    expect(found.allDay).toBe(false);
    expect(new Date(found.date)).toEqual(new Date(2026, 10, 29, 13));
    expect(found.place).toBe("충무로역 4번 출구");
    expect(found.source).toEqual({ conversationId: "c1", messageId: "m1" });
  });

  test("시간이 없으면 하루 종일, 지난 날짜면 다음 해, '내일'도 읽음", () => {
    const [jan] = findEventsInMessages([message("1월 3일에 결혼식 올려")]);
    expect(new Date(jan.date)).toEqual(new Date(2027, 0, 3));
    expect(jan.allDay).toBe(true);
    expect(jan.title).toBe("박소현 결혼식");

    const [tomorrow] = findEventsInMessages([message("내일 저녁 7시 반에 모임 어때?")]);
    expect(new Date(tomorrow.date)).toEqual(new Date(2026, 10, 23, 19, 30));
    expect(tomorrow.title).toBe("박소현 모임");
  });

  test("날짜가 없으면 일정이 아니고, 낱말이 없으면 '약속'", () => {
    expect(findEventsInMessages([message("결혼식 축하해!")])).toEqual([]);
    expect(findEventsInMessages([message("12월 5일 13:00 어때?")])[0].title).toBe(
      "박소현 약속"
    );
  });

  test("직접 추가한 일정의 종류는 제목 낱말로", () => {
    expect(eventKindOf("박하늘 결혼식")).toBe("occasion");
    expect(eventKindOf("이채은 생일")).toBe("birthday");
    expect(eventKindOf("스터디 모임")).toBe("other");
  });
});

describe("CalendarService", () => {
  const detail = (texts: string[]) =>
    ({
      messages: texts.map((t, i) => message(t, `m${i + 1}`)),
    }) as unknown as ConversationDetail;

  const setup = (texts: string[] = []) => {
    const storage = createMemoryStorage();
    const service = createCalendarService({
      storage,
      friends: {
        list: async () =>
          [
            {
              person: {
                id: "p1",
                displayName: "이채은",
                isFriend: true,
                birthday: "12-31",
                frozen: false,
              },
              accounts: [],
              lastContactAt: null,
            },
          ] as never,
      },
      conversation: { get: async () => detail(texts) },
      now: () => NOW,
    });
    return { storage, service };
  };

  test("추가·수정·삭제한 일정이 저장소에 남고, 친구 생일과 날짜순으로", async () => {
    const { storage, service } = setup();
    const added = await service.add({
      title: "박하늘 결혼식",
      date: new Date(2026, 10, 22, 13).toISOString(),
      place: " 남산 예식장 ",
      people: [{ id: "c1", name: "박하늘" }],
    });
    expect(added.kind).toBe("occasion");
    expect(added.place).toBe("남산 예식장");

    // 같은 저장소로 새로 만들어도(앱 재시작) 남아 있음
    const again = createCalendarService({
      storage,
      friends: { list: async () => [] },
      conversation: { get: async () => detail([]) },
      now: () => NOW,
    });
    expect((await again.list()).map(e => e.title)).toEqual(["박하늘 결혼식"]);

    const list = await service.list();
    expect(list.map(e => e.title)).toEqual([
      "이채은 생일", // 2025-12-31
      "박하늘 결혼식",
      "이채은 생일", // 2026-12-31
      "이채은 생일", // 2027-12-31
    ]);
    const birthday = list.find(e => e.kind === "birthday")!;
    expect(birthday.readOnly).toBe(true);
    expect(birthday.allDay).toBe(true);

    const updated = await service.update(added.id, {
      title: "박하늘 결혼식",
      date: new Date(2026, 10, 29, 13).toISOString(),
      people: [],
    });
    expect(updated.createdAt).toBe(added.createdAt);
    expect((await service.get(added.id)).date).toBe(updated.date);

    await service.remove(added.id);
    expect((await service.list()).some(e => e.id === added.id)).toBe(false);
  });

  test("친구 생일은 고치거나 지울 수 없음", async () => {
    const { service } = setup();
    const birthday = (await service.list())[0];
    await expect(service.remove(birthday.id)).rejects.toMatchObject({
      code: CALENDAR_ERROR_CODE.readOnly,
    });
  });

  test("새 일정 발견: 추가했거나 무시한 메시지는 다시 안 나옴", async () => {
    const { service } = setup([
      "11월 29일 오후 1시 청첩장 모임!",
      "12월 12일 결혼식이야",
      "잘 지내?",
    ]);
    const found = await service.findSuggestions("c1");
    expect(found.map(s => s.title)).toEqual(["박소현 청모", "박소현 결혼식"]);

    await service.add({ ...found[0], people: [] });
    await service.dismissSuggestion(found[1].key);
    expect(await service.findSuggestions("c1")).toEqual([]);

    // 원문 대화의 관련 일정
    const related = await service.listForConversation("c1");
    expect(related.map(e => e.title)).toEqual(["박소현 청모"]);
  });

  test("없는 일정은 EVENT_NOT_FOUND", async () => {
    const { service } = setup();
    const error = await service.get("nope").catch(e => e);
    expect(getErrorCode(error)).toBe(CALENDAR_ERROR_CODE.notFound);
  });
});
