import { useState, type ReactNode } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import styled, { css } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@core/ui/header";

// 01-2 ~ 01-5, 온보딩 공통 틀: (헤더) + 스크롤 영역(키보드가 올라오면 함께 밀림) + 하단 버튼
interface AuthLayoutProps {
  // 있으면 제목 + 뒤로가기 헤더 (인증 화면)
  title?: string;
  // 제목 없이 왼쪽 위 뒤로가기 화살표만 (온보딩 02-1 제외 단계)
  // TODO(디자이너 공유): Figma 온보딩에는 헤더가 없음. 실기기 확인 후 뒤로가기를 보이게 추가
  backOnly?: boolean;
  gap?: number;
  paddingBottom?: number;
  // 헤더가 있을 때: 기본은 이전 화면으로(안드로이드 뒤로가기와 같음), null이면 버튼을 숨김
  onBack?: (() => void) | null;
  // 화면 아래 고정 버튼 영역 (키보드가 올라오면 키보드 위로 올라감)
  footer?: ReactNode;
  // 내용이 짧으면 세로 가운데에 둠 (온보딩 안내 화면)
  centered?: boolean;
  // false면 스크롤 없이 children이 남은 높이를 채움 (FlatList를 직접 쓰는 화면)
  scrollable?: boolean;
  // 하단 버튼 위 구분선: auto = 아래에 가려진 내용이 있을 때만 (스크롤 화면)
  // 직접 FlatList를 쓰는 화면은 스크롤 위치를 알 수 없어 always로 지정
  footerDivider?: "auto" | "always" | "none";
  children: ReactNode;
}

const AuthLayout = ({
  title,
  backOnly = false,
  gap = 16,
  paddingBottom = 20,
  onBack,
  footer,
  centered = false,
  scrollable = true,
  footerDivider = scrollable ? "auto" : "none",
  children,
}: AuthLayoutProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleBack = onBack === undefined ? navigation.goBack : onBack;

  // 아래에 더 볼 내용이 있으면 버튼 영역 위에 구분선 (목록이 뚝 잘려 보이지 않게)
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const hiddenBelow = contentHeight - (scrollY + viewport) > 1;
  const showDivider =
    footerDivider === "always" || (footerDivider === "auto" && hiddenBelow);

  return (
    <Wrapper $top={insets.top}>
      {(title !== undefined || backOnly) && (
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
            onLayout={(e: LayoutChangeEvent) =>
              setViewport(e.nativeEvent.layout.height)
            }
            onContentSizeChange={(_: number, h: number) => setContentHeight(h)}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
              setScrollY(e.nativeEvent.contentOffset.y)
            }
            scrollEventThrottle={32}
          >
            {children}
          </Scroll>
        ) : (
          <Fill>{children}</Fill>
        )}
        {footer && (
          <Footer $bottom={insets.bottom} $divider={showDivider}>
            {footer}
          </Footer>
        )}
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
// 구분선은 그라데이션 라이브러리 없이 border/default 1px로
const Footer = styled.View<{ $bottom: number; $divider: boolean }>`
  gap: 8px;
  padding: 12px 20px ${({ $bottom }) => $bottom + 24}px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  border-top-width: 1px;
  ${({ theme, $divider }) => css`
    border-top-color: ${$divider ? theme.colors.borderDefault : "transparent"};
  `}
`;

export default AuthLayout;
