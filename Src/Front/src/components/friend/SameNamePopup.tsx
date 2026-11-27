import { Modal, Pressable, StyleSheet } from "react-native";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { CloseIcon } from "@core/ui/icon";
import type { Account } from "@services";
import { AppLogo } from "./AccountLine";

// 06 친구 E04 동일 인물 확인 팝업 (720px ÷2)
// 카드(좌우 약 19 · 모서리 20) 오른쪽 위 X → 계정(로고 36 · @아이디 / 이름) → 질문 → 버튼 3개(사이 5)
// 공통 Dialog는 제목이 맨 위·가운데이고 닫기가 글자 버튼이라 시안 배치와 달라서 Modal + 공통 Button으로 조합
// 닫기: X · 딤 · 안드로이드 뒤로가기 = "모르겠어요"와 같음 (다음에 다시 물어봄)
interface SameNamePopupProps {
  visible: boolean;
  account?: Account;
  friendName: string;
  onConnect: () => void;
  onDifferent: () => void;
  onClose: () => void;
}

const SameNamePopup = ({
  visible,
  account,
  friendName,
  onConnect,
  onDifferent,
  onClose,
}: SameNamePopupProps) => (
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
        onPress={onClose}
        accessibilityLabel="팝업 닫기"
      />
      <Card accessibilityRole="alert" accessibilityViewIsModal>
        <Close
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <CloseIcon />
        </Close>
        {account && (
          <AccountRow>
            <AppLogo app={account.app} />
            <AccountTexts>
              <Handle numberOfLines={1}>
                {account.handle ? `@${account.handle}` : account.senderName}
              </Handle>
              {account.handle ? (
                <SenderName numberOfLines={1}>{account.senderName}</SenderName>
              ) : null}
            </AccountTexts>
          </AccountRow>
        )}
        <Question accessibilityRole="header">{`${friendName}님의 계정일까요?`}</Question>
        <Actions>
          <Button variant="primary" fullWidth onPress={onConnect}>
            동일 인물로 연결하기
          </Button>
          <Button variant="secondary" fullWidth onPress={onDifferent}>
            다른 사람이에요
          </Button>
          <Button variant="secondary" fullWidth onPress={onClose}>
            모르겠어요
          </Button>
        </Actions>
      </Card>
    </Dim>
  </Modal>
);

const Dim = styled.View`
  flex: 1;
  justify-content: center;
  padding: 0px 18px;
`;

const Backdrop = styled(Pressable)`
  background-color: ${({ theme }) => theme.colors.overlayDim};
`;

// Dialog 카드와 같은 테두리·그림자
const Card = styled.View`
  padding: 50px 21px 31px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  shadow-color: #2e241f;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.18;
  shadow-radius: 12px;
  elevation: 8;
`;

const Close = styled.Pressable`
  position: absolute;
  top: 18px;
  right: 22px;
`;

const AccountRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding-left: 12px;
`;

const AccountTexts = styled.View`
  flex: 1;
  margin-left: 14px;
  gap: 2px;
`;

// TODO(Figma 스타일 확인): 아이디 약 15 Medium → bodyLarge 15/22, 이름 약 11 → captionSmall 11/16
const Handle = styled.Text`
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const SenderName = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// TODO(Figma 스타일 확인): 질문 약 13 → bodySmall 13/19
const Question = styled.Text`
  margin-top: 12px;
  padding-left: 9px;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Actions = styled.View`
  margin-top: 12px;
  gap: 5px;
`;

export default SameNamePopup;
