import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import styled from "styled-components/native";
import { Button } from "../button";
import { SuccessIcon } from "../icon";

// Figma: Dialog / 아이디 찾기 완료, Dialog / 임시 비밀번호 발송 완료
// 사용처: 결과 안내, 바로 보내기 전 확인, 데이터 삭제 확인 등
export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  children?: ReactNode; // 설명 아래 추가 내용 (결과 박스, 안내 문구 등)
  icon?: "success" | ReactNode; // null이면 아이콘 없음 (확인형 팝업)
  confirmLabel: string;
  onConfirm: () => void;
  closeLabel?: string;
  onClose: () => void;
  dismissOnBackdrop?: boolean; // 바깥 딤을 누르면 닫기
}

const Dim = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 0px 20px;
`;

const Backdrop = styled(Pressable)`
  background-color: ${({ theme }) => theme.colors.overlayDim};
`;

const Card = styled.View`
  width: 100%;
  max-width: 320px;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  /* Figma: 0 8px 24px rgba(46, 36, 31, 0.18) */
  shadow-color: #2e241f;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.18;
  shadow-radius: 12px;
  elevation: 8;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const CloseButton = styled.TouchableOpacity`
  justify-content: center;
  align-items: center;
  align-self: stretch;
  height: 36px;
`;

const CloseLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Dialog = ({
  visible,
  title,
  description,
  children,
  icon = "success",
  confirmLabel,
  onConfirm,
  closeLabel = "닫기",
  onClose,
  dismissOnBackdrop = true,
}: DialogProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Dim>
        <Backdrop
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityLabel="팝업 닫기"
        />
        <Card accessibilityRole="alert" accessibilityViewIsModal>
          {icon === "success" ? <SuccessIcon /> : icon}
          <Title>{title}</Title>
          {description && <Description>{description}</Description>}
          {children}
          <Button variant="primary" fullWidth onPress={onConfirm}>
            {confirmLabel}
          </Button>
          <CloseButton
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <CloseLabel>{closeLabel}</CloseLabel>
          </CloseButton>
        </Card>
      </Dim>
    </Modal>
  );
};

// 다이얼로그 안 강조 박스 (Figma: Result / Masked ID의 "mals****")
const HighlightBox = styled.View`
  align-self: stretch;
  justify-content: center;
  align-items: center;
  height: 52px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const HighlightText = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const DialogHighlight = ({ children }: { children: ReactNode }) => (
  <HighlightBox>
    <HighlightText>{children}</HighlightText>
  </HighlightBox>
);

export { Description as DialogDescription };
export default Dialog;
