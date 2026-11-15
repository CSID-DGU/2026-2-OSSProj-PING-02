import { Transform } from 'class-transformer';

/** 이메일은 앞뒤 공백을 제거하고 소문자로 맞춰 저장·비교한다. */
export const LowerTrim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
