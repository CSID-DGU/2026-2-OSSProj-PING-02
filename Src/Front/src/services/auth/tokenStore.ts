import type { AuthTokens } from "./AuthService";

// 로그인 토큰 보관소
// - 자동 로그인(팀 확정): 토큰을 기기 암호화 저장소(SecureValueStorage, Android Keystore)에 남겨
//   앱을 다시 켜면 load()로 불러와 SessionProvider가 세션을 복구함
// - get()은 메모리 값을 바로 돌려줌 (HTTP 클라이언트가 요청마다 씀). 저장소 쓰기는 뒤에서 순서대로
// - 토큰을 쓰는 곳(HTTP 클라이언트)과 로그인 상태(SessionProvider)가 같은 값을 봄
export interface TokenStore {
  get(): AuthTokens | null;
  // null이면 로그아웃: 메모리와 저장소 모두에서 지움
  set(tokens: AuthTokens | null): void;
  // 앱 시작 때 저장소의 토큰을 메모리로 불러옴 (없거나 읽지 못하면 null)
  load(): Promise<AuthTokens | null>;
  // 값이 바뀌면 알림 (갱신 실패로 지워지면 로그인 화면으로 돌아가는 데 씀)
  subscribe(listener: (tokens: AuthTokens | null) => void): () => void;
}

// 암호화 저장소 한 칸 (구현: storage/keychainStorage.ts)
export interface SecureValueStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

const parseTokens = (raw: string | null): AuthTokens | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value?.accessToken === "string" &&
      typeof value?.refreshToken === "string"
      ? value
      : null;
  } catch {
    return null;
  }
};

// storage를 주지 않으면 메모리에만 둠 (테스트용)
export const createTokenStore = (storage?: SecureValueStorage): TokenStore => {
  let current: AuthTokens | null = null;
  // load() 중에 set()이 불리면 불러온 값으로 덮어쓰지 않도록
  let version = 0;
  // 저장소 쓰기는 순서대로 (갱신 직후 로그아웃처럼 연달아 바뀌어도 마지막 값이 남게)
  let pending: Promise<void> = Promise.resolve();
  const listeners = new Set<(tokens: AuthTokens | null) => void>();

  const persist = (tokens: AuthTokens | null) => {
    if (!storage) return;
    pending = pending
      .then(() =>
        tokens ? storage.write(JSON.stringify(tokens)) : storage.remove()
      )
      .catch(() => {
        // 저장 실패는 이번 실행에는 영향 없음 (메모리 값으로 계속 동작, 다음 실행에서 다시 로그인)
      });
  };

  return {
    get: () => current,
    set(tokens) {
      version += 1;
      current = tokens;
      persist(tokens);
      listeners.forEach(listener => listener(tokens));
    },
    async load() {
      if (!storage) return current;
      const started = version;
      await pending;
      const saved = await storage.read().then(parseTokens, () => null);
      if (version !== started) return current;
      current = saved;
      return saved;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
