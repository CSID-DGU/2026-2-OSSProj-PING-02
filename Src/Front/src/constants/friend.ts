// 05 친구 화면 공통 문구
// 원칙: 관계를 평가하지 않음. 오래된 연락도 "N일째 연락 안 함"처럼 재촉하지 않고 지난 때만 알려 줌

// 마지막 연락이 언제였는지 (날짜 기준: 오늘·어제·N일 전·N주 전·N개월 전·N년 전)
export const formatSince = (iso: string, now = new Date()) => {
  const day = new Date(iso).setHours(0, 0, 0, 0);
  const today = new Date(now).setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((today - day) / 86_400_000));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
};

// 13 목록 카드 아래 줄
export const friendStatusText = (frozen: boolean, lastContactAt: string | null) =>
  frozen
    ? "얼려둔 관계"
    : lastContactAt
    ? `최근 연락: ${formatSince(lastContactAt)}`
    : "아직 주고받은 연락이 없어요";

// "05-18" → "5월 18일"
export const formatBirthday = (mmdd: string) => {
  const [month, day] = mmdd.split("-").map(Number);
  return `${month}월 ${day}일`;
};
