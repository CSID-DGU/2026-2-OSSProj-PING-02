import { useEffect } from "react";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import Notice from "@components/onboarding/Notice";
import ProgressBar from "@components/onboarding/ProgressBar";
import { useOnboarding } from "@stores/OnboardingProvider";

// 가리기 모델이 아직 없을 때 홈·연락 화면 위에 보여 주는 안내
// 모델 없이도 메시지는 볼 수 있고(기본 카드), 요약·답장 후보만 받은 뒤에 열림
const ModelNotice = () => {
  const { model, loadModelInfo, startModelDownload } = useOnboarding();

  useEffect(() => {
    if (model.status === "idle") loadModelInfo();
  }, [model.status, loadModelInfo]);

  switch (model.status) {
    case "done":
    case "idle":
    case "loadingInfo":
      return null;

    case "downloading":
      return (
        <Notice title="가리기 모델을 받고 있어요">
          <Progress>
            <ProgressBar
              value={model.received / model.info.sizeBytes}
              accessibilityLabel="가리기 모델 받는 중"
            />
          </Progress>
        </Notice>
      );

    default:
      return (
        <Notice title="요약은 가리기 모델을 받은 뒤에 보여요">
          <Description>
            지금은 받은 메시지만 그대로 보여 드려요. 원할 때 받아도 괜찮아요.
          </Description>
          <Action>
            <Button
              variant="text"
              onPress={
                model.status === "infoError" ? loadModelInfo : startModelDownload
              }
            >
              {model.status === "failed" ? "다시 받기" : "지금 받기"}
            </Button>
          </Action>
        </Notice>
      );
  }
};

const Progress = styled.View`
  padding-top: 4px;
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.feedbackInfoText};
`;

const Action = styled.View`
  align-items: flex-end;
`;

export default ModelNotice;
