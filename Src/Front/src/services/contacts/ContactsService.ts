import type { ContactsNative } from "@native/Contacts";
import { delay } from "../common";

// 기기 연락처. 실제 구현은 Kotlin Contacts 모듈(ContactsContract, #70), Jest·mock 모드는 mock
// 이름·전화번호는 기기 안에서 친구를 구분하는 데만 쓰고 서버로 보내지 않음
export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface ContactsService {
  // READ_CONTACTS 권한이 있어야 함
  getAll(): Promise<Contact[]>;
}

// 기기 연락처 (권한이 없거나 읽지 못하면 오류 → 09 화면의 "연락처를 불러오지 못했어요")
export const createDeviceContactsService = (
  native: ContactsNative
): ContactsService => ({
  async getAll() {
    const list = await native.getAll();
    return list.map(({ id, name, phone }) => ({ id, name, phone }));
  },
});

// mock: Figma 09 예시 3명 + 이름을 섞어 만든 39명 = 42명
const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서"];
const GIVEN = ["민지", "준호", "서연", "지훈", "하늘", "도윤", "유나", "시우", "예린", "현우", "다은", "태윤", "수아"];

export const createMockContactsService = (count = 42): ContactsService => ({
  async getAll() {
    await delay(600);
    const base: Contact[] = [
      { id: "c1", name: "김민지", phone: "010-1234-5678" },
      { id: "c2", name: "박준호", phone: "010-2345-6789" },
      { id: "c3", name: "어수빈", phone: "010-3456-7890" },
    ];
    for (let i = base.length; i < count; i += 1) {
      const n = String(1000 + i).padStart(4, "0");
      base.push({
        id: `c${i + 1}`,
        name: `${FAMILY[i % FAMILY.length]}${GIVEN[(i * 5) % GIVEN.length]}`,
        phone: `010-${n}-${String(5000 + i * 7).slice(-4)}`,
      });
    }
    return base.slice(0, count);
  },
});
