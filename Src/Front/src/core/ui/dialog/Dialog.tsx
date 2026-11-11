
import type { ReactNode } from "react";
import { Modal, Pressable } from "react-native";
import styled from "styled-components/native";
import { Button } from "../button";

// Figma: Dialog / 아이디 찾기 완료, Dialog / 임시 비밀번호 발송 완료
// 사용처: 결과 안내, 바로 보내기 전 확인, 데이터 삭제 확인 등

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: "success" | ReactNode;
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  dismissOnBackdrop?: boolean;
}

// 화면 전체 + 가운데 정렬
const Center = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 0px 32px;
`;

// 뒤쪽 어두운 배경
const Backdrop = styled(Pressable)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: rgba(43, 39, 36, 0.4);
`;

const Card = styled.View`
  width: 100%;
  max-width: 320px;
  padding: 28px 20px 12px 20px;
  border-radius: 16px;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const IconCircle = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  margin-bottom: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

// 임시 체크 모양 (나중에 success-circle.svg로 교체 예정)
const CheckMark = styled.View`
  width: 7px;
  height: 13px;
  margin-top: -3px;
  border-right-width: 2.5px;
  border-bottom-width: 2.5px;
  border-color: ${({ theme }) => theme.colors.stateSelectedContent};
  transform: rotate(45deg);
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const Description = styled.Text`
  margin-top: 8px;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const Extra = styled.View`
  align-self: stretch;
  margin-top: 16px;
`;

const Actions = styled.View`
  align-self: stretch;
  margin-top: 20px;
  gap: 4px;
`;

export const Dialog = ({
  visible,
  onClose,
  title,
  description,
  icon,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  dismissOnBackdrop = true,
}: DialogProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Center>
        <Backdrop
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityLabel="팝업 닫기"
        />

        <Card accessibilityViewIsModal>
          {icon === "success" ? (
            <IconCircle>
              <CheckMark />
            </IconCircle>
          ) : (
            icon ?? null
          )}

          <Title accessibilityRole="header">{title}</Title>

          {description ? (
            <Description>{description}</Description>
          ) : null}

          {children ? <Extra>{children}</Extra> : null}

          <Actions>
            {primaryLabel ? (
              <Button
                variant="primary"
                fullWidth
                onPress={onPrimary}
              >
                {primaryLabel}
              </Button>
            ) : null}

            {secondaryLabel ? (
              <Button
                variant="text"
                onPress={onSecondary ?? onClose}
              >
                {secondaryLabel}
              </Button>
            ) : null}
          </Actions>
        </Card>
      </Center>
    </Modal>
  );
};

// Figma의 "mals****" 같은 연노랑 강조 박스
const HighlightBox = styled.View`
  padding: 12px 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.brandSeed};
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
  align-items: center;
`;

const HighlightText = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const DialogHighlight = ({
  children,
}: {
  children: ReactNode;
}) => (
  <HighlightBox>
    <HighlightText>{children}</HighlightText>
  </HighlightBox>
);

export default Dialog;
