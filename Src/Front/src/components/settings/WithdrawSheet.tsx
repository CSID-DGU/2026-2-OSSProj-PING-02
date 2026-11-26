import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import { BottomSheet } from "@core/ui/sheet";
import { SETTINGS_COPY } from "@constants/settings";

// 08 설정 H08 "회원 탈퇴하기" 시트 (Figma H08 / 회원 탈퇴2)
// 비밀번호 + 비밀번호 확인이 같을 때만 "탈퇴하기"(연한 빨강)가 보임. 다르면 빨간 안내, 같으면 초록 안내
// 서버로는 비밀번호 하나만 보냄 (DELETE /users/me). 틀리면 비밀번호 칸에 오류
interface WithdrawSheetProps {
  visible: boolean;
  onClose: () => void;
  // 비밀번호가 틀렸으면 "wrongPassword"를 돌려줌 (그 밖의 실패는 부르는 쪽이 알림)
  onWithdraw: (password: string) => Promise<"done" | "wrongPassword" | "failed">;
}

const WithdrawSheet = ({ visible, onClose, onWithdraw }: WithdrawSheetProps) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wrongPassword, setWrongPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 시트를 다시 열면 처음부터
  useEffect(() => {
    if (!visible) return;
    setPassword("");
    setConfirm("");
    setWrongPassword(false);
    setSubmitting(false);
  }, [visible]);

  const matched = password.length > 0 && confirm === password;
  const mismatched = confirm.length > 0 && confirm !== password;

  const handleWithdraw = async () => {
    if (!matched || submitting) return;
    setSubmitting(true);
    const result = await onWithdraw(password);
    if (result === "done") return; // 화면이 바뀜
    setSubmitting(false);
    if (result === "wrongPassword") setWrongPassword(true);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={submitting ? () => {} : onClose}
      dismissOnBackdrop={!submitting}
      testID="withdraw-sheet"
    >
      <Body>
        <Title accessibilityRole="header">{SETTINGS_COPY.withdrawSheetTitle}</Title>
        <Fields>
          <TextField
            label="비밀번호"
            value={password}
            onChangeText={value => {
              setPassword(value);
              setWrongPassword(false);
            }}
            error={wrongPassword ? SETTINGS_COPY.wrongPassword : undefined}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            editable={!submitting}
          />
          <TextField
            label="비밀번호 확인"
            value={confirm}
            onChangeText={setConfirm}
            error={mismatched ? SETTINGS_COPY.passwordMismatch : undefined}
            success={matched ? SETTINGS_COPY.passwordMatch : undefined}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            editable={!submitting}
          />
          <Button
            variant="primary"
            fullWidth
            typo="labelForm"
            onPress={onClose}
            disabled={submitting}
          >
            취소하기
          </Button>
          {matched && (
            <Button
              variant="danger"
              fullWidth
              typo="labelForm"
              onPress={handleWithdraw}
              disabled={submitting}
              accessibilityState={{ busy: submitting, disabled: submitting }}
            >
              탈퇴하기
            </Button>
          )}
        </Fields>
      </Body>
    </BottomSheet>
  );
};

// 시안: 손잡이 아래 16dp에 제목(16/28), 제목과 입력칸 사이 10, 칸·버튼 사이 4
const Body = styled.View`
  gap: 10px;
  padding-top: 16px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.titleSheetCompact};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const Fields = styled.View`
  gap: 4px;
`;

export default WithdrawSheet;
