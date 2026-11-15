import { maskEmail, maskText } from './log-mask.util';

describe('maskEmail', () => {
  it('앞 2글자만 남기고 도메인은 유지한다', () => {
    expect(maskEmail('hongildong@example.com')).toBe('ho***@example.com');
  });
});

describe('maskText', () => {
  it('문자열 속 이메일을 가린다', () => {
    expect(maskText('login failed for user@example.com')).toBe(
      'login failed for us***@example.com',
    );
  });

  it('JWT 형식 토큰을 가린다', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1In0.abc_DEF-123';
    expect(maskText(`Authorization: Bearer ${jwt}`)).toBe('Authorization: Bearer [TOKEN]');
  });

  it('발급용 refreshToken 같은 긴 base64url 문자열을 가린다', () => {
    const refresh = 'XItPOdZmKsV0XFuqMXzi-opJufStYHh9WPYpJpiqxCp9iZb8U8y-ME3Pod';
    expect(maskText(`token=${refresh}`)).toBe('token=[TOKEN]');
  });

  it('짧은 일반 문자열은 그대로 둔다', () => {
    expect(maskText('GET /v1/terms 200 3ms')).toBe('GET /v1/terms 200 3ms');
  });
});
