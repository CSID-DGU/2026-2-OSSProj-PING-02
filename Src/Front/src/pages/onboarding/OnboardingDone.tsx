import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Illustration from "@components/onboarding/Illustration";
import Notice from "@components/onboarding/Notice";
import ProgressBar from "@components/onboarding/ProgressBar";
import SkipButton from "@components/onboarding/SkipButton";
import type { OnboardingStep } from "@constants/onboarding";
import { ONBOARDING_IMAGES } from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { services, type PermissionStatusMap } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./OnboardingDone_styled";

type PermissionCheck =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; map: PermissionStatusMap };

interface PendingItem {
  step: OnboardingStep;
  label: string;
  description: string;
}

// 12 / 온보딩 완료 → 홈
// Figma에 없는 "건너뛴 단계" 안내: 실제 상태(권한·친구·모델·메모)로 판단해 부드러운 상자 + 텍스트 버튼
const OnboardingDone = () => {
  const theme = useTheme();
  const { navigation } = useOnboardingStep("OnboardingDone");
  const { data, update, model, loadModelInfo } = useOnboarding();
  const [permissions, setPermissions] = useState<PermissionCheck>({
    status: "loading",
  });
  const [finishing, setFinishing] = useState(false);

  // 권한은 설정에서 바뀌었을 수 있어서 화면에 올 때마다 실제 상태로 확인
  const checkPermissions = useCallback(() => {
    let alive = true;
    setPermissions({ status: "loading" });
    services.permission
      .checkAll()
      .then(map => alive && setPermissions({ status: "ready", map }))
      .catch(() => alive && setPermissions({ status: "error" }));
    return () => {
      alive = false;
    };
  }, []);
  useFocusEffect(checkPermissions);

  // 이어서 하기로 이 화면부터 열었으면 모델 설치 여부를 아직 모름
  useEffect(() => {
    if (model.status === "idle") loadModelInfo();
  }, [model.status, loadModelInfo]);

  const pending: PendingItem[] = [];
  if (permissions.status === "ready") {
    const { map } = permissions;
    if (map.notificationListener !== "granted") {
      pending.push({
        step: "NotificationAccess",
        label: "알림 접근",
        description: "꺼져 있으면 대화 정리와 답장 제안을 쓸 수 없어요",
      });
    }
    if (data.notificationPrefs.length > 0 && map.postNotifications !== "granted") {
      pending.push({
        step: "NotificationTypes",
        label: "앱 알림",
        description: "고른 알림을 받으려면 알림 권한이 필요해요",
      });
    }
    if (map.batteryOptimization !== "granted") {
      pending.push({
        step: "BatteryOptimization",
        label: "배터리 최적화 예외",
        description: "가끔 알림을 늦게 받을 수 있어요",
      });
    }
  }
  if (data.friends.length === 0) {
    pending.push({
      step: "ContactsImport",
      label: "친구 목록 만들기",
      description: "메신저 알림이 오면 하나씩 추가할 수도 있어요",
    });
  }
  if (
    model.status === "ready" ||
    model.status === "failed" ||
    model.status === "infoError"
  ) {
    pending.push({
      step: "ModelDownload",
      label: "가리기 모델 받기",
      description: "받기 전에는 AI 답장 제안을 쓸 수 없어요",
    });
  }
  if (!data.memory.status.trim() && !data.memory.avoid.trim()) {
    pending.push({
      step: "AiMemory",
      label: "AI 메모리",
      description: "비워 둬도 앱은 그대로 쓸 수 있어요",
    });
  }

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    // 저장이 실패해도 홈으로 보냄 (다음 실행 때 온보딩이 다시 보일 뿐)
    await update({ completed: true }).catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  return (
    <AuthLayout
      centered
      gap={24}
      footer={
        <Button
          variant="primary"
          fullWidth
          onPress={handleFinish}
          disabled={finishing}
          accessibilityState={{ busy: finishing, disabled: finishing }}
        >
          말씨앗 시작하기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"이제 준비가\n모두 끝났어요"}
        description={
          "연락은 조용히 모으고, 도움의 정도와\n최종 답장은 언제나 직접 선택해요"
        }
      />
      <Illustration image={ONBOARDING_IMAGES.sittingSeeds} />

      <s.Boxes>
        <Notice tone="success" align="center" title="말씨앗의 약속">
          앞으로 도착하는 알림만, 선택한 앱 범위에서 수집해요
        </Notice>

        {model.status === "downloading" && (
          <Notice align="center" title="가리기 모델을 받고 있어요">
            <s.Progress>
              <ProgressBar
                value={model.received / model.info.sizeBytes}
                accessibilityLabel="가리기 모델 받는 중"
              />
            </s.Progress>
          </Notice>
        )}

        {permissions.status === "loading" && (
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="남은 설정을 확인하는 중"
          />
        )}

        {permissions.status === "error" && (
          <Notice tone="danger" align="center" title="남은 설정을 확인하지 못했어요">
            <Button variant="text" onPress={checkPermissions}>
              다시 확인하기
            </Button>
          </Notice>
        )}

        {permissions.status === "ready" && pending.length > 0 && (
          <Notice align="center" title="건너뛴 단계가 있어요">
            <s.PendingNote>
              지금 하지 않아도 괜찮아요. 마음이 내킬 때 이어서 할 수 있어요.
            </s.PendingNote>
            {pending.map(item => (
              <s.PendingRow key={item.step}>
                <s.PendingTexts>
                  <s.PendingLabel>{item.label}</s.PendingLabel>
                  <s.PendingDescription>{item.description}</s.PendingDescription>
                </s.PendingTexts>
                <SkipButton
                  onPress={() => navigation.popTo(item.step)}
                  accessibilityLabel={`${item.label} 지금 할게요`}
                >
                  지금 할게요
                </SkipButton>
              </s.PendingRow>
            ))}
          </Notice>
        )}
      </s.Boxes>
    </AuthLayout>
  );
};

export default OnboardingDone;
