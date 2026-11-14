import { useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import { Dialog, DialogDescription, DialogHighlight } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { AUTH_ERROR, EMAIL_REGEX } from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import * as s from "./FindId_styled";

type FindIdErrors = Partial<Record<"name" | "email", string>>;

// 앞 4글자만 보여 주고 나머지는 *로 가림 (예: malssiat → mals****)
const maskId = (id: string) =>
  id.slice(0, 4) + "*".repeat(Math.max(id.length - 4, 0));

const FindId = () => {
  const navigation = useAuthNavigation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FindIdErrors>({});
  const [foundId, setFoundId] = useState<string>();

  const handleFind = () => {
    const next: FindIdErrors = {};
    if (!name.trim()) next.name = AUTH_ERROR.nameRequired;
    if (!email.trim()) next.email = AUTH_ERROR.emailRequired;
    else if (!EMAIL_REGEX.test(email.trim()))
      next.email = AUTH_ERROR.emailInvalid;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // TODO: 아이디 찾기 API 연결. 지금은 결과 다이얼로그 확인용 예시 값
    setFoundId("malssiat");
  };

  const goLogin = () => {
    setFoundId(undefined);
    navigation.popTo("Login");
  };

  return (
    <AuthLayout title="아이디 찾기">
      <AuthIntro
        title="아이디를 잊으셨나요?"
        description="가입할 때 등록한 이름과 이메일을 확인해요."
      />

      <s.Fields>
        <TextField
          label="이름"
          placeholder="이름을 입력해주세요"
          value={name}
          onChangeText={text => {
            setName(text);
            setErrors(prev => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          autoComplete="name"
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
          onSubmitEditing={handleFind}
        />
      </s.Fields>

      <s.Actions>
        <Button variant="primary" fullWidth onPress={handleFind}>
          아이디 찾기
        </Button>
        <s.Hint>입력한 정보가 확인되면 아이디를 바로 알려드려요.</s.Hint>
        <Button variant="text" onPress={() => navigation.popTo("Login")}>
          로그인으로 돌아가기
        </Button>
      </s.Actions>

      <Dialog
        visible={!!foundId}
        title="아이디를 찾았어요"
        description="회원님의 아이디는 아래와 같아요."
        confirmLabel="로그인"
        onConfirm={goLogin}
        onClose={() => setFoundId(undefined)}
      >
        <DialogHighlight>{maskId(foundId ?? "")}</DialogHighlight>
        <DialogDescription>개인정보 보호를 위해 일부만 표시했어요.</DialogDescription>
      </Dialog>
    </AuthLayout>
  );
};

export default FindId;
