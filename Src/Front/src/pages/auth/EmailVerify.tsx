import { useCallback, useEffect, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { TextField } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import {
  AUTH_ERROR,
  RESEND_COOLDOWN_SEC,
  VERIFICATION_CODE_LENGTH,
  getAuthErrorMessage,
} from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import {
  AUTH_ERROR_CODE,
  DEV_HINTS,
  getErrorCode,
  services,
} from "@services";
import { useSession } from "@stores/SessionProvider";
import type { RootStackParamList } from "@routes/router";
import * as s from "./EmailVerify_styled";

type ResendState = "idle" | "sending" | "sent" | "error";

// 01-3-1 이메일 인증: 가입 후(또는 인증 전 로그인 시) 메일로 받은 6자리 코드 확인
// 지금 백엔드에는 가입 이메일 인증이 없어 숨김 (AUTH_FEATURES.emailVerification = false). 코드는 유지
const EmailVerify = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "EmailVerify">>();
  const { signIn } = useSession();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [cooldown, setCooldown] = useState(0);

  const handleResend = useCallback(async () => {
    setResendState("sending");
    try {
      await services.auth.resendVerification(params.email);
      setResendState("sent");
      setCooldown(RESEND_COOLDOWN_SEC);
      setError(undefined);
    } catch {
      setResendState("error");
    }
  }, [params.email]);

  // 인증 전 계정으로 로그인한 경우: 이전 코드가 만료됐을 수 있어 새로 보냄
  useEffect(() => {
    if (params.resend) handleResend();
  }, [params.resend, handleResend]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (submitting) return;
    if (code.length !== VERIFICATION_CODE_LENGTH) {
      setError(AUTH_ERROR.codeRequired);
      return;
    }
    setSubmitting(true);
    try {
      const result = await services.auth.verifyEmail(params.email, code);
      await signIn(result);
      navigation.popTo("Splash");
    } catch (e) {
      setError(
        getErrorCode(e) === AUTH_ERROR_CODE.verificationCodeInvalid
          ? AUTH_ERROR.codeInvalid
          : getAuthErrorMessage(e)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resendLabel =
    resendState === "sending"
      ? "보내는 중…"
      : cooldown > 0
      ? `코드 다시 받기 (${cooldown}초 뒤)`
      : "코드 다시 받기";

  return (
    <AuthLayout title="이메일 인증" gap={14}>
      <AuthIntro
        title="메일을 확인해 주세요"
        description={`${params.email}(으)로 숫자 6자리를 보냈어요. 메일이 안 보이면 스팸함도 한번 살펴봐 주세요.`}
      />

      <TextField
        label="인증 코드"
        placeholder="숫자 6자리"
        value={code}
        onChangeText={text => {
          setCode(text.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH));
          setError(undefined);
        }}
        error={error}
        helper={
          DEV_HINTS.verificationCode
            ? `개발용 mock 코드: ${DEV_HINTS.verificationCode}`
            : "코드는 10분 동안 쓸 수 있어요."
        }
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={VERIFICATION_CODE_LENGTH}
        returnKeyType="done"
        onSubmitEditing={handleVerify}
      />

      {resendState === "sent" && (
        <Notice tone="success" title="새 코드를 보냈어요" />
      )}
      {resendState === "error" && (
        <Notice tone="danger" title={AUTH_ERROR.network} />
      )}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          onPress={handleVerify}
          disabled={submitting}
          accessibilityState={{ busy: submitting, disabled: submitting }}
        >
          {submitting ? "확인하는 중…" : "확인"}
        </Button>
        <Button
          variant="text"
          onPress={handleResend}
          disabled={resendState === "sending" || cooldown > 0}
        >
          {resendLabel}
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

export default EmailVerify;
