import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { services, type AuthResult, type AuthUser } from "@services";

// 로그인 상태
// - 토큰은 services.tokens(메모리)에만 둠. 앱을 끄면 로그아웃 상태로 시작
//   TODO(팀 결정): 자동 로그인 여부 미확정. 정하면 앱 시작 시 저장된 refreshToken으로 갱신하고 "loading"을 씀
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

const { auth, tokens } = services;

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SessionState>({ status: "signedOut" });

  // 토큰이 지워지면 로그인 화면으로 (로그아웃·갱신 실패 모두)
  useEffect(
    () =>
      tokens.subscribe(next => {
        if (!next) setSession({ status: "signedOut" });
      }),
    []
  );

  const signIn = useCallback(async (result: AuthResult) => {
    tokens.set(result.tokens);
    setSession({ status: "signedIn", user: result.user });
  }, []);

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
  }, []);

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
