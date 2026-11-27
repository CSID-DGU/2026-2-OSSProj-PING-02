import type { StoredNotification } from "../src/native/NotificationStore";
import {
  createDeviceConversationService,
  toConversationKey,
  type DeviceMessageSource,
} from "../src/services/conversation/deviceConversationService";
import {
  accountIdOf,
  createDeviceFriendService,
  normalizePhone,
} from "../src/services/friend/deviceFriendService";
import {
  createKeyValueAiReplyStore,
  createMockAiReplyService,
  type FriendService,
} from "../src/services";
import { createMemoryStorage } from "../src/services/storage/memoryStorage";
import type { KeyValueStorage } from "../src/services/storage/KeyValueStorage";

// 실제 친구 서비스: 기기 알림(1:1 대화를 보낸 사람) + 온보딩 09에서 고른 연락처 → 친구, 기기 저장소에 저장
// 실기기와 같은 구성(가짜 알림 원본 → 기기 대화 서비스 → 친구 서비스)으로 확인

const KAKAO = "com.kakao.talk";
const SMS = "com.samsung.android.messaging";
const INSTA = "com.instagram.android";
const MIN = 60_000;
let nextId = 1;

const row = (over: Partial<StoredNotification>): StoredNotification => ({
  id: nextId++,
  packageName: KAKAO,
  appName: "카카오톡",
  conversationId: "room-1",
  conversationTitle: "민지",
  messageId: null,
  isMention: false,
  contentType: "text",
  isPlaceholder: false,
  senderId: null,
  sender: "민지",
  text: "안녕",
  isGroupConversation: false,
  messageTime: Date.now() - 10 * MIN,
  savedAt: Date.now() - 10 * MIN,
  ...over,
});

const setup = (rows: StoredNotification[], storage: KeyValueStorage = createMemoryStorage()) => {
  const source: DeviceMessageSource = {
    getNotifications: async () => [...rows].reverse(),
    getConversationMessages: async (pkg, id) =>
      rows.filter(r => r.packageName === pkg && r.conversationId === id).reverse(),
  };
  // index.ts와 같은 순서: 대화 서비스가 친구 서비스로 personId를 찾음
  let friends: FriendService;
  const conversation = createDeviceConversationService({
    source,
    storage,
    ai: createMockAiReplyService(),
    aiReplies: createKeyValueAiReplyStore(storage),
    getPersonLookup: () => friends.getPersonLookup(),
  });
  friends = createDeviceFriendService({ storage, conversation });
  return { friends, conversation, rows, storage };
};

const names = async (friends: FriendService) =>
  (await friends.list()).map(f => `${f.person.displayName}${f.person.isFriend ? "" : "(NEW)"}`);

beforeEach(() => {
  nextId = 1;
});

