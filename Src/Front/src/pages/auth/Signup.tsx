import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Field, Input, TextField } from "@core/ui/field";
import { Select } from "@core/ui/select";
import { ChoiceGroup } from "@core/ui/choice";
import { Checkbox } from "@core/ui/checkbox";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import AuthPrompt from "@components/auth/AuthPrompt";
import Notice from "@components/onboarding/Notice";
import {
  AUTH_ERROR,
  DOMAIN_REGEX,
  EMAIL_DOMAINS,
  GENDER_OPTIONS,
  LOGIN_ID_RULE,
  PASSWORD_RULE,
  getAuthErrorMessage,
  getInvalidFields,
  isValidLoginId,
  isValidPassword,
  normalizeLoginId,
  type Gender,
} from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import {
  AUTH_ERROR_CODE,
  AUTH_FEATURES,
  COMMON_ERROR_CODE,
  getErrorCode,
  services,
  type Terms,
} from "@services";
import { useSession } from "@stores/SessionProvider";
import * as s from "./Signup_styled";

type TermsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; terms: Terms[] };

const pad2 = (n: number) => String(n).padStart(2, "0");

const TERMS_LINK_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

type SignupField =
  | "name"
  | "birth"
  | "gender"
  | "email"
  | "loginId"
  | "password"
  | "passwordConfirm"
  | "terms";
type SignupErrors = Partial<Record<SignupField, string>>;
type IdCheck = "idle" | "checking" | "available" | "taken";

// 생년월일 선택지: 올해부터 100년 전까지
const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 101 }, (_, i) => {
  const year = THIS_YEAR - i;
  return { label: String(year), value: year };
});
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1).padStart(2, "0"),
  value: i + 1,
}));
const DOMAIN_OPTIONS = EMAIL_DOMAINS.map(domain => ({
  label: domain,
  value: domain,
}));

// 400 VALIDATION_FAILED의 서버 필드 → 화면 입력란과 문구
const SERVER_FIELD_ERRORS: Record<string, [SignupField, string]> = {
  username: ["loginId", AUTH_ERROR.idInvalid],
  password: ["password", AUTH_ERROR.passwordInvalid],
  name: ["name", AUTH_ERROR.checkInput],
  birthdate: ["birth", AUTH_ERROR.checkInput],
  gender: ["gender", AUTH_ERROR.checkInput],
  email: ["email", AUTH_ERROR.emailInvalid],
  termsAgreements: ["terms", AUTH_ERROR.checkInput],
};

// 월마다 마지막 날이 달라서 연·월에 맞춰 일 선택지를 만듦
const getDayOptions = (year?: number, month?: number) => {
  const lastDay = month ? new Date(year ?? 2000, month, 0).getDate() : 31;
  return Array.from({ length: lastDay }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    value: i + 1,
  }));
};

