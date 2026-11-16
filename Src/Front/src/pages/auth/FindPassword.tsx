import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import { Dialog, DialogDescription } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { AUTH_ERROR, EMAIL_REGEX } from "@constants/auth";
import Notice from "@components/onboarding/Notice";
import { AUTH_ERROR_CODE, getErrorCode, services } from "@services";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import * as s from "./FindPassword_styled";

type FindPasswordErrors = Partial<Record<"id" | "email", string>>;

const FindPassword = () => {
  const navigation = useAuthNavigation();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FindPasswordErrors>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string>();

  const handleSend = async () => {
    if (sending) return;
    const next: FindPasswordErrors = {};
    if (!id.trim()) next.id = AUTH_ERROR.idRequired;
    if (!email.trim()) next.email = AUTH_ERROR.emailRequired;
    else if (!EMAIL_REGEX.test(email.trim()))
      next.email = AUTH_ERROR.emailInvalid;
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length > 0) return;

    // 아이디 규칙이 바뀌어도 기존 아이디로 찾을 수 있게 형식 검사는 하지 않음
    setSending(true);
    try {
      await services.auth.requestPasswordReset(id.trim(), email.trim());
      setSent(true);
    } catch (error) {
      setFormError(
        getErrorCode(error) === AUTH_ERROR_CODE.accountNotFound
          ? AUTH_ERROR.accountNotFound
          : AUTH_ERROR.network
      );
    } finally {
      setSending(false);
    }
  };

  const goLogin = () => {
    setSent(false);
    navigation.popTo("Login");
  };

  return (
    <AuthLayout title="비밀번호 찾기">
      <AuthIntro
        title="비밀번호를 다시 설정해요"
        description="아이디와 이메일을 확인한 뒤 임시 비밀번호를 보내드려요."
      />

      <s.Fields>
        <TextField
          label="아이디"
          placeholder="아이디를 입력해주세요"
          value={id}
          onChangeText={text => {
            setId(text);
            setErrors(prev => ({ ...prev, id: undefined }));
          }}
          error={errors.id}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />
        <TextField
          label="이메일"
          placeholder="이메일을 입력해주세요"
          value={email}
          onChangeText={text => {
            setEmail(text);
            setErrors(prev => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={handleSend}
        />
      </s.Fields>

      {formError && <Notice tone="danger" title={formError} />}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          onPress={handleSend}
          disabled={sending}
          accessibilityState={{ busy: sending, disabled: sending }}
        >
          {sending ? "확인하는 중…" : "임시 비밀번호 받기"}
        </Button>
        <s.Hint>메일이 오지 않으면 스팸함도 함께 확인해주세요.</s.Hint>
        <Button variant="text" onPress={() => navigation.popTo("Login")}>
          로그인으로 돌아가기
        </Button>
      </s.Actions>

      <Dialog
        visible={sent}
        title="이메일 전송을 완료했어요"
        description="입력한 이메일로 임시 비밀번호를 보냈어요."
        confirmLabel="로그인"
        onConfirm={goLogin}
        onClose={() => setSent(false)}
      >
        <DialogDescription>
          {"발급받은 임시 비밀번호로 로그인한 뒤\n새 비밀번호로 변경해주세요."}
        </DialogDescription>
      </Dialog>
    </AuthLayout>
  );
};

export default FindPassword;