describe("실제 친구 서비스", () => {
  test("예시 친구 없이 시작하고, 1:1 대화를 보낸 사람만 NEW로 (단톡·기관 발신자는 빼고) 최근 연락순", async () => {
    const { friends } = setup([]);
    expect(await friends.list()).toEqual([]);

    const { friends: withMessages } = setup([
      row({ conversationId: "room-1", sender: "민지", messageTime: Date.now() - 5 * MIN }),
      row({
        packageName: INSTA,
        appName: "Instagram",
        conversationId: "dm-1",
        conversationTitle: "선빈",
        sender: "선빈",
        senderId: "ig:seonbinihong05",
        messageTime: Date.now() - 1 * MIN,
      }),
      row({ conversationId: "group-1", conversationTitle: "OSS_02_PING", sender: "예린", isGroupConversation: true }),
      row({ conversationId: "bank", conversationTitle: "국민은행", sender: "국민은행", text: "입금 안내" }),
    ]);
    expect(await names(withMessages)).toEqual(["선빈(NEW)", "민지(NEW)"]);
    const [seonbin] = await withMessages.list();
    expect(seonbin.accounts[0]).toMatchObject({
      id: "INSTAGRAM:ig:seonbinihong05",
      app: "INSTAGRAM",
      senderName: "선빈",
      handle: "seonbinihong05",
    });
  });

  test("고른 연락처는 친구 + 문자 계정이 되고, 그 번호의 문자 알림은 같은 친구로 이어진다 (+82도 같은 번호)", async () => {
    const { friends } = setup([
      row({
        packageName: SMS,
        appName: "메시지",
        conversationId: "sms-1",
        conversationTitle: "김민지",
        sender: "김민지",
        senderId: "tel:+821012345678",
        text: "주말에 볼래?",
      }),
    ]);
    await friends.importContacts([
      { id: "c1", name: "김민지", phone: "010-1234-5678" },
      { id: "c2", name: "이준호", phone: "010-9999-0000" },
    ]);
    const list = await friends.list();
    expect(list.map(f => f.person.displayName).sort()).toEqual(["김민지", "이준호"]);
    const minji = list.find(f => f.person.displayName === "김민지")!;
    expect(minji.person.isFriend).toBe(true);
    expect(minji.accounts.map(a => a.id)).toEqual(["SMS:tel:01012345678"]);
    // 문자 알림이 와 있어서 마지막 연락·답장 필요(빨간 점)가 보임
    expect(minji.lastContactAt).not.toBeNull();
    expect(minji.attention).toBe(true);
    expect(minji.lastTopic).toBe("주말에 볼래?");
  });

  test("문자로 먼저 NEW가 된 번호를 연락처로 가져오면 그 NEW가 친구가 된다 (중복으로 만들지 않음)", async () => {
    // 번호만 있는 발신자는 기관·번호 발신자로 보고 친구로 만들지 않아서, 휴대폰 연락처 이름으로 온 문자
    const { friends } = setup([
      row({
        packageName: SMS,
        conversationId: "sms-1",
        conversationTitle: "민지폰",
        sender: "민지폰",
        senderId: "tel:01012345678",
      }),
    ]);
    expect(await names(friends)).toEqual(["민지폰(NEW)"]);
    await friends.importContacts([{ id: "c1", name: "김민지", phone: "010-1234-5678" }]);
    expect(await names(friends)).toEqual(["김민지"]);
  });

  test("한 번 가져온 연락처는 지워도 다시 가져오지 않고, 지운 NEW는 새 메시지가 와야 다시 생긴다", async () => {
    const { friends, rows } = setup([row({ conversationId: "room-1", sender: "민지" })]);
    await friends.importContacts([{ id: "c2", name: "이준호", phone: "010-9999-0000" }]);
    const junho = (await friends.list()).find(f => f.person.displayName === "이준호")!;
    const minji = (await friends.list()).find(f => f.person.displayName === "민지")!;
    await friends.remove(junho.person.id);
    await friends.remove(minji.person.id);
    await friends.importContacts([{ id: "c2", name: "이준호", phone: "010-9999-0000" }]);
    expect(await names(friends)).toEqual([]);

    rows.push(row({ conversationId: "room-1", sender: "민지", text: "다시 연락", messageTime: Date.now() + 1000 }));
    expect(await names(friends)).toEqual(["민지(NEW)"]);
  });

  test("기기 저장소에 남아서 앱을 다시 켜도 친구로 추가·관계·합치기가 그대로", async () => {
    const storage = createMemoryStorage();
    const messages = [
      row({ conversationId: "room-1", sender: "민지" }),
      row({
        packageName: INSTA,
        conversationId: "dm-1",
        conversationTitle: "minji_daily",
        sender: "minji_daily",
        senderId: "ig:minji_daily",
      }),
    ];
    const first = setup(messages, storage).friends;
    const list = await first.list();
    const kakao = list.find(f => f.person.displayName === "민지")!;
    const insta = list.find(f => f.person.displayName === "minji_daily")!;
    await first.addFriend(kakao.person.id);
    await first.updateInfo(kakao.person.id, { relation: "friend", memo: "대학교 친구" });
    await first.connectTo(insta.person.id, kakao.person.id);

    // 같은 저장소로 서비스를 새로 만듦 = 앱을 다시 켬
    const again = setup(messages, storage).friends;
    const [minji] = await again.list();
    expect(minji.person).toMatchObject({ displayName: "민지", isFriend: true, relation: "friend", memo: "대학교 친구" });
    expect(minji.accounts.map(a => a.app).sort()).toEqual(["INSTAGRAM", "KAKAOTALK"]);
  });

  test("연락 상세의 personId가 그 보낸 사람의 친구 (단톡은 없음)", async () => {
    const { friends, conversation } = setup([
      row({ conversationId: "room-1", sender: "민지" }),
      row({ conversationId: "group-1", conversationTitle: "동아리", sender: "민지", isGroupConversation: true }),
    ]);
    const [minji] = await friends.list();
    const direct = await conversation.get(toConversationKey(KAKAO, "room-1"));
    expect(direct.conversation.personId).toBe(minji.person.id);
    const group = await conversation.get(toConversationKey(KAKAO, "group-1"));
    expect(group.conversation.personId).toBeNull();
  });

  test("상세: 최근 대화·원문 개수·다음 자동 삭제 날짜", async () => {
    const { friends } = setup([
      row({ conversationId: "room-1", sender: "민지", text: "첫 메시지", messageTime: Date.now() - 2 * 24 * 60 * MIN }),
      row({ conversationId: "room-1", sender: "민지", text: "두 번째", messageTime: Date.now() - 5 * MIN }),
    ]);
    const [minji] = await friends.list();
    const detail = await friends.get(minji.person.id);
    expect(detail.lastConversation).toMatchObject({
      conversationId: toConversationKey(KAKAO, "room-1"),
      topic: "두 번째",
    });
    expect(detail.rawStats.recentCount).toBe(2);
    expect(detail.rawStats.nextDeleteAt).not.toBeNull();
    expect(detail.rawStats.lastDeletedAt).toBeNull();
  });
});

describe("번호·계정 id", () => {
  test.each([
    ["010-1234-5678", "01012345678"],
    ["+82 10-1234-5678", "01012345678"],
    ["821012345678", "01012345678"],
    ["02-123-4567", "021234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  test("문자 tel id는 번호 모양을 맞추고, 그 밖은 앱 + id 그대로", () => {
    expect(accountIdOf("SMS", "tel:+821012345678")).toBe("SMS:tel:01012345678");
    expect(accountIdOf("KAKAOTALK", "name:민지")).toBe("KAKAOTALK:name:민지");
    expect(accountIdOf("INSTAGRAM", "ig:abc")).toBe("INSTAGRAM:ig:abc");
  });
});
