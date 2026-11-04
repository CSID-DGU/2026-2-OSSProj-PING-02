import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import { Dialog, DialogDescription } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { AUTH_ERROR, EMAIL_REGEX } from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import * as s from "./FindPassword_styled";

type FindPasswordErrors = Partial<Record<"id" | "email", string>>;

const FindPassword = () => {
  const navigation = useAuthNavigation();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FindPasswordErrors>({});
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    const next: FindPasswordErrors = {};
    if (!id.trim()) next.id = AUTH_ERROR.idRequired;
    if (!email.trim()) next.email = AUTH_ERROR.emailRequired;
    else if (!EMAIL_REGEX.test(email.trim()))
      next.email = AUTH_ERROR.emailInvalid;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // TODO: 임시 비밀번호 발급 API 연결. 지금은 완료 다이얼로그만 띄움
    setSent(true);
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

      <s.Actions>
        <Button variant="primary" fullWidth onPress={handleSend}>
          임시 비밀번호 받기
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
