import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import { SuccessIcon } from "@core/ui/icon";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import ProgressBar from "@components/onboarding/ProgressBar";
import { formatBytes } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { services, type ConnectionType } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./ModelDownload_styled";

// 06 / AI 모델 다운로드 (온보딩 4단계)
// 다운로드는 OnboardingProvider가 들고 있어서 다음 단계로 넘어가도 계속됨
const ModelDownload = () => {
  const theme = useTheme();
  const { goNext, progress } = useOnboardingStep("ModelDownload");
  const { model, loadModelInfo, startModelDownload } = useOnboarding();
  const [connection, setConnection] = useState<ConnectionType>("unknown");
  const [cellularOpen, setCellularOpen] = useState(false);

  useEffect(() => {
    if (model.status === "idle") loadModelInfo();
  }, [model.status, loadModelInfo]);

  useEffect(() => {
    services.network
      .getConnectionType()
      .then(setConnection)
      .catch(() => setConnection("unknown"));
  }, []);

  const size = "info" in model ? formatBytes(model.info.sizeBytes) : undefined;

  const handleStart = () => {
    if (connection === "cellular") setCellularOpen(true);
    else startModelDownload();
  };

  const renderBody = () => {
    switch (model.status) {
      case "idle":
      case "loadingInfo":
        return (
          <s.Center>
            <ActivityIndicator
              color={theme.colors.iconSubtle}
              accessibilityLabel="모델 정보를 확인하는 중"
            />
          </s.Center>
        );

      case "infoError":
        return (
          <Notice tone="danger" title="모델 정보를 불러오지 못했어요">
            <Button variant="secondary" onPress={loadModelInfo}>
              다시 시도하기
            </Button>
          </Notice>
        );

      case "ready":
        return connection === "none" ? (
          <Notice tone="danger" title="인터넷에 연결되어 있지 않아요">
            연결된 뒤에 받을 수 있어요. 나중에 받아도 괜찮아요.
          </Notice>
        ) : (
          <Notice title="Wi-Fi에서 받는 걸 권해요">
            {`파일이 약 ${size}로 커서, 모바일 데이터로 받으면 요금이 나올 수 있어요.`}
          </Notice>
        );

      case "downloading":
      case "failed": {
        const ratio = model.received / model.info.sizeBytes;
        return (
          <>
            <s.ProgressBox>
              <ProgressBar
                value={ratio}
                accessibilityLabel="AI 모델 받는 중"
              />
              <s.ProgressText>
                {Math.floor(ratio * 100)}% · {formatBytes(model.received)} /{" "}
                {size}
              </s.ProgressText>
            </s.ProgressBox>
            {model.status === "downloading" ? (
              <Notice title="받는 동안 다음 단계로 넘어가도 돼요">
                화면을 옮겨도 계속 받아져요. 다 받으면 완료 화면에서 알려
                드릴게요.
              </Notice>
            ) : (
              <Notice tone="danger" title="다운로드가 멈췄어요">
                연결 상태를 확인하고 다시 시도해 주세요. 나중에 받아도
                괜찮아요.
              </Notice>
            )}
          </>
        );
      }

      case "done":
        return (
          <s.Done accessibilityLiveRegion="polite">
            <SuccessIcon />
            <s.DoneText>AI 모델이 준비됐어요</s.DoneText>
          </s.Done>
        );
    }
  };

  const renderFooter = () => {
    switch (model.status) {
      case "ready":
        return (
          <>
            <Button
              variant="primary"
              fullWidth
              onPress={handleStart}
              disabled={connection === "none"}
            >
              {`받기 시작 (${size})`}
            </Button>
            <Button variant="text" onPress={goNext}>
              나중에 받을게요
            </Button>
          </>
        );
      case "downloading":
        return (
          <Button variant="primary" fullWidth onPress={goNext}>
            받는 동안 다음으로
          </Button>
        );
      case "failed":
        return (
          <>
            <Button variant="primary" fullWidth onPress={handleStart}>
              다시 시도하기
            </Button>
            <Button variant="text" onPress={goNext}>
              나중에 받을게요
            </Button>
          </>
        );
      case "done":
        return (
          <Button variant="primary" fullWidth onPress={goNext}>
            다음
          </Button>
        );
      default:
        // 정보를 못 불러와도 막히지 않게 넘어갈 수 있음
        return (
          <Button variant="text" onPress={goNext}>
            나중에 받을게요
          </Button>
        );
    }
  };

  return (
    <AuthLayout
      title="AI 모델 받기"
      progress={progress}
      footer={renderFooter()}
    >
      <AuthIntro
        variant="onboarding"
        title="휴대폰 안에서 쓸 AI를 받아요"
        description="답장 제안은 이 휴대폰 안의 AI가 만들어요. 한 번만 받으면 돼요."
      />

      {renderBody()}

      <Dialog
        visible={cellularOpen}
        icon={null}
        title="모바일 데이터로 받을까요?"
        description={`지금 Wi-Fi가 아니에요. 약 ${size}를 받으면 요금이 나올 수 있어요.`}
        confirmLabel="그래도 받을게요"
        onConfirm={() => {
          setCellularOpen(false);
          startModelDownload();
        }}
        closeLabel="Wi-Fi에서 받을게요"
        onClose={() => setCellularOpen(false)}
      />
    </AuthLayout>
  );
};

export default ModelDownload;
