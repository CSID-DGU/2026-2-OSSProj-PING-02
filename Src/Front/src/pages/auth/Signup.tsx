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
  PASSWORD_MIN_LENGTH,
  type Gender,
} from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import {
  AUTH_ERROR_CODE,
  getErrorCode,
  services,
  type Terms,
} from "@services";
import * as s from "./Signup_styled";

type TermsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; terms: Terms[] };

const pad2 = (n: number) => String(n).padStart(2, "0");

type SignupField =
  | "name"
  | "birth"
  | "gender"
  | "email"
  | "password"
  | "passwordConfirm"
  | "terms";
type SignupErrors = Partial<Record<SignupField, string>>;

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

  const [name, setName] = useState("");
  const [year, setYear] = useState<number>();
  const [month, setMonth] = useState<number>();
  const [day, setDay] = useState<number>();
  const [gender, setGender] = useState<Gender>();
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState<string>(EMAIL_DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState(false);
  const [domainInput, setDomainInput] = useState("");
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
    if (!emailLocal.trim() || !domain) next.email = AUTH_ERROR.emailRequired;
    else if (/[\s@]/.test(emailLocal) || !DOMAIN_REGEX.test(domain))
      next.email = AUTH_ERROR.emailInvalid;
    if (password.length < PASSWORD_MIN_LENGTH)
      next.password = AUTH_ERROR.passwordTooShort;
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
    const email = `${emailLocal.trim()}@${domain}`;

    setSubmitting(true);
    try {
      await services.auth.signup({
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
      navigation.navigate("EmailVerify", { email });
    } catch (error) {
      const code = getErrorCode(error);
      if (code === AUTH_ERROR_CODE.emailAlreadyExists) {
        setErrors({ email: AUTH_ERROR.emailTaken });
      } else if (code === AUTH_ERROR_CODE.requiredTermsNotAgreed) {
        setErrors({ terms: AUTH_ERROR.termsRequired });
      } else {
        setFormError(AUTH_ERROR.network);
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

        <TextField
          label="비밀번호"
          placeholder={`${PASSWORD_MIN_LENGTH}자 이상 입력해주세요`}
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
        <Button
          variant="secondary"
          fullWidth
          onPress={handleSignup}
          disabled={submitting}
          accessibilityState={{ busy: submitting, disabled: submitting }}
        >
          {submitting ? "가입하는 중…" : "회원가입"}
        </Button>
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
