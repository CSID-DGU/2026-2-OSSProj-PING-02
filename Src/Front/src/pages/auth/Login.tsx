import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import AuthPrompt from "@components/auth/AuthPrompt";
import FindLinks from "@components/auth/FindLinks";
import Notice from "@components/onboarding/Notice";
import { AUTH_ERROR, EMAIL_REGEX } from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { AUTH_ERROR_CODE, getErrorCode, services } from "@services";
import { useSession } from "@stores/SessionProvider";
import * as s from "./Login_styled";

type LoginErrors = Partial<Record<"email" | "password", string>>;

const Login = () => {
  const navigation = useAuthNavigation();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;
    const trimmed = email.trim();
    const next: LoginErrors = {};
    if (!trimmed) next.email = AUTH_ERROR.emailRequired;
    else if (!EMAIL_REGEX.test(trimmed)) next.email = AUTH_ERROR.emailInvalid;
    if (!password) next.password = AUTH_ERROR.passwordRequired;
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const result = await services.auth.login(trimmed, password);
      await signIn(result);
      // 이동은 Splash가 온보딩 진행 상황을 보고 결정
      navigation.popTo("Splash");
    } catch (error) {
      const code = getErrorCode(error);
      if (code === AUTH_ERROR_CODE.invalidCredentials) {
        setErrors({ password: AUTH_ERROR.loginFailed });
      } else if (code === AUTH_ERROR_CODE.emailNotVerified) {
        navigation.navigate("EmailVerify", { email: trimmed, resend: true });
      } else {
        setFormError(AUTH_ERROR.network);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="로그인" gap={14}>
      <AuthIntro
        title="다시 만나서 반가워요"
        description="답장을 이어갈 준비가 되었을 때 언제든 돌아오세요."
      />

      <s.Fields>
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
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <TextField
          label="비밀번호"
          placeholder="비밀번호를 입력해주세요"
          value={password}
          onChangeText={text => {
            setPassword(text);
            setErrors(prev => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          secureTextEntry
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
      </s.Fields>

      {formError && <Notice tone="danger" title={formError} />}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          onPress={handleLogin}
          disabled={submitting}
          accessibilityState={{ busy: submitting, disabled: submitting }}
        >
          {submitting ? "확인하는 중…" : "로그인"}
        </Button>
        <FindLinks />
      </s.Actions>

      <AuthPrompt
        message="아직 계정이 없나요?"
        actionLabel="회원가입"
        onPress={() => navigation.navigate("Signup")}
      />
    </AuthLayout>
  );
};

export default Login;
