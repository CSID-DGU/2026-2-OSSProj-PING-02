import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';

export interface KakaoUser {
  id: string; // 카카오 회원번호 → auth_providers.provider_user_id
  email: string | null; // 이메일 제공에 동의했고 인증된 경우에만 값이 있다
}

interface KakaoUserMeResponse {
  id: number;
  kakao_account?: {
    email?: string;
    has_email?: boolean;
    is_email_verified?: boolean;
  };
}

/** 카카오 사용자 정보 조회. 서버가 카카오 토큰을 직접 검증한다 (명세 4-5). */
@Injectable()
export class KakaoClient {
  constructor(private readonly config: ConfigService) {}

  async fetchUser(kakaoAccessToken: string): Promise<KakaoUser> {
    const base = this.config.get<string>('kakao.apiBaseUrl');

    let res: Response;
    try {
      res = await fetch(`${base}/v2/user/me`, {
        headers: { Authorization: `Bearer ${kakaoAccessToken}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new AppException(
        ErrorCode.UPSTREAM_UNAVAILABLE,
        '카카오 서버에 연결할 수 없습니다.',
        503,
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new AppException(ErrorCode.KAKAO_TOKEN_INVALID, '카카오 토큰이 유효하지 않습니다.', 401);
    }
    if (!res.ok) {
      throw new AppException(
        ErrorCode.UPSTREAM_UNAVAILABLE,
        '카카오 사용자 정보를 가져오지 못했습니다.',
        503,
      );
    }

    const body = (await res.json()) as KakaoUserMeResponse;
    const account = body.kakao_account;
    const verifiedEmail =
      account?.has_email && account.is_email_verified && account.email ? account.email : null;

    return { id: String(body.id), email: verifiedEmail };
  }
}
