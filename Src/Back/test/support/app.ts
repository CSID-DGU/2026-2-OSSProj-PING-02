import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TermsType } from '../../src/common/enums';
import { AppVersion } from '../../src/database/entities/app-version.entity';
import { Terms } from '../../src/database/entities/terms.entity';

/** 테스트용 아이디. 이름 앞부분으로 만들어서 회원마다 다르고 규칙(4~20자)을 지킨다. */
export const usernameOf = (name: string): string =>
  `user_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 20);

export interface TestContext {
  app: INestApplication;
  ds: DataSource;
  termsIds: { service: string; privacy: string };
}

/**
 * 실제 앱과 같은 설정으로 띄우고, 테이블을 비운 뒤 약관·앱 버전을 넣는다.
 * 매 테스트마다 새로 띄우므로 레이트 리밋 카운터도 테스트 사이에 섞이지 않는다.
 */
export async function startApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const ds = app.get(DataSource);
  await ds.query(
    'TRUNCATE TABLE users, auth_providers, refresh_tokens, terms_agreements, terms, model_releases, app_versions RESTART IDENTITY CASCADE',
  );

  const termsRepo = ds.getRepository(Terms);
  const service = await termsRepo.save({
    type: TermsType.SERVICE,
    version: '1.0.0',
    required: true,
    title: '서비스 이용약관',
    url: 'https://example.com/terms/service',
    effectiveAt: new Date('2026-01-01T00:00:00Z'),
  });
  const privacy = await termsRepo.save({
    type: TermsType.PRIVACY,
    version: '1.0.0',
    required: true,
    title: '개인정보 수집 및 이용 동의',
    url: 'https://example.com/terms/privacy',
    effectiveAt: new Date('2026-01-01T00:00:00Z'),
  });

  await ds.getRepository(AppVersion).save({
    platform: 'android',
    latestVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    storeUrl: 'https://example.com/store',
  });

  return { app, ds, termsIds: { service: service.id, privacy: privacy.id } };
}

/** 가입하고 바로 받은 토큰을 돌려준다. 로그인이 필요한 테스트가 공통으로 쓴다. */
export async function register(
  ctx: TestContext,
  body: Record<string, unknown>,
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  const signed = await request(ctx.app.getHttpServer()).post('/v1/auth/signup').send(body);
  if (signed.status !== 201) throw new Error(`signup failed: ${signed.status} ${JSON.stringify(signed.body)}`);

  return {
    userId: signed.body.user.id,
    accessToken: signed.body.tokens.accessToken,
    refreshToken: signed.body.tokens.refreshToken,
  };
}
