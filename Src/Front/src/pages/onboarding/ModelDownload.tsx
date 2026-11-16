import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import ProgressBar from "@components/onboarding/ProgressBar";
import SkipButton from "@components/onboarding/SkipButton";
import { formatBytes } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { services, type ConnectionType } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./ModelDownload_styled";

// AI 모델 다운로드 (Figma에 없음, 05 연동 앱 다음)
// 기기 안 소형 모델: 대화 원문에서 이름·전화번호 같은 민감한 내용을 먼저 가림
// → 가린 내용만 중간 서버를 거쳐 외부 AI로 (03 개인정보 안내와 같은 구조)
// 다운로드는 OnboardingProvider가 들고 있어서 다음 단계로 넘어가도 계속됨
const ModelDownload = () => {
  const theme = useTheme();
  const { goNext } = useOnboardingStep("ModelDownload");
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
          <Notice tone="danger" align="center" title="모델 정보를 불러오지 못했어요">
            <Button variant="text" onPress={loadModelInfo}>
              다시 시도하기
            </Button>
          </Notice>
        );

      case "ready":
        return connection === "none" ? (
          <Notice tone="danger" align="center" title="인터넷에 연결되어 있지 않아요">
            연결된 뒤에 받을 수 있어요. 나중에 받아도 괜찮아요.
          </Notice>
        ) : (
          <Notice align="center" title="Wi-Fi에서 받는 걸 권해요">
            {`파일이 약 ${size}라서, 모바일 데이터로 받으면 요금이 나올 수 있어요.`}
          </Notice>
        );

      case "downloading":
      case "failed": {
        const ratio = model.received / model.info.sizeBytes;
        return (
          <>
            <s.ProgressBox>
              <ProgressBar value={ratio} accessibilityLabel="가리기 모델 받는 중" />
              <s.ProgressText>
                {`${Math.floor(ratio * 100)}% · ${formatBytes(
                  model.received
                )} / ${size}`}
              </s.ProgressText>
            </s.ProgressBox>
            {model.status === "downloading" ? (
              <Notice align="center" title="받는 동안 다음 단계로 넘어가도 돼요">
                화면을 옮겨도 계속 받아져요. 다 받으면 완료 화면에서 알려 드릴게요.
              </Notice>
            ) : (
              <Notice tone="danger" align="center" title="다운로드가 멈췄어요">
                연결 상태를 확인하고 다시 시도해 주세요. 나중에 받아도 괜찮아요.
              </Notice>
            )}
          </>
        );
      }

      case "done":
        return (
          <Notice tone="success" align="center" title="가리기 모델이 준비됐어요">
            이제 민감한 내용은 이 기기 안에서 먼저 가려져요
          </Notice>
        );
    }
  };

  const renderFooter = () => {
    const later = (
      <SkipButton onPress={goNext}>나중에 받을게요</SkipButton>
    );
    switch (model.status) {
      case "ready":
        return (
          <>
            {later}
            <Button
              variant="primary"
              fullWidth
              onPress={handleStart}
              disabled={connection === "none"}
            >
              {`받기 시작 (${size})`}
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
            {later}
            <Button variant="primary" fullWidth onPress={handleStart}>
              다시 시도하기
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
        return later;
    }
  };

  return (
    <AuthLayout centered gap={24} footer={renderFooter()}>
      <AuthIntro
        variant="onboarding"
        title={"민감한 내용을 먼저 가려 줄\n작은 AI를 받아요"}
        description={
          "이름·전화번호 같은 민감한 내용은 이 기기 안에서 먼저 가리고,\n가린 내용만 AI에 전달해요. 한 번만 받으면 돼요."
        }
      />

      <s.Boxes>{renderBody()}</s.Boxes>

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
