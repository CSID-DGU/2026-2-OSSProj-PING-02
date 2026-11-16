import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useAppForeground } from "./useAppForeground";
import {
  services,
  type PermissionKey,
  type PermissionStatus,
} from "@services";

export type PermissionLoad = "loading" | "error" | "ready";

// 지금 보여 줄 안내
// - awaiting: 설정으로 보냈고 돌아오기를 기다리는 중
// - stillOff: 설정에서 돌아왔는데 아직 꺼져 있음
// - denied  : 시스템 팝업에서 거절함 (status가 blocked면 이제 설정에서만 켤 수 있음)
export type PermissionGuide = "awaiting" | "stillOff" | "denied";

export interface PermissionStepState {
  load: PermissionLoad;
  status?: PermissionStatus;
  granted: boolean;
  guide?: PermissionGuide;
  requesting: boolean;
  request: () => Promise<PermissionStatus | undefined>;
  retry: () => void;
}

// 권한 하나를 다루는 온보딩 화면(04·06·07·08) 공통 로직
// 처음 열 때 상태 확인 → 요청(팝업 또는 설정 이동) → 앱으로 돌아오면 다시 확인
export const usePermissionStep = (
  key: PermissionKey,
  // 켜졌을 때 스크린리더로 알려 줄 이름 (예: "알림 접근")
  label: string
): PermissionStepState => {
  const [load, setLoad] = useState<PermissionLoad>("loading");
  const [status, setStatusState] = useState<PermissionStatus>();
  const [guide, setGuideState] = useState<PermissionGuide>();
  const [requesting, setRequesting] = useState(false);
  const statusRef = useRef<PermissionStatus | undefined>(undefined);
  const guideRef = useRef<PermissionGuide | undefined>(undefined);

  const setGuide = (next?: PermissionGuide) => {
    guideRef.current = next;
    setGuideState(next);
  };

  const applyStatus = useCallback(
    (next: PermissionStatus) => {
      if (statusRef.current && statusRef.current !== "granted" && next === "granted") {
        AccessibilityInfo.announceForAccessibility(`${label} 권한이 켜졌어요`);
      }
      statusRef.current = next;
      setStatusState(next);
    },
    [label]
  );

  // reason
  // - initial     : 처음 화면을 열었을 때 (실패하면 오류 안내)
  // - afterRequest: 요청 직후 (설정 이동 중이면 아직 판단하지 않음)
  // - foreground  : 설정 등에서 앱으로 돌아왔을 때 (여전히 꺼져 있으면 다시 안내)
  const refresh = useCallback(
    async (reason: "initial" | "afterRequest" | "foreground") => {
      if (reason === "initial") setLoad("loading");
      try {
        const next = (await services.permission.checkAll())[key];
        applyStatus(next);
        if (next === "granted") setGuide(undefined);
        else if (reason === "foreground" && guideRef.current === "awaiting") {
          setGuide("stillOff");
        }
        setLoad("ready");
        return next;
      } catch {
        if (reason === "initial") setLoad("error");
        return undefined;
      }
    },
    [key, applyStatus]
  );

  useEffect(() => {
    refresh("initial");
  }, [refresh]);

  useAppForeground(() => {
    refresh("foreground");
  });

  const request = useCallback(async () => {
    if (requesting) return statusRef.current;
    setRequesting(true);
    try {
      if (statusRef.current === "blocked" || guideRef.current === "stillOff") {
        await services.permission.openSettings(key);
        setGuide("awaiting");
      } else {
        const result = await services.permission.request(key);
        if (result.openedSettings) {
          setGuide("awaiting");
        } else {
          applyStatus(result.status);
          setGuide(result.status === "granted" ? undefined : "denied");
        }
      }
      return await refresh("afterRequest");
    } catch {
      setGuide("denied");
      return statusRef.current;
    } finally {
      setRequesting(false);
    }
  }, [key, requesting, refresh, applyStatus]);

  return {
    load,
    status,
    granted: status === "granted",
    guide,
    requesting,
    request,
    retry: () => {
      refresh("initial");
    },
  };
};

// 버튼 문구: 처음엔 화면 고유 문구, 거절·설정 복귀 후에는 상황에 맞게
export const permissionActionLabel = (
  state: Pick<PermissionStepState, "status" | "guide" | "requesting">,
  initialLabel: string
) => {
  if (state.requesting) return "여는 중…";
  if (state.status === "blocked") return "설정 열기";
  if (state.guide === "stillOff" || state.guide === "awaiting") {
    return "설정 다시 열기";
  }
  if (state.guide === "denied") return "다시 요청하기";
  return initialLabel;
};
