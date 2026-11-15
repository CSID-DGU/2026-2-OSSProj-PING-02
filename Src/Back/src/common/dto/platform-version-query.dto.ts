import { IsIn, Matches } from 'class-validator';

export const SUPPORTED_PLATFORMS = ['android'] as const;

/** GET /models/latest, GET /app/version 공통 쿼리 (명세 4-11, 4-12). */
export class PlatformVersionQueryDto {
  @IsIn(SUPPORTED_PLATFORMS)
  platform: string;

  @Matches(/^\d+\.\d+\.\d+$/, { message: 'x.y.z 형식이어야 합니다.' })
  appVersion: string;
}
