import type { AuthTokens } from "./AuthService";

// 로그인 토큰 보관소 (메모리)
// - 앱을 끄면 사라짐 → 다시 로그인. TODO(팀 결정): 자동 로그인 여부 미확정
//   정해지면 이 인터페이스를 암호화 저장소(Android Keystore) 구현으로 바꿈
// - 토큰을 쓰는 곳(HTTP 클라이언트)과 로그인 상태(SessionProvider)가 같은 값을 봄
export interface TokenStore {
  get(): AuthTokens | null;
  set(tokens: AuthTokens | null): void;
  // 값이 바뀌면 알림 (갱신 실패로 지워지면 로그인 화면으로 돌아가는 데 씀)
  subscribe(listener: (tokens: AuthTokens | null) => void): () => void;
}

export const createMemoryTokenStore = (): TokenStore => {
  let current: AuthTokens | null = null;
  const listeners = new Set<(tokens: AuthTokens | null) => void>();

  return {
    get: () => current,
    set(tokens) {
      current = tokens;
      listeners.forEach(listener => listener(tokens));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
