import styled from "styled-components/native";
import { Checkbox } from "@core/ui/checkbox";
import { ChoiceGroup } from "@core/ui/choice";
import { Field, Input } from "@core/ui/field";
import { Select } from "@core/ui/select";
import {
  DOMAIN_REGEX,
  EMAIL_DOMAINS,
  GENDER_OPTIONS,
  type Gender,
} from "@constants/auth";

// 생년월일·성별·이메일 입력 (Figma 01-3 회원가입, 08 설정 H02 내 정보 수정 같은 모양, #60)
// 값은 부르는 쪽이 들고 있고, 바뀌면 onChange로 알려 줌 (오류 지우기 등은 부르는 쪽에서)

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
const DOMAIN_OPTIONS = EMAIL_DOMAINS.map((domain) => ({
  label: domain,
  value: domain,
}));

// 월마다 마지막 날이 달라서 연·월에 맞춰 일 선택지를 만듦
export const getDayOptions = (year?: number, month?: number) => {
  const lastDay = month ? new Date(year ?? 2000, month, 0).getDate() : 31;
  return Array.from({ length: lastDay }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    value: i + 1,
  }));
};

export interface BirthValue {
  year?: number;
  month?: number;
  day?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "YYYY-MM-DD" (서버 형식). 하나라도 비었으면 undefined */
export const toBirthdate = ({ year, month, day }: BirthValue) =>
  year && month && day ? `${year}-${pad(month)}-${pad(day)}` : undefined;
export const fromBirthdate = (birthdate?: string): BirthValue => {
  const [year, month, day] = (birthdate ?? "").split("-").map(Number);
  return year && month && day ? { year, month, day } : {};
};

interface BirthdateFieldProps {
  value: BirthValue;
  onChange: (next: BirthValue) => void;
  error?: string;
}

export const BirthdateField = ({
  value,
  onChange,
  error,
}: BirthdateFieldProps) => {
  // 연·월이 바뀌어 고른 날짜가 없어지면(2/30 등) 일 선택을 비움
  const change = (next: BirthValue) => {
    const lastDay = getDayOptions(next.year, next.month).length;
    onChange(
      next.day && next.day > lastDay ? { ...next, day: undefined } : next
    );
  };
  return (
    <Field label="생년월일" helper={error} state={error ? "error" : "default"}>
      <Row>
        <Select
          placeholder="YYYY"
          sheetTitle="태어난 해"
          options={YEAR_OPTIONS}
          value={value.year}
          onChange={(year) => change({ ...value, year })}
          error={!!error && !value.year}
          flex={128}
        />
        <Select
          placeholder="MM"
          sheetTitle="태어난 달"
          options={MONTH_OPTIONS}
          value={value.month}
          onChange={(month) => change({ ...value, month })}
          error={!!error && !value.month}
          flex={88}
        />
        <Select
          placeholder="DD"
          sheetTitle="태어난 날"
          options={getDayOptions(value.year, value.month)}
          value={value.day}
          onChange={(day) => change({ ...value, day })}
          error={!!error && !value.day}
          flex={88}
        />
      </Row>
    </Field>
  );
};

interface GenderFieldProps {
  value?: Gender;
  onChange: (next: Gender) => void;
  error?: string;
}

export const GenderField = ({ value, onChange, error }: GenderFieldProps) => (
  <Field label="성별" helper={error} state={error ? "error" : "default"}>
    <ChoiceGroup
      options={[...GENDER_OPTIONS]}
      value={value}
      onChange={onChange}
      error={!!error}
    />
  </Field>
);

export interface EmailValue {
  local: string;
  domain: string; // 목록에서 고른 도메인
  custom: boolean; // "직접 입력할게요"
  domainInput: string; // 직접 쓴 도메인
}

export const EMPTY_EMAIL: EmailValue = {
  local: "",
  domain: EMAIL_DOMAINS[0],
  custom: false,
  domainInput: "",
};

export const emailDomainOf = (v: EmailValue) =>
  v.custom ? v.domainInput.trim() : v.domain;

/** 저장할 이메일 (소문자) */
export const composeEmail = (v: EmailValue) =>
  `${v.local.trim()}@${emailDomainOf(v)}`.toLowerCase();

/** 저장된 이메일 → 입력 값 (목록에 없는 도메인이면 직접 입력) */
export const splitEmail = (email?: string): EmailValue => {
  const at = email?.lastIndexOf("@") ?? -1;
  if (!email || at < 0) return EMPTY_EMAIL;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const listed = (EMAIL_DOMAINS as readonly string[]).includes(domain);
  return listed
    ? { local, domain, custom: false, domainInput: "" }
    : { local, domain: EMAIL_DOMAINS[0], custom: true, domainInput: domain };
};

/** 비었으면 "required", 형식이 틀리면 "invalid", 괜찮으면 undefined */
export const checkEmail = (v: EmailValue) => {
  const domain = emailDomainOf(v);
  if (!v.local.trim() || !domain) return "required" as const;
  if (/[\s@]/.test(v.local.trim()) || !DOMAIN_REGEX.test(domain))
    return "invalid" as const;
  return undefined;
};

interface EmailFieldProps {
  value: EmailValue;
  onChange: (next: EmailValue) => void;
  error?: string;
  helper?: string;
}

export const EmailField = ({
  value,
  onChange,
  error,
  helper,
}: EmailFieldProps) => (
  <Field
    label="이메일"
    helper={error ?? helper}
    state={error ? "error" : "default"}
  >
    <Row>
      <EmailLocal>
        <Input
          size="small"
          placeholder="example"
          value={value.local}
          onChangeText={(local) => onChange({ ...value, local })}
          state={error ? "error" : "default"}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          accessibilityLabel="이메일 아이디"
        />
      </EmailLocal>
      <At>@</At>
      {value.custom ? (
        <EmailDomain>
          <Input
            size="small"
            placeholder="직접 입력"
            value={value.domainInput}
            onChangeText={(domainInput) => onChange({ ...value, domainInput })}
            state={error ? "error" : "default"}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="이메일 도메인"
          />
        </EmailDomain>
      ) : (
        <Select
          placeholder="도메인 선택"
          sheetTitle="이메일 도메인"
          options={DOMAIN_OPTIONS}
          value={value.domain}
          onChange={(domain) => onChange({ ...value, domain })}
          flex={148}
        />
      )}
    </Row>
    <Checkbox
      label="직접 입력할게요"
      checked={value.custom}
      onChange={(custom) => onChange({ ...value, custom })}
    />
  </Field>
);

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const EmailLocal = styled.View`
  flex: 132;
`;

const EmailDomain = styled.View`
  flex: 148;
`;

const At = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
