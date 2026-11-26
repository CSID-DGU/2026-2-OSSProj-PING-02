import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { HelpMode } from "@constants/homeHelp";
import { services, STORAGE_KEYS } from "@services";
import { useSession } from "@stores/SessionProvider";

// 오늘의 도움 수준 (하루 한 번): 기기에 날짜와 함께 저장, 날짜가 바뀌면 "아직 선택하지 않음"
// mode null = 오늘 건너뛰었음 (홈은 아직 선택하지 않음과 같게 보임)
// TODO(백엔드): 도움 수준 API가 있으면 여기서 함께 저장
interface Saved {
  date: string; // 기기 시간 기준 "YYYY-MM-DD"
  mode: HelpMode | null;
}

const todayKey = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

export const useHomeHelp = () => {
  const { session } = useSession();
  const userId = session.status === "signedIn" ? session.user.id : null;
  const key = userId ? `${STORAGE_KEYS.homeHelp}.${userId}` : null;
  // 오늘 고른 모드 (없으면 null)
  const [mode, setMode] = useState<HelpMode | null>(null);

  // 화면에 돌아올 때마다 다시 읽음 (C02에서 고르고 돌아온 경우, 날짜가 바뀐 경우)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!key) return;
      services.storage
        .getItem(key)
        .then(raw => {
          if (!alive) return;
          const saved: Saved | null = raw ? JSON.parse(raw) : null;
          setMode(saved && saved.date === todayKey() ? saved.mode : null);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [key])
  );

  // 오늘 모드 저장 (null = 오늘은 건너뛰기)
  const save = useCallback(
    async (next: HelpMode | null) => {
      setMode(next);
      if (!key) return;
      const value: Saved = { date: todayKey(), mode: next };
      await services.storage.setItem(key, JSON.stringify(value));
    },
    [key]
  );

  return { mode, save };
};
