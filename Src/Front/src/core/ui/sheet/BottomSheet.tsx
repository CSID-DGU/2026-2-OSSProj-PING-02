import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Modal, StyleSheet } from "react-native";
import styled from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../button";

// Figma: 05 연락 Screens(11.22) D03 "날짜와 시간 직접 선택", "나중에 답하기 선택", "인원 설정",
//        "메신저 연결 관리" 시트 (720px 시안 → dp는 ÷2)
// 위 모서리 28dp · 손잡이 44×4dp · 제목 18 Bold 가운데 · 좌우 20dp
// 닫기: 딤 누르기, 안드로이드 뒤로가기(Modal onRequestClose), 취소 버튼
export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  // 아래 고정 영역 (BottomSheetActions 등). 내용이 길어도 스크롤되지 않음
  footer?: ReactNode;
  // false면 children이 직접 스크롤을 맡음 (FlatList 등)
  scrollable?: boolean;
  dismissOnBackdrop?: boolean;
  // 화면 대비 최대 높이 (기본 90%)
  maxHeight?: `${number}%`;
  testID?: string;
}

const SLIDE_FROM = 400;

export const BottomSheet = ({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  scrollable = true,
  dismissOnBackdrop = true,
  maxHeight = "90%",
  testID,
}: BottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SLIDE_FROM)).current;

  // Modal 자체는 딤만 fade, 시트는 아래에서 밀려 올라옴
  useEffect(() => {
    if (!visible) return;
    translateY.setValue(SLIDE_FROM);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Container>
        <Dim
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          importantForAccessibility={dismissOnBackdrop ? "yes" : "no"}
        />
        <Sheet
          testID={testID}
          accessibilityViewIsModal
          style={{ maxHeight, transform: [{ translateY }] }}
          $bottom={insets.bottom}
        >
          <Handle importantForAccessibility="no" />
          {(title || description) && (
            <Head>
              {title && <Title accessibilityRole="header">{title}</Title>}
              {description && <Description>{description}</Description>}
            </Head>
          )}
          {scrollable ? (
            <Scroll
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {children}
            </Scroll>
          ) : (
            <Fill>{children}</Fill>
          )}
          {footer && <Footer>{footer}</Footer>}
        </Sheet>
      </Container>
    </Modal>
  );
};

// 시트 아래 버튼 묶음: 노란 주요 버튼 + "취소" 텍스트 버튼 (시안 공통)
export interface BottomSheetActionsProps {
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  // 없으면 취소 버튼을 숨김
  onCancel?: () => void;
}

export const BottomSheetActions = ({
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  cancelLabel = "취소",
  onCancel,
}: BottomSheetActionsProps) => (
  <>
    <Button
      variant="primary"
      fullWidth
      onPress={onConfirm}
      disabled={confirmDisabled}
    >
      {confirmLabel}
    </Button>
    {onCancel && (
      <Button variant="text" typo="bodyLarge" onPress={onCancel}>
        {cancelLabel}
      </Button>
    )}
  </>
);

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
});

const Container = styled.View`
  flex: 1;
  justify-content: flex-end;
`;

const Dim = styled.Pressable`
  background-color: ${({ theme }) => theme.colors.overlayDim};
`;

const Sheet = styled(Animated.View)<{ $bottom: number }>`
  padding-top: 12px;
  padding-bottom: ${({ $bottom }) => $bottom + 12}px;
  border-top-left-radius: 28px;
  border-top-right-radius: 28px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Handle = styled.View`
  align-self: center;
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.colors.borderDefault};
`;

const Head = styled.View`
  gap: 6px;
  padding: 24px 20px 16px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const Scroll = styled.ScrollView`
  flex-grow: 0;
`;

const Fill = styled.View`
  flex-shrink: 1;
`;

const Footer = styled.View`
  align-items: center;
  gap: 8px;
  padding: 16px 20px 0px;
`;

export default BottomSheet;
