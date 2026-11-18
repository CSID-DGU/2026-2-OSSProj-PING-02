import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { TermsType } from '../../common/enums';
import { AppVersion } from '../entities/app-version.entity';
import { Terms } from '../entities/terms.entity';

/**
 * 기본 데이터 주입 (여러 번 실행해도 안전하다).
 * 약관 URL·스토어 주소는 자리표시자이므로 확정되면 여기서 고친다.
 */
async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const dataSource = app.get(DataSource);

  await dataSource.getRepository(Terms).upsert(
    [
      {
        type: TermsType.SERVICE,
        version: '1.0.0',
        required: true,
        title: '서비스 이용약관',
        url: 'https://example.com/terms/service',
        effectiveAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        type: TermsType.PRIVACY,
        version: '1.0.0',
        required: true,
        title: '개인정보 수집 및 이용 동의',
        url: 'https://example.com/terms/privacy',
        effectiveAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        // 초안: 문구(Doc/약관_초안_AI전송.md)와 필수 여부는 법률 검토 후 확정한다.
        // 선택 동의로 두어 기존 가입 흐름을 바꾸지 않는다. 필수로 바꾸면 가입할 때 반드시 동의해야 한다.
        type: TermsType.AI_TRANSFER,
        version: '1.0.0',
        required: false,
        title: '외부 AI 서버 전송 및 국외 이전 동의 (초안)',
        url: 'https://example.com/terms/ai-transfer',
        effectiveAt: new Date('2026-12-01T00:00:00Z'),
      },
    ],
    { conflictPaths: ['type', 'version'] },
  );

  await dataSource.getRepository(AppVersion).upsert(
    [
      {
        platform: 'android',
        latestVersion: '1.0.0',
        minSupportedVersion: '1.0.0',
        storeUrl: 'https://play.google.com/store/apps/details?id=com.malssiat',
      },
    ],
    { conflictPaths: ['platform'] },
  );

  console.log('seed 완료: terms(3), app_versions(android)');
  await app.close();
}

seed().catch((error: unknown) => {
  console.error('seed 실패', error);
  process.exit(1);
});
