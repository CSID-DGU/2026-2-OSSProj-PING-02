import type { ReactNode } from "react";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@core/ui/header";

// 01-2 ~ 01-5 공통 틀: 뒤로가기 헤더 + 스크롤 영역(키보드가 올라오면 함께 밀림)
interface AuthLayoutProps {
  title: string;
  gap?: number;
  paddingBottom?: number;
  children: ReactNode;
}

const AuthLayout = ({
  title,
  gap = 16,
  paddingBottom = 20,
  children,
}: AuthLayoutProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <Wrapper $top={insets.top}>
      <Header title={title} onBack={navigation.goBack} />
      {/* edge-to-edge라 adjustResize만으로는 안 밀려서 padding으로 처리 */}
      <KeyboardAvoiding behavior="padding">
        <Scroll
          keyboardShouldPersistTaps="handled"
          $gap={gap}
          $bottom={paddingBottom + insets.bottom}
        >
          {children}
        </Scroll>
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

export default AuthLayout;
