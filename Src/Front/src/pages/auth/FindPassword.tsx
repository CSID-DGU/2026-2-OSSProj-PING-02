import { useEffect, useState } from "react";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import { Dialog } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import {
  AUTH_ERROR,
  EMAIL_REGEX,
  PASSWORD_RULE,
  RESEND_COOLDOWN_SEC,
  VERIFICATION_CODE_LENGTH,
  getAuthErrorMessage,
  getInvalidFields,
  isValidPassword,
  normalizeLoginId,
} from "@constants/auth";
import { AUTH_ERROR_CODE, DEV_HINTS, getErrorCode, services } from "@services";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import * as s from "./FindPassword_styled";

// 01-5 비밀번호 찾기 (백엔드 POST /auth/password/forgot → /auth/password/reset)
// 1단계: 아이디+가입 이메일 → 맞으면 메일로 6자리 코드 (맞는지와 관계없이 같은 응답)
// 2단계: 코드 + 새 비밀번호 → 성공하면 모든 기기 세션이 끊겨서 로그인 화면으로
// TODO(디자이너 공유): Figma 01-5는 "임시 비밀번호를 메일로 보냄" 한 단계.
//   백엔드는 코드 확인 후 새 비밀번호를 정하는 방식이라 같은 화면에 2단계(코드·새 비밀번호)를 붙임
type Step = "request" | "reset";
type Errors = Partial<
  Record<"id" | "email" | "code" | "password" | "passwordConfirm", string>
>;

