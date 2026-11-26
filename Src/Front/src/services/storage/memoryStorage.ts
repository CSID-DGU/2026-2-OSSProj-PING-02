import type { KeyValueStorage } from "./KeyValueStorage";

// 테스트용: 앱 메모리에만 저장 (앱을 완전히 끄면 초기화됨). 앱은 secureKeyValueStorage를 씀
export const createMemoryStorage = (): KeyValueStorage => {
  const store = new Map<string, string>();

  return {
    getItem: async key => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async key => {
      store.delete(key);
    },
    getAllKeys: async () => [...store.keys()],
  };
};
