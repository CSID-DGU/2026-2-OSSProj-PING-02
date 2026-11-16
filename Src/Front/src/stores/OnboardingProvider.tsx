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
  MODEL_ERROR_CODE,
  services,
  STORAGE_KEYS,
  type DownloadTask,
  type ModelInfo,
} from "@services";
import {
  NOTIFICATION_PREF_OPTIONS,
  ONBOARDING_STEPS,
  type LinkedApp,
  type MemoryCategory,
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
  memory: Record<MemoryCategory, string>;
}

// 모델 다운로드는 화면을 벗어나도 계속되므로 여기서 들고 있음
export type ModelState =
  | { status: "idle" }
  | { status: "loadingInfo" }
  | { status: "infoError" }
  | { status: "ready"; info: ModelInfo }
  | { status: "downloading"; info: ModelInfo; received: number }
  | { status: "failed"; info: ModelInfo; received: number }
  | { status: "done"; info: ModelInfo };

interface OnboardingContextValue {
  hydrated: boolean;
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => Promise<void>;
  model: ModelState;
  loadModelInfo: () => Promise<void>;
  startModelDownload: () => void;
}

const DEFAULT_DATA: OnboardingData = {
  completed: false,
  lastStep: ONBOARDING_STEPS[0],
  linkedApps: [],
  // Figma 06: 전체 선택이 기본값
  notificationPrefs: NOTIFICATION_PREF_OPTIONS.map(o => o.value),
  friends: [],
  memory: { status: "", avoid: "" },
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const { storage, model: modelService } = services;

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const userId = session.status === "signedIn" ? session.user.id : null;
  const storageKey = userId ? `${STORAGE_KEYS.onboarding}.${userId}` : null;

  // 어느 사용자의 진행 상황까지 불러왔는지. 로그인 직후 이전 값으로 판단하지 않도록 key로 비교
  const [loadedKey, setLoadedKey] = useState<string | null | undefined>();
  const hydrated = session.status !== "loading" && loadedKey === storageKey;
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const dataRef = useRef(data);
  const [model, setModel] = useState<ModelState>({ status: "idle" });
  const modelRef = useRef(model);
  modelRef.current = model;
  const taskRef = useRef<DownloadTask | null>(null);

  // 로그인한 사용자가 바뀌면 그 사람의 진행 상황을 불러옴
  useEffect(() => {
    let alive = true;
    dataRef.current = DEFAULT_DATA;
    setData(DEFAULT_DATA);
    taskRef.current?.cancel();
    setModel({ status: "idle" });

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
          // 단계 구성이 바뀌어 없는 단계가 저장돼 있으면 처음부터
          lastStep: ONBOARDING_STEPS.includes(saved.lastStep)
            ? saved.lastStep
            : DEFAULT_DATA.lastStep,
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

  useEffect(() => () => taskRef.current?.cancel(), []);

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

  const loadModelInfo = useCallback(async () => {
    setModel({ status: "loadingInfo" });
    try {
      const info = await modelService.getLatest();
      const installed = await modelService.isInstalled(info.version);
      setModel(installed ? { status: "done", info } : { status: "ready", info });
    } catch {
      setModel({ status: "infoError" });
    }
  }, []);

  const startModelDownload = useCallback(() => {
    const prev = modelRef.current;
    if (prev.status !== "ready" && prev.status !== "failed") return;

    const { info } = prev;
    // 연속으로 눌러도 한 번만 시작되도록 ref를 먼저 바꿈
    modelRef.current = { status: "downloading", info, received: 0 };
    setModel(modelRef.current);
    const task = modelService.startDownload(info, ({ receivedBytes }) => {
      setModel(cur =>
        cur.status === "downloading" ? { ...cur, received: receivedBytes } : cur
      );
    });
    taskRef.current = task;
    task.done
      .then(() => setModel({ status: "done", info }))
      .catch(error => {
        if (getErrorCode(error) === MODEL_ERROR_CODE.canceled) return;
        setModel(cur => ({
          status: "failed",
          info,
          received: cur.status === "downloading" ? cur.received : 0,
        }));
      })
      .finally(() => {
        if (taskRef.current === task) taskRef.current = null;
      });
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      data,
      update,
      model,
      loadModelInfo,
      startModelDownload,
    }),
    [hydrated, data, update, model, loadModelInfo, startModelDownload]
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
