import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import AuthPrompt from "@components/auth/AuthPrompt";
import FindLinks from "@components/auth/FindLinks";
import Notice from "@components/onboarding/Notice";
import {
  AUTH_ERROR,
  getAuthErrorMessage,
  normalizeLoginId,
} from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import {
  AUTH_ERROR_CODE,
  AUTH_FEATURES,
  getErrorCode,
  ServiceError,
  services,
} from "@services";
import { useSession } from "@stores/SessionProvider";
import * as s from "./Login_styled";

type LoginErrors = Partial<Record<"id" | "password", string>>;

const Login = () => {
  const navigation = useAuthNavigation();
  const { signIn } = useSession();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;
    // 서버와 같게 소문자·앞뒤 공백 제거
    const loginId = normalizeLoginId(id);
    const next: LoginErrors = {};
    // 로그인에서는 형식 검사 없이 비어 있는지만 확인 (규칙이 바뀌어도 기존 아이디로 로그인 가능하게)
    if (!loginId) next.id = AUTH_ERROR.idRequired;
    if (!password) next.password = AUTH_ERROR.passwordRequired;
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const result = await services.auth.login(loginId, password);
      await signIn(result);
      // 이동은 Splash가 온보딩 진행 상황을 보고 결정
      navigation.popTo("Splash");
    } catch (error) {
      const code = getErrorCode(error);
      const email =
        error instanceof ServiceError ? error.data?.email : undefined;
      if (code === AUTH_ERROR_CODE.invalidCredentials) {
        setErrors({ password: AUTH_ERROR.loginFailed });
      } else if (
        code === AUTH_ERROR_CODE.emailNotVerified &&
        AUTH_FEATURES.emailEnabled &&
        email
      ) {
        // 인증 전 계정: 인증 화면을 열면서 코드를 새로 보냄
        navigation.navigate("EmailVerify", { email, resend: true });
      } else {
        setFormError(getAuthErrorMessage(error));
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
