/**
 * 로그에 남기기 전에 개인정보와 토큰을 가린다 (명세 6. 보안·개인정보).
 * 요청 본문은 애초에 로그에 남기지 않고, 여기서는 URL·에러 문구에 섞인 값을 가린다.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// JWT 형식 (header.payload.signature)
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
// 발급용 refreshToken 은 base64url 64자 안팎의 긴 문자열이다
const LONG_TOKEN = /[A-Za-z0-9_-]{40,}/g;

/** a@example.com → ab***@example.com (앞 2글자만 남긴다) */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskText(text: string): string {
  return text
    .replace(JWT, '[TOKEN]')
    .replace(EMAIL, (match) => maskEmail(match))
    .replace(LONG_TOKEN, '[TOKEN]');
}
