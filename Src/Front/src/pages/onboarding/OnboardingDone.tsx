import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card, CardDescription, CardTitle } from "@core/ui/card";
import { SuccessIcon } from "@core/ui/icon";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import ProgressBar from "@components/onboarding/ProgressBar";
import {
  PERMISSION_COPY,
  SKIPPED_STEP_LABEL,
  type SkippableStep,
} from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  PERMISSION_KEYS,
  services,
  type PermissionStatusMap,
} from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./OnboardingDone_styled";

type PermissionCheck =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; map: PermissionStatusMap };

interface PendingItem {
  step: SkippableStep;
  description: string;
}

// 08 / 완료 (온보딩 6단계) → 홈
// 건너뛴 단계가 있으면 부담 없이 "지금 할게요"로 돌아갈 수 있게 안내
const OnboardingDone = () => {
  const theme = useTheme();
  const { navigation, progress } = useOnboardingStep("OnboardingDone");
  const { data, update, model, loadModelInfo } = useOnboarding();
  const [permissions, setPermissions] = useState<PermissionCheck>({
    status: "loading",
  });
  const [finishing, setFinishing] = useState(false);

  // 권한은 설정에서 바뀌었을 수 있어서 화면에 올 때마다 실제 상태로 확인
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      services.permission
        .checkAll()
        .then(map => alive && setPermissions({ status: "ready", map }))
        .catch(() => alive && setPermissions({ status: "error" }));
      return () => {
        alive = false;
      };
    }, [])
  );

  // 이어서 하기로 이 화면부터 열었으면 모델 설치 여부를 아직 모름
  useEffect(() => {
    if (model.status === "idle") loadModelInfo();
  }, [model.status, loadModelInfo]);

  const pending: PendingItem[] = [];

  if (permissions.status === "ready") {
    const off = PERMISSION_KEYS.filter(k => permissions.map[k] !== "granted");
    if (off.length > 0) {
      pending.push({
        step: "Permissions",
        description: `${off
          .map(k => PERMISSION_COPY[k].title)
          .join(", ")} 권한이 꺼져 있어요.`,
      });
    }
  } else if (
    permissions.status === "error" &&
    data.skipped.includes("Permissions")
  ) {
    pending.push({
      step: "Permissions",
      description: "켜지 않은 권한이 있어요.",
    });
  }

  if (
    model.status === "ready" ||
    model.status === "failed" ||
    model.status === "infoError"
  ) {
    pending.push({
      step: "ModelDownload",
      description:
        model.status === "failed"
          ? "받다가 멈췄어요. 다시 받을 수 있어요."
          : "아직 받지 않았어요. 받기 전에는 답장 제안을 쓸 수 없어요.",
    });
  }

  if (data.skipped.includes("AiMemory") && !data.memory) {
    pending.push({
      step: "AiMemory",
      description: "비워 뒀어요. 쓰지 않아도 앱은 그대로 쓸 수 있어요.",
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
      title="준비 완료"
      progress={progress}
      footer={
        <Button
          variant="primary"
          fullWidth
          onPress={handleFinish}
          disabled={finishing}
          accessibilityState={{ busy: finishing, disabled: finishing }}
        >
          홈으로 가기
        </Button>
      }
    >
      <s.Hero>
        <SuccessIcon />
      </s.Hero>
      <AuthIntro
        variant="onboarding"
        title="이제 말씨앗을 쓸 수 있어요"
        description="천천히 둘러보세요. 답장은 준비됐을 때 해도 괜찮아요."
      />

      {model.status === "downloading" && (
        <Card>
          <CardTitle>AI 모델을 받고 있어요</CardTitle>
          <s.ModelProgress>
            <ProgressBar
              value={model.received / model.info.sizeBytes}
              accessibilityLabel="AI 모델 받는 중"
            />
          </s.ModelProgress>
          <CardDescription>
            홈으로 가도 계속 받아져요. 다 받으면 답장 제안을 쓸 수 있어요.
          </CardDescription>
        </Card>
      )}

      {permissions.status === "loading" && (
        <s.Center>
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="남은 설정을 확인하는 중"
          />
        </s.Center>
      )}

      {permissions.status !== "loading" &&
        (pending.length === 0 ? (
          <Notice tone="success" title="모든 준비를 마쳤어요" />
        ) : (
          <s.Pending>
            <s.PendingTitle accessibilityRole="header">
              건너뛴 단계가 있어요
            </s.PendingTitle>
            <s.PendingNote>
              지금 하지 않아도 괜찮아요. 마음이 내킬 때 설정에서 이어서 할 수
              있어요.
            </s.PendingNote>
            {pending.map(item => (
              <Card key={item.step}>
                <CardTitle>{SKIPPED_STEP_LABEL[item.step]}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
                <s.PendingAction>
                  <Button
                    variant="text"
                    onPress={() => navigation.popTo(item.step)}
                    accessibilityLabel={`${SKIPPED_STEP_LABEL[item.step]} 지금 할게요`}
                  >
                    지금 할게요
                  </Button>
                </s.PendingAction>
              </Card>
            ))}
          </s.Pending>
        ))}
    </AuthLayout>
  );
};

export default OnboardingDone;
