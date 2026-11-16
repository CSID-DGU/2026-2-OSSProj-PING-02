import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  services,
  STORAGE_KEYS,
  type AuthResult,
  type AuthTokens,
  type AuthUser,
} from "@services";

// 로그인 상태. 앱을 켜면 저장소에서 복원하고(loading), 결과에 따라 signedIn / signedOut
export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: AuthUser; tokens: AuthTokens };

interface SessionContextValue {
  session: SessionState;
  signIn: (result: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const { storage, auth } = services;

const isAuthResult = (value: unknown): value is AuthResult => {
  const v = value as AuthResult | null;
  return !!v?.user?.id && !!v?.tokens?.accessToken;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const restore = async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEYS.session);
        const saved: unknown = raw ? JSON.parse(raw) : null;
        if (!alive) return;
        setSession(
          isAuthResult(saved)
            ? { status: "signedIn", user: saved.user, tokens: saved.tokens }
            : { status: "signedOut" }
        );
      } catch {
        // 저장된 값이 깨졌으면 다시 로그인하도록 함
        if (alive) setSession({ status: "signedOut" });
      }
    };
    restore();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (result: AuthResult) => {
    setSession({ status: "signedIn", user: result.user, tokens: result.tokens });
    try {
      await storage.setItem(STORAGE_KEYS.session, JSON.stringify(result));
    } catch {
      // 저장에 실패해도 이번 실행 동안은 로그인 상태를 유지
    }
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    setSession({ status: "signedOut" });
    try {
      if (current.status === "signedIn") {
        await auth.logout(current.tokens.refreshToken);
      }
    } finally {
      await storage.removeItem(STORAGE_KEYS.session).catch(() => {});
    }
  }, [session]);

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
