import { useState } from "react";
import styled, { css, useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Field, TextField, type FieldState } from "@core/ui/field";
import { useToast } from "@core/ui/toast";
import SettingsLayout from "@components/settings/SettingsLayout";
import {
  AUTH_ERROR,
  getAuthErrorMessage,
  getInvalidFields,
  isValidPassword,
} from "@constants/auth";
import { PASSWORD_CHANGE_COPY as C, SETTINGS_COPY } from "@constants/settings";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { AUTH_ERROR_CODE, services } from "@services";
import { ServiceError } from "@services/common";

// 08 설정 H02 비밀번호 재설정 (Figma 507:14574 기본, 515:15179 불일치, 515:15304 확인 후 입력, 518:15542 완료)
// - 현재 비밀번호 칸 안의 [확인](POST /users/me/password/verify)이 맞아야 새 비밀번호 칸이 열림 (시안: 그 전엔 흐리게)
// - 바꾸기: PATCH /users/me/password → 내 정보로 돌아가 "비밀번호가 변경됐어요" 토스트
//   이 기기는 로그인 유지, 다른 기기는 로그아웃 (서버)
type Verify = "idle" | "checking" | "ok";

const isWrongPassword = (error: unknown) =>
  error instanceof ServiceError &&
  error.code === AUTH_ERROR_CODE.invalidCredentials;

const PasswordChange = () => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [verify, setVerify] = useState<Verify>("idle");
  const [currentError, setCurrentError] = useState<string>();
  const [focused, setFocused] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nextError, setNextError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const verified = verify === "ok";
  const mismatched = confirm.length > 0 && confirm !== next;
  const currentState: FieldState = currentError
    ? "error"
    : focused
    ? "focused"
    : "default";

  const handleVerify = async () => {
    if (verify === "checking") return;
    if (!current) {
      setCurrentError(AUTH_ERROR.passwordRequired);
      return;
    }
    setVerify("checking");
    try {
      await services.auth.verifyPassword(current);
      setVerify("ok");
      setCurrentError(undefined);
    } catch (error) {
      setVerify("idle");
      setCurrentError(
        isWrongPassword(error)
          ? SETTINGS_COPY.passwordMismatch
          : getAuthErrorMessage(error)
      );
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!verified) {
      setCurrentError(C.verifyFirst);
      return;
    }
    if (!isValidPassword(next)) {
      setNextError(AUTH_ERROR.passwordInvalid);
      return;
    }
    if (confirm !== next) return;
    setSubmitting(true);
    try {
      await services.auth.changePassword(current, next);
      toast.show(C.changed);
      navigation.goBack();
    } catch (error) {
      if (isWrongPassword(error)) {
        // 그사이 다른 곳에서 바뀐 경우: 다시 확인부터
        setVerify("idle");
        setCurrentError(SETTINGS_COPY.passwordMismatch);
      } else if (getInvalidFields(error).includes("newPassword")) {
        const same =
          error instanceof ServiceError &&
          error.details?.some((d) => d.reason === "same_as_current");
        setNextError(same ? C.sameAsCurrent : AUTH_ERROR.passwordInvalid);
      } else {
        toast.show(getAuthErrorMessage(error), { icon: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsLayout title={C.title} gap={12}>
      <Fields>
        <Field
          label={C.current}
          helper={currentError ?? (verified ? C.verified : undefined)}
          state={currentState}
        >
          <CurrentBox $state={currentState}>
            <CurrentInput
              value={current}
              onChangeText={(value) => {
                setCurrent(value);
                setCurrentError(undefined);
                // 확인한 뒤 고치면 다시 확인
                if (verified) setVerify("idle");
              }}
              placeholder={C.currentPlaceholder}
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              accessibilityLabel={C.current}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleVerify}
            />
            <Chip
              onPress={handleVerify}
              disabled={verify === "checking"}
              accessibilityRole="button"
              accessibilityLabel={`${C.current} ${C.check}`}
              accessibilityState={{ busy: verify === "checking" }}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <ChipText>{C.check}</ChipText>
            </Chip>
          </CurrentBox>
        </Field>

        <TextField
          label={C.next}
          placeholder={C.nextPlaceholder}
          value={next}
          onChangeText={(value) => {
            setNext(value);
            setNextError(undefined);
          }}
          error={nextError}
          disabled={!verified}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />
        <TextField
          label={C.confirm}
          placeholder={C.confirmPlaceholder}
          value={confirm}
          onChangeText={setConfirm}
          error={mismatched ? AUTH_ERROR.passwordMismatch : undefined}
          disabled={!verified}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />
      </Fields>

      <Action>
        <Button
          variant="primary"
          fullWidth
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityState={{ busy: submitting, disabled: submitting }}
        >
          {C.submit}
        </Button>
      </Action>
    </SettingsLayout>
  );
};

// 시안: 칸 폭 308(좌우 10), 버튼 폭 320(좌우 4)
const Fields = styled.View`
  gap: 12px;
  padding: 0px 10px;
`;

const Action = styled.View`
  padding: 0px 4px;
`;

// 공통 Input과 같은 칸(높이 52, 모서리 10, 포커스·오류는 2px)에 오른쪽 [확인]을 넣음
const CurrentBox = styled.View<{ $state: FieldState }>`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0px 16px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
  ${({ theme, $state }) => {
    if ($state === "focused")
      return css`
        border: 2px solid ${theme.palette.seed500};
      `;
    if ($state === "error")
      return css`
        border: 2px solid ${theme.colors.stateError};
      `;
    return css`
      border: 1px solid ${theme.colors.borderDefault};
    `;
  }}
`;

const CurrentInput = styled.TextInput`
  flex: 1;
  padding: 0px;
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Chip = styled.TouchableOpacity`
  padding: 3px 12px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

const ChipText = styled.Text`
  ${({ theme }) => theme.fonts.labelChip};
  color: ${({ theme }) => theme.colors.textBrand};
`;

export default PasswordChange;
