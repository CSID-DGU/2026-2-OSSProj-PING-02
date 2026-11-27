import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  // 이 accessToken 이 속한 로그인 세션 (비밀번호 변경 때 지금 기기만 남기는 데 씀)
  sessionId: string;
}

/** JwtAuthGuard 가 검증한 사용자 정보를 꺼낸다. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
  },
);
