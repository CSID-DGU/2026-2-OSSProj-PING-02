import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card, CardDescription } from "@core/ui/card";
import { Dialog } from "@core/ui/dialog";
import { CheckIcon } from "@core/ui/icon";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice, { NoticeDescription } from "@components/onboarding/Notice";
import { PERMISSION_COPY } from "@constants/onboarding";
import { useAppForeground } from "@hooks/useAppForeground";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  PERMISSION_KEYS,
  services,
  type PermissionKey,
  type PermissionStatusMap,
} from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./Permissions_styled";

type LoadState = "loading" | "error" | "ready";

// 권한마다 지금 어떤 안내를 보여 줄지
// - awaiting: 설정으로 보냈고 돌아오기를 기다리는 중
// - stillOff: 설정에서 돌아왔는데 아직 꺼져 있음
// - denied: 시스템 팝업에서 거절함
type Guide = "awaiting" | "stillOff" | "denied";

// 04 / 권한 요청 (온보딩 2단계)
const Permissions = () => {
  const theme = useTheme();
  const { goNext, progress } = useOnboardingStep("Permissions");
  const { setSkipped } = useOnboarding();

  const [load, setLoad] = useState<LoadState>("loading");
  const [statuses, setStatuses] = useState<PermissionStatusMap>();
  const [guides, setGuides] = useState<Partial<Record<PermissionKey, Guide>>>(
    {}
  );
  const [requesting, setRequesting] = useState<PermissionKey | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const guidesRef = useRef(guides);
  const statusesRef = useRef<PermissionStatusMap | undefined>(undefined);

  const setGuide = (key: PermissionKey, guide?: Guide) => {
    guidesRef.current = { ...guidesRef.current, [key]: guide };
    setGuides(guidesRef.current);
  };

  // 새로 켜진 권한은 스크린리더로도 알려 줌
  const applyStatuses = useCallback((next: PermissionStatusMap) => {
    const prev = statusesRef.current;
    PERMISSION_KEYS.forEach(key => {
      if (prev && prev[key] !== "granted" && next[key] === "granted") {
        AccessibilityInfo.announceForAccessibility(
          `${PERMISSION_COPY[key].title} 권한이 켜졌어요`
        );
      }
    });
    statusesRef.current = next;
    setStatuses(next);
  }, []);

  // reason
  // - initial: 처음 화면을 열었을 때 (실패하면 오류 화면)
  // - afterRequest: 요청 직후 (설정 이동 중이면 아직 판단하지 않음)
  // - foreground: 설정 등에서 앱으로 돌아왔을 때 (여전히 꺼져 있으면 다시 안내)
  const refresh = useCallback(
    async (reason: "initial" | "afterRequest" | "foreground") => {
      if (reason === "initial") setLoad("loading");
      try {
        const next = await services.permission.checkAll();
        applyStatuses(next);

        const updated = { ...guidesRef.current };
        PERMISSION_KEYS.forEach(key => {
          if (next[key] === "granted") updated[key] = undefined;
          else if (reason === "foreground" && updated[key] === "awaiting") {
            updated[key] = "stillOff";
          }
        });
        guidesRef.current = updated;
        setGuides(updated);
        setLoad("ready");
      } catch {
        if (reason === "initial") setLoad("error");
      }
    },
    [applyStatuses]
  );

  useEffect(() => {
    refresh("initial");
  }, [refresh]);

  useAppForeground(() => {
    refresh("foreground");
  });

  const handleRequest = async (key: PermissionKey) => {
    if (!statuses || requesting) return;
    setRequesting(key);
    try {
      if (statuses[key] === "blocked" || guidesRef.current[key] === "stillOff") {
        await services.permission.openSettings(key);
        setGuide(key, "awaiting");
      } else {
        const result = await services.permission.request(key);
        if (result.openedSettings) {
          setGuide(key, "awaiting");
        } else {
          applyStatuses({ ...statuses, [key]: result.status });
          setGuide(key, result.status === "granted" ? undefined : "denied");
        }
      }
      await refresh("afterRequest");
    } catch {
      setGuide(key, "denied");
    } finally {
      setRequesting(null);
    }
  };

  const offKeys = statuses
    ? PERMISSION_KEYS.filter(key => statuses[key] !== "granted")
    : PERMISSION_KEYS;
  const allGranted = load === "ready" && offKeys.length === 0;

  const handleNext = () => {
    if (allGranted) {
      setSkipped("Permissions", false).catch(() => {});
      goNext();
    } else {
      setConfirmOpen(true);
    }
  };

  const handleLater = () => {
    setConfirmOpen(false);
    setSkipped("Permissions", !allGranted).catch(() => {});
    goNext();
  };

  const renderItem = (key: PermissionKey) => {
    const copy = PERMISSION_COPY[key];
    const status = statuses?.[key];
    const granted = status === "granted";
    const guide = guides[key];
    const busy = requesting === key;

    const actionLabel = busy
      ? "여는 중…"
      : status === "blocked" || guide === "stillOff"
      ? "설정 열기"
      : guide === "denied"
      ? "다시 요청하기"
      : guide === "awaiting"
      ? "설정 다시 열기"
      : "켜기";

    return (
      <Card key={key}>
        <s.ItemHeader>
          <s.ItemTitle>{copy.title}</s.ItemTitle>
          <s.Status
            $granted={granted}
            accessibilityLabel={`${copy.title} ${granted ? "켜짐" : "꺼짐"}`}
          >
            {granted && (
              <CheckIcon size={14} color={theme.colors.feedbackSuccessText} />
            )}
            <s.StatusText $granted={granted}>
              {granted ? "켜짐" : "꺼짐"}
            </s.StatusText>
          </s.Status>
        </s.ItemHeader>

        <CardDescription>{copy.reason}</CardDescription>

        {!granted && (
          <s.ItemGuide>
            {guide === "awaiting" && (
              <NoticeDescription accessibilityLiveRegion="polite">
                설정에서 ‘말씨앗’을 켜고 돌아오면 바로 확인할게요.
              </NoticeDescription>
            )}
            {guide === "stillOff" && (
              <Notice title="아직 꺼져 있어요">
                {`설정에서 ‘말씨앗’을 찾아 켜 주세요. ${copy.required} 지금 켜지 않아도 괜찮아요.`}
              </Notice>
            )}
            {guide === "denied" && (
              <Notice title="괜찮아요, 나중에 켜도 돼요">
                {status === "blocked"
                  ? `이제는 휴대폰 설정에서만 켤 수 있어요. ${copy.required}`
                  : copy.required}
              </Notice>
            )}
            <Button
              variant="secondary"
              fullWidth
              onPress={() => handleRequest(key)}
              disabled={!!requesting}
              accessibilityLabel={`${copy.title} ${actionLabel}`}
              accessibilityState={{ busy, disabled: !!requesting }}
            >
              {actionLabel}
            </Button>
          </s.ItemGuide>
        )}
      </Card>
    );
  };

  return (
    <AuthLayout
      title="권한 설정"
      progress={progress}
      footer={
        <>
          <Button variant="primary" fullWidth onPress={handleNext}>
            다음
          </Button>
          {!allGranted && (
            <Button variant="text" onPress={handleLater}>
              나중에 할게요
            </Button>
          )}
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title="필요한 권한을 하나씩 안내할게요"
        description="지금 다 켜지 않아도 괜찮아요. 왜 필요한지 읽어 보고 원하는 것만 켜 주세요."
      />

      {load === "loading" && (
        <s.Center>
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="권한 상태를 확인하는 중"
          />
        </s.Center>
      )}

      {load === "error" && (
        <Notice tone="danger" title="권한 상태를 확인하지 못했어요">
          <Button variant="secondary" onPress={() => refresh("initial")}>
            다시 확인하기
          </Button>
        </Notice>
      )}

      {load === "ready" && PERMISSION_KEYS.map(renderItem)}

      <Dialog
        visible={confirmOpen}
        icon={null}
        title="꺼져 있는 권한이 있어요"
        description={`${offKeys
          .map(key => PERMISSION_COPY[key].title)
          .join(", ")} 권한이 꺼져 있어요. 나중에 휴대폰 설정에서 언제든 켤 수 있어요.`}
        confirmLabel="이대로 넘어갈게요"
        onConfirm={handleLater}
        closeLabel="조금 더 볼게요"
        onClose={() => setConfirmOpen(false)}
      />
    </AuthLayout>
  );
};

export default Permissions;
