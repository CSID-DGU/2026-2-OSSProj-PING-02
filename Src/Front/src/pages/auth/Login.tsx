import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import AuthPrompt from "@components/auth/AuthPrompt";
import FindLinks from "@components/auth/FindLinks";
import { AUTH_ERROR } from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import * as s from "./Login_styled";

type LoginErrors = Partial<Record<"id" | "password", string>>;

const Login = () => {
  const navigation = useAuthNavigation();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});

  const handleLogin = () => {
    const next: LoginErrors = {};
    if (!id.trim()) next.id = AUTH_ERROR.idRequired;
    if (!password) next.password = AUTH_ERROR.passwordRequired;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // TODO: 로그인 API 연결 후 홈 화면으로 이동
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

      <s.Actions>
        <Button variant="primary" fullWidth onPress={handleLogin}>
          로그인
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
