import { ActivityIndicator } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import Notice from "@components/onboarding/Notice";

// 연락 상세·답장 화면의 로딩 / 오류 (Figma에 없는 상태 → 안내 상자 + 텍스트 버튼)
interface LoadStateProps {
  status: "loading" | "error";
  loadingLabel?: string;
  errorTitle?: string;
  onRetry: () => void;
}

const LoadState = ({
  status,
  loadingLabel = "불러오는 중",
  errorTitle = "내용을 불러오지 못했어요",
  onRetry,
}: LoadStateProps) => {
  const theme = useTheme();
  return (
    <Center>
      {status === "loading" ? (
        <ActivityIndicator
          color={theme.colors.iconSubtle}
          accessibilityLabel={loadingLabel}
        />
      ) : (
        <Notice tone="danger" align="center" title={errorTitle}>
          <Button variant="text" onPress={onRetry}>
            다시 불러오기
          </Button>
        </Notice>
      )}
    </Center>
  );
};

const Center = styled.View`
  padding: 48px 0px;
  justify-content: center;
`;

export default LoadState;
