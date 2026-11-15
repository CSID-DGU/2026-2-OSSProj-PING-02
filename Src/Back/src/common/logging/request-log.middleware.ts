import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { maskText } from '../utils/log-mask.util';

/**
 * 요청 한 줄 로그: 메서드, 경로(쿼리 포함, 마스킹), 상태 코드, 걸린 시간.
 * 요청 본문과 헤더(Authorization 포함)는 남기지 않는다.
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    res.on('finish', () => {
      const elapsed = Date.now() - startedAt;
      this.logger.log(`${req.method} ${maskText(req.originalUrl)} ${res.statusCode} ${elapsed}ms`);
    });
    next();
  }
}
