const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 생년월일 형식(YYYY-MM-DD)과 실제 존재하는 날짜, 미래가 아닌지 확인한다. */
export function isValidBirthdate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.toISOString().slice(0, 10) !== value) return false; // 2월 30일 같은 값 거르기
  return date.getTime() <= Date.now();
}

/** pg 드라이버가 date 컬럼을 돌려줄 때 문자열/Date 어느 쪽이든 YYYY-MM-DD 로 맞춘다. */
export function toDateOnly(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const addDays = (base: Date, days: number): Date =>
  new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
