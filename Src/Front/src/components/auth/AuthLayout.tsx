import type { ReactNode } from "react";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@core/ui/header";

// 01-2 ~ 01-5, 온보딩 공통 틀: (헤더) + 스크롤 영역(키보드가 올라오면 함께 밀림) + 하단 버튼
interface AuthLayoutProps {
  // 있으면 뒤로가기 헤더를 보여 줌 (인증 화면). 온보딩은 Figma에 헤더가 없어서 생략
  title?: string;
  gap?: number;
  paddingBottom?: number;
  // 헤더가 있을 때: 기본은 이전 화면으로, null이면 뒤로가기 버튼을 숨김
  onBack?: (() => void) | null;
  // 화면 아래 고정 버튼 영역 (키보드가 올라오면 키보드 위로 올라감)
  footer?: ReactNode;
  // 내용이 짧으면 세로 가운데에 둠 (온보딩 안내 화면)
  centered?: boolean;
  // false면 스크롤 없이 children이 남은 높이를 채움 (FlatList를 직접 쓰는 화면)
  scrollable?: boolean;
  children: ReactNode;
}

const AuthLayout = ({
  title,
  gap = 16,
  paddingBottom = 20,
  onBack,
  footer,
  centered = false,
  scrollable = true,
  children,
}: AuthLayoutProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleBack = onBack === undefined ? navigation.goBack : onBack;

  return (
    <Wrapper $top={insets.top}>
      {title !== undefined && (
        <Header title={title} onBack={handleBack ?? undefined} />
      )}
      {/* edge-to-edge라 adjustResize만으로는 안 밀려서 padding으로 처리 */}
      <KeyboardAvoiding behavior="padding">
        {scrollable ? (
          <Scroll
            keyboardShouldPersistTaps="handled"
            $gap={gap}
            $bottom={paddingBottom + (footer ? 0 : insets.bottom)}
            $centered={centered}
          >
            {children}
          </Scroll>
        ) : (
          <Fill>{children}</Fill>
        )}
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
const Scroll = styled.ScrollView.attrs<{
  $gap: number;
  $bottom: number;
  $centered: boolean;
}>(({ $gap, $bottom, $centered }) => ({
  contentContainerStyle: {
    gap: $gap,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: $bottom,
    ...($centered && { flexGrow: 1, justifyContent: "center" as const }),
  },
}))``;

const Fill = styled.View`
  flex: 1;
`;

// Figma 온보딩: 버튼 아래 여백 약 49dp(제스처 영역 포함) → 안전 영역 + 24
const Footer = styled.View<{ $bottom: number }>`
  gap: 8px;
  padding: 12px 20px ${({ $bottom }) => $bottom + 24}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

export default AuthLayout;
