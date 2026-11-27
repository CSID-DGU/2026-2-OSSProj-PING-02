import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { ChevronRightIcon } from "@core/ui/icon";
import { BottomSheet } from "@core/ui/sheet";
import { SwitchRow } from "@core/ui/switch";
import type { Account } from "@services";
import { AppLogo, StatusChip, accountSheetText } from "./AccountLine";

// 06 친구 E03-3 카카오톡 / E03-4 문자 연결 관리 시트 (720px ÷2)
// 제목(titleSheet 16/28) → 계정 카드(로고 36 · 이름 · 번호 · 연결됨) → 분석 스위치 상자
// → "다른 친구에게 연결 >" → "연결 해지하기"(연한 노란 버튼)
// - 연결 해지: 계정이 하나뿐이면 누를 수 없음 (해지하면 친구에게 남는 계정이 없음)
interface AccountSheetProps {
  account: Account | null;
  phone?: string;
  analysisOn: boolean;
  canDisconnect: boolean;
  onToggleAnalysis: (on: boolean) => void;
  onConnectOther: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

const AccountSheet = ({
  account,
  phone,
  analysisOn,
  canDisconnect,
  onToggleAnalysis,
  onConnectOther,
  onDisconnect,
  onClose,
}: AccountSheetProps) => {
  const theme = useTheme();
  const text = account ? accountSheetText(account.app) : null;
  return (
    <BottomSheet
      visible={!!account}
      onClose={onClose}
      title={text?.title}
      titleTypo="titleSheet"
    >
      {account && text && (
        <Body>
          <AccountCard
            accessible
            accessibilityLabel={[account.senderName, phone, "연결됨"]
              .filter(Boolean)
              .join(", ")}
          >
            <AppLogo app={account.app} />
            <CardTexts>
              <CardName numberOfLines={1}>{account.senderName}</CardName>
              {phone ? <CardPhone>{phone}</CardPhone> : null}
            </CardTexts>
            <StatusChip status="linked" />
          </AccountCard>

          <SwitchRow
            label={text.analysis}
            description={text.analysisDescription}
            value={analysisOn}
            onValueChange={onToggleAnalysis}
          />

          <MenuLine
            onPress={onConnectOther}
            accessibilityRole="button"
            accessibilityLabel="다른 친구에게 연결"
          >
            <MenuText>다른 친구에게 연결</MenuText>
            <ChevronRightIcon size={21} color={theme.colors.iconDefault} />
          </MenuLine>

          <Button
            variant="secondary"
            fullWidth
            disabled={!canDisconnect}
            onPress={onDisconnect}
          >
            연결 해지하기
          </Button>
        </Body>
      )}
    </BottomSheet>
  );
};

// 시안: 제목 아래 약 10 → 카드 · 카드와 스위치 상자 사이 6 · 메뉴 줄 · 버튼
const Body = styled.View`
  gap: 6px;
`;

// 카드: 높이 약 56 · 모서리 14 · borderDefault 테두리 · 좌우 13
const AccountCard = styled.View`
  min-height: 56px;
  flex-direction: row;
  align-items: center;
  padding: 0px 10px 0px 13px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const CardTexts = styled.View`
  flex: 1;
  margin-left: 13px;
  gap: 2px;
`;

// TODO(Figma 스타일 확인): 이름 약 15 → bodyLarge 15/22, 번호 약 12 → captionRegular 12/17
const CardName = styled.Text`
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const CardPhone = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const MenuLine = styled.Pressable`
  height: 48px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0px 13px;
`;

// TODO(Figma 스타일 확인): 약 13 → bodySmall 13/19
const MenuText = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default AccountSheet;
