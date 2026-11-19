import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import { Dialog, DialogDescription } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import { AUTH_ERROR, EMAIL_REGEX, getAuthErrorMessage } from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { services } from "@services";
import * as s from "./FindId_styled";

// 01-4 아이디 찾기 (백엔드 POST /auth/username/find)
// 백엔드는 이메일만 받고, 아이디는 응답에 담지 않고 가입한 이메일로 보냄 (가입 여부와 관계없이 같은 응답)
// TODO(디자이너 공유): Figma 01-4는 이름+이메일 입력 → 다이얼로그에 아이디 일부(mals****) 표시.
//   백엔드 기준으로 이메일만 받고, 다이얼로그는 "메일을 확인해 주세요"로 바꿈
const FindId = () => {
  const navigation = useAuthNavigation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleFind = async () => {
    if (sending) return;
    const value = email.trim();
    const next = !value
      ? AUTH_ERROR.emailRequired
      : !EMAIL_REGEX.test(value)
      ? AUTH_ERROR.emailInvalid
      : undefined;
    setError(next);
    setFormError(undefined);
    if (next) return;

    setSending(true);
    try {
      await services.auth.findLoginId(value.toLowerCase());
      setSent(true);
    } catch (e) {
      setFormError(getAuthErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const goLogin = () => {
    setSent(false);
    navigation.popTo("Login");
  };

  return (
    <AuthLayout title="아이디 찾기">
      <AuthIntro
        title="아이디를 잊으셨나요?"
        description="가입할 때 등록한 이메일로 아이디를 보내드려요."
      />

      <s.Fields>
        <TextField
          label="이메일"
          placeholder="이메일을 입력해주세요"
          value={email}
          onChangeText={text => {
            setEmail(text);
            setError(undefined);
          }}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={handleFind}
        />
      </s.Fields>

      {formError && <Notice tone="danger" title={formError} />}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          onPress={handleFind}
          disabled={sending}
          accessibilityState={{ busy: sending, disabled: sending }}
        >
          {sending ? "보내는 중…" : "아이디 받기"}
        </Button>
        <s.Hint>메일이 오지 않으면 스팸함도 함께 확인해주세요.</s.Hint>
        <Button variant="text" onPress={() => navigation.popTo("Login")}>
          로그인으로 돌아가기
        </Button>
      </s.Actions>

      <Dialog
        visible={sent}
        title="메일을 확인해 주세요"
        description="가입된 이메일이라면 아이디를 보냈어요."
        confirmLabel="로그인"
        onConfirm={goLogin}
        onClose={() => setSent(false)}
      >
        <DialogDescription>
          {"메일이 오지 않으면 가입할 때 적은 이메일이\n맞는지 한 번 더 확인해 주세요."}
        </DialogDescription>
      </Dialog>
    </AuthLayout>
  );
};

export default FindId;
