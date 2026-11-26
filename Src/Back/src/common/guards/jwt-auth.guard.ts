import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 전역 가드. @Public() 이 없는 모든 라우트는 Bearer accessToken 이 필요하다.
 * 명세 3-1: accessToken 만료(401 UNAUTHORIZED) → 앱이 /auth/refresh 로 갱신.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearer(req.headers.authorization);
    if (!token) throw unauthorized();

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid?: string }>(token);
      // 세션이 아직 살아 있는지 확인한다. 로그아웃·탈퇴·재사용 감지 시 즉시 401 이 된다.
      if (!payload.sid || !(await this.isSessionActive(payload.sub, payload.sid))) {
        throw unauthorized();
      }
      req.user = { id: payload.sub, sessionId: payload.sid };
      return true;
    } catch {
      throw unauthorized();
    }
  }

  /** 세션에 아직 폐기되지 않은, 만료되지 않은 refresh 행이 하나라도 있으면 살아 있는 세션이다. */
  private async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    return this.dataSource.getRepository(RefreshToken).existsBy({
      userId,
      sessionId,
      revokedAt: IsNull(),
      expiresAt: MoreThan(new Date()),
    });
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function unauthorized(): AppException {
  return new AppException(ErrorCode.UNAUTHORIZED, '인증이 필요합니다.', 401);
}
