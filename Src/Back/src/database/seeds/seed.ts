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

  console.log('seed 완료: terms(2), app_versions(android)');
  await app.close();
}

seed().catch((error: unknown) => {
  console.error('seed 실패', error);
  process.exit(1);
});
