import { ActivityIndicator } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import type { PermissionStepState } from "@hooks/usePermissionStep";
import Notice, { type NoticeAlign } from "./Notice";

// 권한 화면(04·06·07·08)에서 Figma에 없는 상태를 보여 주는 부드러운 안내 상자
// 로딩·오류·켜짐·설정 대기·설정 복귀 후 꺼짐·거절
interface PermissionGuideProps {
  state: PermissionStepState;
  label: string; // 권한 이름 (예: "알림 접근")
  consequence: string; // 꺼 두면 어떻게 되는지 (압박하지 않는 문장)
  // 안내가 없을 때는 아무것도 그리지 않음. 켜짐 안내를 생략하고 싶으면 false
  showGranted?: boolean;
  // 같은 화면의 다른 안내 상자와 맞춤 (06은 왼쪽 정렬 파란 상자)
  align?: NoticeAlign;
}

const PermissionGuide = ({
  state,
  label,
  consequence,
  showGranted = true,
  align = "center",
}: PermissionGuideProps) => {
  const theme = useTheme();
  const { load, status, granted, guide } = state;

  if (load === "loading") {
    return (
      <Center>
        <ActivityIndicator
          color={theme.colors.iconSubtle}
          accessibilityLabel={`${label} 권한 상태를 확인하는 중`}
        />
      </Center>
    );
  }

  if (load === "error") {
    return (
      <Notice tone="danger" align={align} title="권한 상태를 확인하지 못했어요">
        <Button variant="text" onPress={state.retry}>
          다시 확인하기
        </Button>
      </Notice>
    );
  }

  if (granted) {
    return showGranted ? (
      <Notice tone="success" align={align} title={`${label} 권한이 켜져 있어요`} />
    ) : null;
  }

  if (guide === "awaiting") {
    return (
      <Notice align={align} title="설정에서 돌아오면 바로 확인할게요">
        설정에서 ‘말씨앗’을 찾아 켜 주세요.
      </Notice>
    );
  }

  if (guide === "stillOff") {
    return (
      <Notice align={align} title="아직 꺼져 있어요">
        {`${consequence} 지금 켜지 않아도 괜찮아요.`}
      </Notice>
    );
  }

  if (guide === "denied") {
    return (
      <Notice align={align} title="괜찮아요, 나중에 켜도 돼요">
        {status === "blocked"
          ? `이제는 휴대폰 설정에서만 켤 수 있어요. ${consequence}`
          : consequence}
      </Notice>
    );
  }

  return null;
};

const Center = styled.View`
  min-height: 48px;
  justify-content: center;
  align-items: center;
`;

export default PermissionGuide;
