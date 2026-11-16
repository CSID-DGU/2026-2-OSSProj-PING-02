import type { ReactNode } from "react";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@core/ui/header";
import StepProgress, {
  type StepProgressProps,
} from "@components/onboarding/StepProgress";

// 01-2 ~ 01-5, 온보딩 공통 틀: 뒤로가기 헤더 + 스크롤 영역(키보드가 올라오면 함께 밀림)
interface AuthLayoutProps {
  title: string;
  gap?: number;
  paddingBottom?: number;
  // 기본은 이전 화면으로. null이면 뒤로가기 버튼을 숨김 (온보딩 첫 단계 등)
  onBack?: (() => void) | null;
  // 온보딩 단계 화면: 헤더 아래 진행 단계 표시
  progress?: StepProgressProps;
  // 화면 아래 고정 버튼 영역 (키보드가 올라오면 키보드 위로 올라감)
  footer?: ReactNode;
  children: ReactNode;
}

const AuthLayout = ({
  title,
  gap = 16,
  paddingBottom = 20,
  onBack,
  progress,
  footer,
  children,
}: AuthLayoutProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleBack = onBack === undefined ? navigation.goBack : onBack;

  return (
    <Wrapper $top={insets.top}>
      <Header title={title} onBack={handleBack ?? undefined} />
      {progress && <StepProgress {...progress} />}
      {/* edge-to-edge라 adjustResize만으로는 안 밀려서 padding으로 처리 */}
      <KeyboardAvoiding behavior="padding">
        <Scroll
          keyboardShouldPersistTaps="handled"
          $gap={gap}
          $bottom={paddingBottom + (footer ? 0 : insets.bottom)}
        >
          {children}
        </Scroll>
        {footer && <Footer $bottom={insets.bottom}>{footer}</Footer>}
      </KeyboardAvoiding>
    </Wrapper>
  );
};

const Wrapper = styled.View<{ $top: number }>`
  flex: 1;
  padding-top: ${({ $top }) => $top}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const KeyboardAvoiding = styled.KeyboardAvoidingView`
  flex: 1;
`;

// 내용 영역 여백·간격은 contentContainerStyle로만 줄 수 있어 attrs로 전달
const Scroll = styled.ScrollView.attrs<{ $gap: number; $bottom: number }>(
  ({ $gap, $bottom }) => ({
    contentContainerStyle: {
      gap: $gap,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: $bottom,
    },
  })
)``;

const Footer = styled.View<{ $bottom: number }>`
  gap: 4px;
  padding: 12px 20px ${({ $bottom }) => $bottom + 16}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export default AuthLayout;
