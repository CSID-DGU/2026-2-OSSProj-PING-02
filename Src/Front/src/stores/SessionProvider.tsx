import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getErrorCode,
  NETWORK_ERROR,
  services,
  TIMEOUT_ERROR,
  type AuthResult,
  type AuthUser,
} from "@services";

// 로그인 상태
// - 자동 로그인(팀 확정): 앱 시작 때 "loading"으로 시작해 암호화 저장소의 토큰을 불러오고
//   auth.restoreSession()(refresh → 내 정보)으로 복구. 저장된 토큰이 없거나 실패하면 signedOut(로그인 화면)
//   - 세션이 끝남(401 등): 저장 토큰도 지움 → 다음에 켜도 로그인 화면
//   - 네트워크 오류·시간 초과: 이번에는 로그인 화면이지만 저장 토큰은 남겨 다음 실행에서 다시 시도
//     TODO(디자이너 공유): 오프라인으로 켰을 때 "다시 시도" 안내를 둘지
// - 로그아웃하면 서버 세션을 끝내고 저장 토큰도 지움
// - 앱 사용 중 토큰 갱신이 실패해 토큰이 지워지면(세션 만료) signedOut으로 바뀜
export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: AuthUser };

interface SessionContextValue {
  session: SessionState;
  signIn: (result: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const { auth, tokens, userStorage } = services;

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSessionState] = useState<SessionState>({
    status: "loading",
  });
  const sessionRef = useRef(session);

  // 세션을 바꿀 때 사용자별 저장소(연락 상태·AI 답장)의 사용자도 같이 바꿈
  // 화면보다 먼저 바꿔야 해서 effect가 아니라 여기서 바로 (자식 화면의 effect가 먼저 돌기 때문)
  const setSession = useCallback((next: SessionState) => {
    sessionRef.current = next;
    userStorage.setUserId(next.status === "signedIn" ? next.user.id : null);
    setSessionState(next);
  }, []);

  // 토큰이 지워지면 로그인 화면으로 (로그아웃·갱신 실패 모두)
  useEffect(
    () =>
      tokens.subscribe(next => {
        if (!next) setSession({ status: "signedOut" });
      }),
    [setSession]
  );

  // 앱 시작: 저장된 토큰으로 세션 복구
  useEffect(() => {
    let alive = true;
    // 복구 중에 직접 로그인하면(지금 화면 구성에선 없음) 그 결과를 덮어쓰지 않음
    const settle = (next: SessionState) => {
      if (alive && sessionRef.current.status === "loading") {
        setSession(next);
      }
    };
    (async () => {
      const saved = await tokens.load();
      if (!saved) return settle({ status: "signedOut" });
      try {
        const user = await auth.restoreSession();
        settle({ status: "signedIn", user });
      } catch (error) {
        const code = getErrorCode(error);
        if (code !== NETWORK_ERROR && code !== TIMEOUT_ERROR && tokens.get()) {
          tokens.set(null);
        }
        settle({ status: "signedOut" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [setSession]);

  const signIn = useCallback(
    async (result: AuthResult) => {
      tokens.set(result.tokens);
      setSession({ status: "signedIn", user: result.user });
    },
    [setSession]
  );

  const signOut = useCallback(async () => {
    const current = tokens.get();
    // 화면은 바로 로그아웃 상태로. 로그아웃 요청에는 액세스 토큰이 필요해서 토큰은 요청 뒤에 지움
    setSession({ status: "signedOut" });
    try {
      if (current) await auth.logout(current.refreshToken);
    } catch {
      // 서버에 닿지 못해도 이 기기에서는 로그아웃 (서버 세션은 30일 뒤 만료)
    } finally {
      tokens.set(null);
    }
  }, [setSession]);

  const value = useMemo(
    () => ({ session, signIn, signOut }),
    [session, signIn, signOut]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서 써야 해요");
  return ctx;
};
