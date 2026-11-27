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
  collectPackagesFor,
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

// 저장된 진행 상황(JSON)을 지금 단계 구성에 맞춰 읽음
const parseSaved = (raw: string): OnboardingData => {
  const saved = JSON.parse(raw);
  return {
    ...DEFAULT_DATA,
    ...saved,
    memory: { ...DEFAULT_DATA.memory, ...saved.memory },
    // 단계 구성이 바뀌어 없어진 단계면 그다음 단계부터 (모르는 값이면 처음부터, #59)
    lastStep: resolveSavedStep(saved.lastStep),
  };
};

// 불러오기 실패 시 다시 시도하는 간격 (부팅 직후 암호화 저장소가 아직 준비되지 않은 경우 대비)
// 모두 실패하면 기본값으로 화면을 열되, 저장된 값을 덮어쓰지 않도록 저장은 막음
export const ONBOARDING_LOAD_RETRY_MS = [500, 1500, 3000];

// 연동 앱(05) → 알림을 모을 앱 목록 (#83, 알림 리스너는 이 목록의 앱만 저장)
// - 비어 있으면 건드리지 않음 (연동 앱을 아직 고르지 않았을 때 개발 화면에서 직접 켠 설정을 지우지 않게)
// - 실패해도 온보딩은 그대로 진행 (다음에 진행 상황을 읽을 때 다시 맞춤)
const syncCollection = (apps: LinkedApp[]) => {
  if (apps.length === 0) return;
  services.collection.setApps(collectPackagesFor(apps)).catch(() => {});
};

// 09에서 고른 연락처 → 친구 목록 (services.friends, 사용자별 기기 저장소)
// - 한 번 가져온 연락처는 다시 가져오지 않음 (친구 화면에서 지우거나 합친 사람이 되살아나지 않게)
// - 실패해도 온보딩은 그대로 진행 (다음에 진행 상황을 읽을 때 다시 시도)
const syncFriends = (friends: Contact[]) => {
  if (friends.length === 0) return;
  services.friends.importContacts(friends).catch(() => {});
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// 호출할 때마다 services에서 꺼냄 (테스트·실제 구현으로 바꿔 끼워도 반영되게)
const storage = {
  getItem: (key: string) => services.storage.getItem(key),
  setItem: (key: string, value: string) => services.storage.setItem(key, value),
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const userId = session.status === "signedIn" ? session.user.id : null;
  const storageKey = userId ? `${STORAGE_KEYS.onboarding}.${userId}` : null;

  // 어느 사용자의 진행 상황까지 불러왔는지. 로그인 직후 이전 값으로 판단하지 않도록 key로 비교
  const [loadedKey, setLoadedKey] = useState<string | null | undefined>();
  const hydrated = session.status !== "loading" && loadedKey === storageKey;
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const dataRef = useRef(data);
  // 저장된 값을 한 번이라도 제대로 읽었는지. 못 읽었으면 저장된 값을 덮어쓰지 않도록 쓰기 전에 다시 읽음
  const loadedOkRef = useRef(false);

  // 로그인하지 않은 상태(로그아웃·세션 만료·처음 실행)에서는 알림을 모으지 않음 (#83)
  // 이미 쌓인 알림은 지우지 않고, 다시 로그인하면 그 사람의 연동 앱으로 다시 맞춤
  useEffect(() => {
    if (session.status === "signedOut") {
      services.collection.setApps([]).catch(() => {});
    }
  }, [session.status]);

  // 로그인한 사용자가 바뀌면 그 사람의 진행 상황을 불러옴
  useEffect(() => {
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    dataRef.current = DEFAULT_DATA;
    setData(DEFAULT_DATA);
    loadedOkRef.current = false;

    if (!storageKey) {
      setLoadedKey(null);
      return;
    }

    // 실패하면 간격을 두고 다시 시도 (그동안은 hydrated가 아니라 스플래시에서 기다림)
    const load = (attempt: number) => {
      storage
        .getItem(storageKey)
        .then(raw => {
          if (!alive) return;
          loadedOkRef.current = true;
          if (raw) {
            const next = parseSaved(raw);
            dataRef.current = next;
            setData(next);
            // 이미 온보딩을 마친 사용자·다시 로그인한 사용자도 그 사람의 연동 앱으로 수집 목록을 맞춤 (#83)
            syncCollection(next.linkedApps);
            // 이미 온보딩을 마친 사용자도 고른 연락처를 친구 목록으로
            syncFriends(next.friends);
          }
          setLoadedKey(storageKey);
        })
        .catch(() => {
          if (!alive) return;
          const delay = ONBOARDING_LOAD_RETRY_MS[attempt];
          if (delay !== undefined) {
            retryTimer = setTimeout(() => load(attempt + 1), delay);
            return;
          }
          // 끝까지 못 읽으면 기본값(처음부터)으로 열되 저장은 막음 (update에서 다시 읽기 전까지)
          setLoadedKey(storageKey);
        });
    };
    load(0);

    return () => {
      alive = false;
      clearTimeout(retryTimer);
    };
  }, [storageKey]);

  // 상태는 바로 바꾸고 저장 결과를 돌려줌 (저장 실패를 화면에서 알려야 할 때 await)
  // 저장된 값을 아직 못 읽었으면 먼저 다시 읽음
  // - 또 실패: 저장하지 않고 오류 (기본값으로 저장된 completed 등을 덮어쓰지 않게)
  // - 성공: 저장돼 있던 값 위에 이번 변경만 얹어 저장
  const update = useCallback(
    async (patch: Partial<OnboardingData>) => {
      const next = { ...dataRef.current, ...patch };
      dataRef.current = next;
      setData(next);
      // 05 연동 앱을 바꾸면 알림을 모을 앱 목록도 바로 맞춤 (#83)
      if (patch.linkedApps) syncCollection(patch.linkedApps);
      // 09에서 고른 연락처를 친구 목록으로
      if (patch.friends) syncFriends(patch.friends);
      if (!storageKey) return;

      if (!loadedOkRef.current) {
        const raw = await storage.getItem(storageKey).catch(() => {
          throw new Error("저장된 온보딩 진행 상황을 아직 읽지 못해 저장하지 않았어요");
        });
        loadedOkRef.current = true;
        if (raw) {
          const merged = { ...parseSaved(raw), ...patch };
          dataRef.current = merged;
          setData(merged);
        }
      }
      await storage.setItem(storageKey, JSON.stringify(dataRef.current));
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
