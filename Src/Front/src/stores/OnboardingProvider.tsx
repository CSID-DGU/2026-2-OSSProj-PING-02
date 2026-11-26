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
import { services, STORAGE_KEYS } from "@services";
import {
  NOTIFICATION_PREF_OPTIONS,
  ONBOARDING_STEPS,
  resolveSavedStep,
  type AvoidTopic,
  type LinkedApp,
  type NotificationPref,
  type OnboardingStep,
} from "@constants/onboarding";
import type { Contact } from "@services";
import { useSession } from "./SessionProvider";

// 사용자별로 저장하는 온보딩 진행 상황
// 건너뛴 단계는 따로 저장하지 않고 완료 화면에서 실제 상태(권한·친구 수·메모)로 판단
export interface OnboardingData {
  completed: boolean;
  lastStep: OnboardingStep;
  linkedApps: LinkedApp[];
  notificationPrefs: NotificationPref[];
  // TODO(네이티브): 친구 목록은 기기 안 암호화 DB로 옮기기. 지금은 온보딩 저장소에 함께 둠
  friends: Contact[];
  memory: MemoryData;
}

// 11 AI 메모리 (예전 저장값 { status, avoid }도 그대로 읽힘, avoidTopics만 빈 배열로 채움)
export interface MemoryData {
  status: string;
  avoid: string;
  avoidTopics: AvoidTopic[];
}

interface OnboardingContextValue {
  hydrated: boolean;
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => Promise<void>;
}

const DEFAULT_DATA: OnboardingData = {
  completed: false,
  lastStep: ONBOARDING_STEPS[0],
  linkedApps: [],
  // Figma 06: 전체 선택이 기본값
  notificationPrefs: NOTIFICATION_PREF_OPTIONS.map(o => o.value),
  friends: [],
  memory: { status: "", avoid: "", avoidTopics: [] },
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// 호출할 때마다 services에서 꺼냄 (테스트·실제 구현으로 바꿔 끼워도 반영되게)
const { storage } = services;

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const userId = session.status === "signedIn" ? session.user.id : null;
  const storageKey = userId ? `${STORAGE_KEYS.onboarding}.${userId}` : null;

  // 어느 사용자의 진행 상황까지 불러왔는지. 로그인 직후 이전 값으로 판단하지 않도록 key로 비교
  const [loadedKey, setLoadedKey] = useState<string | null | undefined>();
  const hydrated = session.status !== "loading" && loadedKey === storageKey;
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const dataRef = useRef(data);

  // 로그인한 사용자가 바뀌면 그 사람의 진행 상황을 불러옴
  useEffect(() => {
    let alive = true;
    dataRef.current = DEFAULT_DATA;
    setData(DEFAULT_DATA);

    if (!storageKey) {
      setLoadedKey(null);
      return;
    }

    storage
      .getItem(storageKey)
      .then(raw => {
        if (!alive || !raw) return;
        const saved = JSON.parse(raw);
        const next: OnboardingData = {
          ...DEFAULT_DATA,
          ...saved,
          memory: { ...DEFAULT_DATA.memory, ...saved.memory },
          // 단계 구성이 바뀌어 없어진 단계면 그다음 단계부터 (모르는 값이면 처음부터)
          lastStep: resolveSavedStep(saved.lastStep),
        };
        dataRef.current = next;
        setData(next);
      })
      .catch(() => {
        // 불러오기에 실패하면 처음부터 진행 (진행 상황만 잃고 계정에는 영향 없음)
      })
      .finally(() => {
        if (alive) setLoadedKey(storageKey);
      });

    return () => {
      alive = false;
    };
  }, [storageKey]);

  // 상태는 바로 바꾸고 저장 결과를 돌려줌 (저장 실패를 화면에서 알려야 할 때 await)
  const update = useCallback(
    async (patch: Partial<OnboardingData>) => {
      const next = { ...dataRef.current, ...patch };
      dataRef.current = next;
      setData(next);
      if (storageKey) {
        await storage.setItem(storageKey, JSON.stringify(next));
      }
    },
    [storageKey]
  );

  const value = useMemo(
    () => ({ hydrated, data, update }),
    [hydrated, data, update]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding은 OnboardingProvider 안에서 써야 해요");
  }
  return ctx;
};