const Signup = () => {
  const navigation = useAuthNavigation();
  const theme = useTheme();
  const { signIn } = useSession();
  // 이메일 기능(services/config.ts). 꺼져 있으면 이메일 칸 없이 가입하고 바로 로그인
  const emailEnabled = AUTH_FEATURES.emailEnabled;

  const [name, setName] = useState("");
  const [year, setYear] = useState<number>();
  const [month, setMonth] = useState<number>();
  const [day, setDay] = useState<number>();
  const [gender, setGender] = useState<Gender>();
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState<string>(EMAIL_DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [loginId, setLoginId] = useState("");
  // 중복 확인 결과. 아이디를 고치면 다시 확인해야 함
  const [idCheck, setIdCheck] = useState<IdCheck>("idle");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [termsState, setTermsState] = useState<TermsState>({
    status: "loading",
  });
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const dayOptions = getDayOptions(year, month);
  const terms = termsState.status === "ready" ? termsState.terms : [];
  const agreeAll = terms.length > 0 && terms.every(t => agreed[t.id]);
  const agreeRequired = terms.filter(t => t.required).every(t => agreed[t.id]);
  const emailDomainValue = customDomain ? domainInput.trim() : emailDomain;
  // 필수 항목이 모두 채워졌는지 (버튼 활성화용, 자세한 검사는 validate)
  const canSubmit =
    !!name.trim() &&
    !!year &&
    !!month &&
    !!day &&
    !!gender &&
    (!emailEnabled || (!!emailLocal.trim() && !!emailDomainValue)) &&
    idCheck === "available" &&
    isValidPassword(password) &&
    passwordConfirm === password &&
    termsState.status === "ready" &&
    agreeRequired;

  const clearError = (field: SignupField) =>
    setErrors(prev => ({ ...prev, [field]: undefined }));

  // 약관은 서버(GET /terms)에서 받아 필수·선택을 구분
  const loadTerms = useCallback(async () => {
    setTermsState({ status: "loading" });
    try {
      setTermsState({ status: "ready", terms: await services.auth.getTerms() });
    } catch {
      setTermsState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  // 연·월이 바뀌어 고른 날짜가 없어지면(2/30 등) 일 선택을 비움
  const handleBirthChange = (nextYear?: number, nextMonth?: number) => {
    const lastDay = getDayOptions(nextYear, nextMonth).length;
    if (day && day > lastDay) setDay(undefined);
    clearError("birth");
  };

  // 아이디 중복 확인 (Figma에 없어 입력란 아래 텍스트 버튼으로)
  const handleCheckId = async () => {
    const id = normalizeLoginId(loginId);
    if (!id) {
      setErrors(prev => ({ ...prev, loginId: AUTH_ERROR.idRequired }));
      return;
    }
    if (!isValidLoginId(id)) {
      setErrors(prev => ({ ...prev, loginId: AUTH_ERROR.idInvalid }));
      return;
    }
    setIdCheck("checking");
    clearError("loginId");
    try {
      const { available } = await services.auth.checkLoginId(id);
      setIdCheck(available ? "available" : "taken");
      if (!available) {
        setErrors(prev => ({ ...prev, loginId: AUTH_ERROR.idTaken }));
      }
    } catch (error) {
      setIdCheck("idle");
      setErrors(prev => ({
        ...prev,
        loginId: getInvalidFields(error).includes("username")
          ? AUTH_ERROR.idInvalid
          : getAuthErrorMessage(error),
      }));
    }
  };

  const handleAgreeAll = (checked: boolean) => {
    setAgreed(Object.fromEntries(terms.map(t => [t.id, checked])));
    clearError("terms");
  };

  const handleAgree = (id: string, checked: boolean) => {
    setAgreed(prev => ({ ...prev, [id]: checked }));
    clearError("terms");
  };

  const validate = () => {
    const next: SignupErrors = {};
    const domain = customDomain ? domainInput.trim() : emailDomain;

    if (!name.trim()) next.name = AUTH_ERROR.nameRequired;
    if (!year || !month || !day) next.birth = AUTH_ERROR.birthRequired;
    if (!gender) next.gender = AUTH_ERROR.genderRequired;
    if (emailEnabled) {
      if (!emailLocal.trim() || !domain) next.email = AUTH_ERROR.emailRequired;
      else if (/[\s@]/.test(emailLocal) || !DOMAIN_REGEX.test(domain))
        next.email = AUTH_ERROR.emailInvalid;
    }
    if (!loginId.trim()) next.loginId = AUTH_ERROR.idRequired;
    else if (!isValidLoginId(loginId)) next.loginId = AUTH_ERROR.idInvalid;
    else if (idCheck === "taken") next.loginId = AUTH_ERROR.idTaken;
    else if (idCheck !== "available") next.loginId = AUTH_ERROR.idCheckRequired;
    if (!isValidPassword(password)) next.password = AUTH_ERROR.passwordInvalid;
    if (!passwordConfirm || passwordConfirm !== password)
      next.passwordConfirm = AUTH_ERROR.passwordMismatch;
    if (termsState.status !== "ready") next.terms = AUTH_ERROR.termsLoadFailed;
    else if (!agreeRequired) next.terms = AUTH_ERROR.termsRequired;

    setErrors(next);
    setFormError(undefined);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (submitting || !validate() || !year || !month || !day || !gender) {
      return;
    }
    const domain = customDomain ? domainInput.trim() : emailDomain;
    const email = emailEnabled ? `${emailLocal.trim()}@${domain}` : undefined;

    setSubmitting(true);
    try {
      const signup = await services.auth.signup({
        loginId: normalizeLoginId(loginId),
        name: name.trim(),
        birthdate: `${year}-${pad2(month)}-${pad2(day)}`,
        gender,
        email,
        password,
        termsAgreements: terms.map(t => ({
          termsId: t.id,
          agreed: !!agreed[t.id],
        })),
      });
      if (signup.status === "signedIn") {
        // 가입하면 바로 로그인 (백엔드 #25). 이동은 Splash가 온보딩 진행 상황을 보고 결정
        await signIn(signup.result);
        navigation.popTo("Splash");
      } else {
        // 이메일 기능: 인증 화면에서 뒤로 나와 다시 가입하면 서버가 인증 전 계정을 덮어씀
        navigation.navigate("EmailVerify", { email: signup.email });
      }
    } catch (error) {
      const code = getErrorCode(error);
      const fields = getInvalidFields(error)
        .map(field => SERVER_FIELD_ERRORS[field])
        .filter(Boolean);
      if (code === AUTH_ERROR_CODE.usernameAlreadyExists) {
        // 확인 뒤 그사이 다른 사람이 가입한 경우
        setIdCheck("taken");
        setErrors({ loginId: AUTH_ERROR.idTaken });
      } else if (code === AUTH_ERROR_CODE.emailAlreadyExists) {
        setErrors({ email: AUTH_ERROR.emailTaken });
      } else if (code === AUTH_ERROR_CODE.requiredTermsNotAgreed) {
        setErrors({ terms: AUTH_ERROR.termsRequired });
      } else if (
        code === COMMON_ERROR_CODE.validationFailed &&
        fields.length > 0
      ) {
        // 400: 서버가 알려 준 입력란에 안내
        setErrors(Object.fromEntries(fields));
        if (fields.some(([field]) => field === "loginId")) setIdCheck("idle");
      } else {
        setFormError(getAuthErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="회원가입" paddingBottom={32}>
      <AuthIntro
        title="말씨앗을 함께 시작해요"
        description="필요한 정보만 입력하면 가입이 완료돼요."
      />

      <s.Fields>
        <TextField
          label="이름"
          placeholder="이름을 입력해주세요"
          value={name}
          onChangeText={text => {
            setName(text);
            clearError("name");
          }}
          error={errors.name}
          autoComplete="name"
        />

        <Field
          label="생년월일"
          helper={errors.birth}
          state={errors.birth ? "error" : "default"}
        >
          <s.Row>
            <Select
              placeholder="YYYY"
              sheetTitle="태어난 해"
              options={YEAR_OPTIONS}
              value={year}
              onChange={next => {
                setYear(next);
                handleBirthChange(next, month);
              }}
              error={!!errors.birth && !year}
              flex={128}
            />
            <Select
              placeholder="MM"
              sheetTitle="태어난 달"
              options={MONTH_OPTIONS}
              value={month}
              onChange={next => {
                setMonth(next);
                handleBirthChange(year, next);
              }}
              error={!!errors.birth && !month}
              flex={88}
            />
            <Select
              placeholder="DD"
              sheetTitle="태어난 날"
              options={dayOptions}
              value={day}
              onChange={next => {
                setDay(next);
                clearError("birth");
              }}
              error={!!errors.birth && !day}
              flex={88}
            />
          </s.Row>
        </Field>

        <Field
          label="성별"
          helper={errors.gender}
          state={errors.gender ? "error" : "default"}
        >
          <ChoiceGroup
            options={[...GENDER_OPTIONS]}
            value={gender}
            onChange={next => {
              setGender(next);
              clearError("gender");
            }}
            error={!!errors.gender}
          />
        </Field>

        {emailEnabled && (
        <Field
          label="이메일"
          helper={errors.email}
          state={errors.email ? "error" : "default"}
        >
          <s.Row>
            <s.EmailLocal>
              <Input
                size="small"
                placeholder="example"
                value={emailLocal}
                onChangeText={text => {
                  setEmailLocal(text);
                  clearError("email");
                }}
                state={errors.email ? "error" : "default"}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="이메일 아이디"
              />
            </s.EmailLocal>
            <s.At>@</s.At>
            {customDomain ? (
              <s.EmailDomain>
                <Input
                  size="small"
                  placeholder="직접 입력"
                  value={domainInput}
                  onChangeText={text => {
                    setDomainInput(text);
                    clearError("email");
                  }}
                  state={errors.email ? "error" : "default"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  accessibilityLabel="이메일 도메인"
                />
              </s.EmailDomain>
            ) : (
              <Select
                placeholder="도메인 선택"
                sheetTitle="이메일 도메인"
                options={DOMAIN_OPTIONS}
                value={emailDomain}
                onChange={next => {
                  setEmailDomain(next);
                  clearError("email");
                }}
                flex={148}
              />
            )}
          </s.Row>
          <Checkbox
            label="직접 입력할게요"
            checked={customDomain}
            onChange={checked => {
              setCustomDomain(checked);
              clearError("email");
            }}
          />
        </Field>
        )}

        {/* 팀 결정으로 추가 (Figma 01-3에 없음): 계정 정보끼리 묶이도록 비밀번호 바로 위 */}
        {/* 입력란 바로 옆 "중복 확인"(48dp), 결과는 도움말 자리에 */}
        <Field
          label="아이디"
          helper={
            errors.loginId ??
            (idCheck === "available"
              ? AUTH_ERROR.idAvailable
              : `${LOGIN_ID_RULE.guide}로 만들어 주세요`)
          }
          state={errors.loginId ? "error" : "default"}
        >
          <s.IdRow>
            <s.IdInput>
              <Input
                placeholder="아이디를 입력해주세요"
                value={loginId}
                onChangeText={text => {
                  setLoginId(text);
                  setIdCheck("idle");
                  clearError("loginId");
                }}
                state={errors.loginId ? "error" : "default"}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
                maxLength={LOGIN_ID_RULE.maxLength}
                accessibilityLabel="아이디"
              />
            </s.IdInput>
            <Button
              variant="secondary"
              onPress={handleCheckId}
              disabled={idCheck === "checking" || idCheck === "available"}
              accessibilityState={{
                busy: idCheck === "checking",
                disabled: idCheck === "checking" || idCheck === "available",
              }}
            >
              {idCheck === "checking"
                ? "확인 중…"
                : idCheck === "available"
                ? "확인 완료"
                : "중복 확인"}
            </Button>
          </s.IdRow>
        </Field>

        <TextField
          label="비밀번호"
          placeholder={PASSWORD_RULE.guide}
          value={password}
          onChangeText={text => {
            setPassword(text);
            clearError("password");
          }}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
        />
        <TextField
          label="비밀번호 확인"
          placeholder="비밀번호를 다시 입력해주세요"
          value={passwordConfirm}
          onChangeText={text => {
            setPasswordConfirm(text);
            clearError("passwordConfirm");
          }}
          error={errors.passwordConfirm}
          secureTextEntry
          autoComplete="new-password"
        />

        <Field
          label="약관 동의"
          helper={errors.terms}
          state={errors.terms ? "error" : "default"}
        >
          {termsState.status === "loading" && (
            <s.TermsStatus>
              <ActivityIndicator
                color={theme.colors.iconSubtle}
                accessibilityLabel="약관을 불러오는 중"
              />
            </s.TermsStatus>
          )}

          {termsState.status === "error" && (
            <Notice tone="danger" title={AUTH_ERROR.termsLoadFailed}>
              <Button variant="secondary" onPress={loadTerms}>
                다시 불러오기
              </Button>
            </Notice>
          )}

          {termsState.status === "ready" && terms.length === 0 && (
            <Notice title="지금은 동의할 약관이 없어요" />
          )}

          {terms.length > 0 && (
            <s.Terms>
              <s.AgreeAllBox $error={!!errors.terms}>
                <Checkbox
                  label="모두 동의해요 (선택 항목 포함)"
                  checked={agreeAll}
                  onChange={handleAgreeAll}
                  emphasis
                />
              </s.AgreeAllBox>
              {terms.map(t => (
                <s.TermRow key={t.id}>
                  <s.TermCheck>
                    <Checkbox
                      label={`[${t.required ? "필수" : "선택"}] ${t.title}`}
                      checked={!!agreed[t.id]}
                      onChange={checked => handleAgree(t.id, checked)}
                    />
                  </s.TermCheck>
                  <Button
                    variant="text"
                    onPress={() => Linking.openURL(t.url).catch(() => {})}
                    accessibilityLabel={`${t.title} 전문 보기`}
                    // "보기"는 글자가 짧아 좌우도 넓혀 48×48dp 확보
                    hitSlop={TERMS_LINK_HIT_SLOP}
                  >
                    보기
                  </Button>
                </s.TermRow>
              ))}
              <s.TermsNote>
                선택 항목은 동의하지 않아도 가입할 수 있어요.
              </s.TermsNote>
            </s.Terms>
          )}
        </Field>
      </s.Fields>

      {formError && <Notice tone="danger" title={formError} />}

      <s.Actions>
        {/* 필수 항목이 다 채워지기 전에는 공통 Button의 비활성 모양(회색) */}
        <Button
          variant="primary"
          fullWidth
          onPress={handleSignup}
          disabled={!canSubmit || submitting}
          accessibilityState={{
            busy: submitting,
            disabled: !canSubmit || submitting,
          }}
          accessibilityHint={
            canSubmit ? undefined : "필수 항목을 모두 채우면 누를 수 있어요"
          }
        >
          {submitting ? "가입하는 중…" : "회원가입"}
        </Button>
        {!canSubmit && (
          <s.SubmitHint>필수 항목을 모두 채우면 가입할 수 있어요.</s.SubmitHint>
        )}
        <AuthPrompt
          message="이미 계정이 있나요?"
          actionLabel="로그인"
          onPress={() => navigation.popTo("Login")}
        />
      </s.Actions>
    </AuthLayout>
  );
};

export default Signup;
