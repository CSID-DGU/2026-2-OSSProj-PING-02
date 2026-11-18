import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';

interface Window {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * 60_000;

/**
 * 사용자별 AI 호출 횟수 제한. 횟수만 서버 메모리에 세고 DB 에는 아무것도 저장하지 않는다.
 * 서버를 다시 시작하면 초기화된다. 서버가 여러 대가 되면 서버마다 따로 센다.
 */
@Injectable()
export class AiRateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly config: ConfigService) {}

  consume(userId: string, now = Date.now()): void {
    const perMinute = this.config.get<number>('ai.perMinute') ?? 10;
    const perDay = this.config.get<number>('ai.perDay') ?? 300;

    const w = this.windows.get(userId) ?? { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
    if (now - w.minuteStart >= MINUTE) {
      w.minuteStart = now;
      w.minuteCount = 0;
    }
    if (now - w.dayStart >= DAY) {
      w.dayStart = now;
      w.dayCount = 0;
    }
    if (w.dayCount >= perDay) {
      throw new AppException(ErrorCode.RATE_LIMITED, '오늘 사용할 수 있는 횟수를 모두 썼습니다. 내일 다시 시도해 주세요.', 429);
    }
    if (w.minuteCount >= perMinute) {
      throw new AppException(ErrorCode.RATE_LIMITED, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);
    }
    w.minuteCount += 1;
    w.dayCount += 1;
    this.windows.set(userId, w);
    this.sweep(now);
  }

  /** 하루가 지난 기록은 지워서 메모리가 계속 늘지 않게 한다. */
  private sweep(now: number): void {
    if (this.windows.size < 1000) return;
    for (const [id, w] of this.windows) {
      if (now - w.dayStart >= DAY) this.windows.delete(id);
    }
  }
}
