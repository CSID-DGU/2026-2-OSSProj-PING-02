import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 모델 파일 다운로드 URL 발급 (명세 4-11).
 * TODO: 실제 서명 URL(S3 presign / CloudFront signed URL)로 교체한다.
 * 지금은 기본 CDN 주소에 만료 시각만 붙인 비서명 URL이다.
 */
@Injectable()
export class ModelStorageService {
  constructor(private readonly config: ConfigService) {}

  createDownloadUrl(storageKey: string): { url: string; expiresAt: Date } {
    const base = (this.config.get<string>('model.cdnBaseUrl') ?? '').replace(/\/$/, '');
    const ttlMinutes = this.config.get<number>('model.urlTtlMinutes') ?? 15;
    return {
      url: `${base}/${storageKey}`,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    };
  }
}
