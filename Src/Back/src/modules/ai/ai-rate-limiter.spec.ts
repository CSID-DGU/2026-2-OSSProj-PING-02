import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception';
import { AiRateLimiter } from './ai-rate-limiter';

const config = (perMinute: number, perDay: number) =>
  ({ get: (key: string) => ({ 'ai.perMinute': perMinute, 'ai.perDay': perDay })[key] }) as unknown as ConfigService;

const blocked = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof AppException ? `${e.getStatus()}:${e.code}` : 'other';
  }
};

describe('AiRateLimiter (메모리 카운터)', () => {
  const t0 = 1_800_000_000_000;

  it('분당 한도까지는 통과하고 그다음은 429 RATE_LIMITED', () => {
    const limiter = new AiRateLimiter(config(3, 100));
    for (let i = 0; i < 3; i++) expect(blocked(() => limiter.consume('u1', t0 + i))).toBeNull();
    expect(blocked(() => limiter.consume('u1', t0 + 10))).toBe('429:RATE_LIMITED');
  });

  it('1분이 지나면 다시 쓸 수 있다', () => {
    const limiter = new AiRateLimiter(config(1, 100));
    limiter.consume('u1', t0);
    expect(blocked(() => limiter.consume('u1', t0 + 59_999))).toBe('429:RATE_LIMITED');
    expect(blocked(() => limiter.consume('u1', t0 + 60_000))).toBeNull();
  });

  it('하루 한도를 넘으면 분이 바뀌어도 막히고, 하루가 지나면 풀린다', () => {
    const limiter = new AiRateLimiter(config(100, 2));
    limiter.consume('u1', t0);
    limiter.consume('u1', t0 + 1);
    expect(blocked(() => limiter.consume('u1', t0 + 120_000))).toBe('429:RATE_LIMITED');
    expect(blocked(() => limiter.consume('u1', t0 + 24 * 3_600_000))).toBeNull();
  });

  it('사용자마다 따로 센다', () => {
    const limiter = new AiRateLimiter(config(1, 100));
    limiter.consume('u1', t0);
    expect(blocked(() => limiter.consume('u2', t0))).toBeNull();
  });

  it('막힌 요청은 횟수에 더하지 않는다', () => {
    const limiter = new AiRateLimiter(config(1, 2));
    limiter.consume('u1', t0);
    for (let i = 0; i < 5; i++) blocked(() => limiter.consume('u1', t0 + 1 + i));
    // 하루 한도 2 중 1번만 썼으므로, 1분 뒤에는 한 번 더 된다
    expect(blocked(() => limiter.consume('u1', t0 + 60_000))).toBeNull();
  });
});