const FindPassword = () => {
  const navigation = useAuthNavigation();
  const [step, setStep] = useState<Step>("request");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState(false);

  // 같은 주소로는 60초에 한 통만 보내져서(백엔드) 다시 받기도 그만큼 기다림
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const clear = (field: keyof Errors) =>
    setErrors(prev => ({ ...prev, [field]: undefined }));

  const requestCode = async () => {
    if (busy) return;
    const next: Errors = {};
    // 아이디 규칙이 바뀌어도 기존 아이디로 찾을 수 있게 형식 검사는 서버에 맡김
    if (!id.trim()) next.id = AUTH_ERROR.idRequired;
    if (!email.trim()) next.email = AUTH_ERROR.emailRequired;
    else if (!EMAIL_REGEX.test(email.trim())) next.email = AUTH_ERROR.emailInvalid;
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await services.auth.requestPasswordReset(
        normalizeLoginId(id),
        email.trim().toLowerCase()
      );
      setStep("reset");
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e) {
      if (getInvalidFields(e).includes("username")) {
        setErrors({ id: AUTH_ERROR.idInvalid });
      } else if (getErrorCode(e) === AUTH_ERROR_CODE.invalidEmailFormat) {
        setErrors({ email: AUTH_ERROR.emailInvalid });
      } else {
        setFormError(getAuthErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (busy) return;
    const next: Errors = {};
    if (code.length !== VERIFICATION_CODE_LENGTH) next.code = AUTH_ERROR.codeRequired;
    if (!isValidPassword(password)) next.password = AUTH_ERROR.passwordInvalid;
    if (!passwordConfirm || passwordConfirm !== password)
      next.passwordConfirm = AUTH_ERROR.passwordMismatch;
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await services.auth.resetPassword(normalizeLoginId(id), code, password);
      // 이 기기에 남은 토큰이 있으면 지움 (서버는 모든 세션을 끊음)
      services.tokens.set(null);
      setDone(true);
    } catch (e) {
      const fields = getInvalidFields(e);
      if (getErrorCode(e) === AUTH_ERROR_CODE.verificationCodeInvalid) {
        setErrors({ code: AUTH_ERROR.codeInvalid });
      } else if (fields.includes("code")) {
        setErrors({ code: AUTH_ERROR.codeRequired });
      } else if (fields.includes("newPassword")) {
        setErrors({ password: AUTH_ERROR.passwordInvalid });
      } else {
        setFormError(getAuthErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const goLogin = () => {
    setDone(false);
    navigation.popTo("Login");
  };

  return (
    <AuthLayout title="비밀번호 찾기">
      <AuthIntro
        title="비밀번호를 다시 설정해요"
        description={
          step === "request"
            ? "아이디와 가입할 때 적은 이메일을 확인한 뒤 코드를 보내드려요."
            : "메일로 받은 코드와 새 비밀번호를 입력해 주세요."
        }
      />

      <s.Fields>
        <TextField
          label="아이디"
          placeholder="아이디를 입력해주세요"
          value={id}
          onChangeText={text => {
            setId(text);
            clear("id");
          }}
          error={errors.id}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={step === "request"}
        />
        <TextField
          label="이메일"
          placeholder="이메일을 입력해주세요"
          value={email}
          onChangeText={text => {
            setEmail(text);
            clear("email");
          }}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={step === "request" ? requestCode : undefined}
          editable={step === "request"}
        />
      </s.Fields>

      {step === "reset" && (
        <>
          <Notice tone="success" title="가입된 정보라면 코드를 보냈어요">
            메일로 받은 숫자 6자리는 10분 동안 쓸 수 있어요. 메일이 오지 않으면
            스팸함도 확인해 주세요.
          </Notice>
          <s.Fields>
            <TextField
              label="인증 코드"
              placeholder="숫자 6자리"
              value={code}
              onChangeText={text => {
                setCode(text.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH));
                clear("code");
              }}
              error={errors.code}
              helper={
                DEV_HINTS.verificationCode
                  ? `개발용 mock 코드: ${DEV_HINTS.verificationCode}`
                  : undefined
              }
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={VERIFICATION_CODE_LENGTH}
              accessibilityLabel="인증 코드"
            />
            <TextField
              label="새 비밀번호"
              placeholder={PASSWORD_RULE.guide}
              value={password}
              onChangeText={text => {
                setPassword(text);
                clear("password");
              }}
              error={errors.password}
              secureTextEntry
              autoComplete="new-password"
              accessibilityLabel="새 비밀번호"
            />
            <TextField
              label="새 비밀번호 확인"
              placeholder="새 비밀번호를 다시 입력해주세요"
              value={passwordConfirm}
              onChangeText={text => {
                setPasswordConfirm(text);
                clear("passwordConfirm");
              }}
              error={errors.passwordConfirm}
              secureTextEntry
              autoComplete="new-password"
              accessibilityLabel="새 비밀번호 확인"
              returnKeyType="done"
              onSubmitEditing={resetPassword}
            />
          </s.Fields>
        </>
      )}

      {formError && <Notice tone="danger" title={formError} />}

      <s.Actions>
        {step === "request" ? (
          <Button
            variant="primary"
            fullWidth
            onPress={requestCode}
            disabled={busy}
            accessibilityState={{ busy, disabled: busy }}
          >
            {busy ? "보내는 중…" : "코드 받기"}
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              fullWidth
              onPress={resetPassword}
              disabled={busy}
              accessibilityState={{ busy, disabled: busy }}
            >
              {busy ? "바꾸는 중…" : "새 비밀번호로 바꾸기"}
            </Button>
            <Button
              variant="text"
              onPress={requestCode}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `코드 다시 받기 (${cooldown}초 뒤)` : "코드 다시 받기"}
            </Button>
            <Button
              variant="text"
              disabled={busy}
              onPress={() => {
                setStep("request");
                setCode("");
                setErrors({});
                setFormError(undefined);
              }}
            >
              아이디·이메일 다시 입력하기
            </Button>
          </>
        )}
        <Button variant="text" onPress={() => navigation.popTo("Login")}>
          로그인으로 돌아가기
        </Button>
      </s.Actions>

      <Dialog
        visible={done}
        title="비밀번호를 바꿨어요"
        description="다른 기기에서도 로그아웃됐어요. 새 비밀번호로 다시 로그인해 주세요."
        confirmLabel="로그인"
        onConfirm={goLogin}
        onClose={goLogin}
      />
    </AuthLayout>
  );
};

export default FindPassword;
