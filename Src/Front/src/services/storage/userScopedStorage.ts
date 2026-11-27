import type { KeyValueStorage } from "./KeyValueStorage";

// 로그인한 사용자별로 칸을 나눈 저장소 (연락 상태·AI 답장 결과)
// - 다른 계정으로 로그인하면 이전 계정의 데이터가 보이지 않게 키 앞에 사용자 id를 붙임
// - 사용자는 SessionProvider가 세션을 바꿀 때 setUserId로 알려 줌
// - 로그인 전·로그아웃 뒤에는 읽으면 없음, 쓰기는 버림 (어느 사용자 것인지 알 수 없으므로)
export interface UserScopedStorage extends KeyValueStorage {
  setUserId(userId: string | null): void;
}

export const createUserScopedStorage = (
  base: KeyValueStorage
): UserScopedStorage => {
  let userId: string | null = null;
  const userPrefix = () => (userId ? `user.${userId}.` : null);
  const scoped = (key: string) => {
    const prefix = userPrefix();
    return prefix ? prefix + key : null;
  };

  return {
    setUserId(next) {
      userId = next;
    },
    async getItem(key) {
      const k = scoped(key);
      return k ? base.getItem(k) : null;
    },
    async setItem(key, value) {
      const k = scoped(key);
      if (k) await base.setItem(k, value);
    },
    async removeItem(key) {
      const k = scoped(key);
      if (k) await base.removeItem(k);
    },
    // 지금 사용자 칸의 키만 (사용자 접두어를 뗀 이름으로)
    async getAllKeys() {
      const prefix = userPrefix();
      if (!prefix) return [];
      return (await base.getAllKeys())
        .filter(key => key.startsWith(prefix))
        .map(key => key.slice(prefix.length));
    },
  };
};
