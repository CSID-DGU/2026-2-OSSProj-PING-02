import type { KeyValueStorage } from "./KeyValueStorage";

// mock: 앱 메모리에만 저장 (앱을 완전히 끄면 초기화됨)
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
  };
};
