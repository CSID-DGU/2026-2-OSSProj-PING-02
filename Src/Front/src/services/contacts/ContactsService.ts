import { delay } from "../common";

// 기기 연락처 (나중에 Kotlin 네이티브 모듈 ContactsContract로 교체)
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
