import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TermsType } from '../../src/common/enums';
import { AppException } from '../../src/common/errors/app.exception';
import { ErrorCode } from '../../src/common/errors/error-codes';
import { AppVersion } from '../../src/database/entities/app-version.entity';
import { Terms } from '../../src/database/entities/terms.entity';
import { MailService } from '../../src/modules/mail/mail.service';

/**
 * 테스트용 메일 발송기. 실제 SMTP 대신 보낸 코드를 기억해 두었다가 테스트가 읽게 한다.
 * failNext 를 켜면 다음 발송이 실패한다(발송 실패 시 가입 롤백 검증용).
 */
export class FakeMailService {
  readonly sent: Array<{ to: string; code: string }> = [];
  failNext = false;

  async sendVerificationCode(to: string, code: string): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new AppException(ErrorCode.UPSTREAM_UNAVAILABLE, '인증 메일을 보내지 못했습니다.', 503);
    }
    this.sent.push({ to, code });
  }

  /** 해당 주소로 마지막에 보낸 코드 */
  codeFor(to: string): string {
    const found = [...this.sent].reverse().find((m) => m.to === to);
    if (!found) throw new Error(`no verification mail for ${to}`);
    return found.code;
  }
}

export interface TestContext {
  app: INestApplication;
  ds: DataSource;
  mail: FakeMailService;
  termsIds: { service: string; privacy: string };
}

/**
 * 실제 앱과 같은 설정으로 띄우고, 테이블을 비운 뒤 약관·앱 버전을 넣는다.
 * 매 테스트마다 새로 띄우므로 레이트 리밋 카운터도 테스트 사이에 섞이지 않는다.
 */
export async function startApp(): Promise<TestContext> {
  const mail = new FakeMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const ds = app.get(DataSource);
  await ds.query(
    'TRUNCATE TABLE users, auth_providers, refresh_tokens, email_verifications, terms_agreements, terms, model_releases, app_versions RESTART IDENTITY CASCADE',
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

  return { app, ds, mail, termsIds: { service: service.id, privacy: privacy.id } };
}

/**
 * 가입 → 메일로 온 코드 확인까지 끝내고 토큰을 받는다.
 * 이메일 인증이 필요한 테스트가 공통으로 쓴다.
 */
export async function registerVerified(
  ctx: TestContext,
  body: Record<string, unknown>,
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  const email = String(body.email);
  const signed = await request(ctx.app.getHttpServer()).post('/v1/auth/signup').send(body);
  if (signed.status !== 201) throw new Error(`signup failed: ${signed.status} ${JSON.stringify(signed.body)}`);

  const verified = await request(ctx.app.getHttpServer())
    .post('/v1/auth/email/verify')
    .send({ email, code: ctx.mail.codeFor(email) });
  if (verified.status !== 200) throw new Error(`verify failed: ${verified.status} ${JSON.stringify(verified.body)}`);

  return {
    userId: verified.body.user.id,
    accessToken: verified.body.tokens.accessToken,
    refreshToken: verified.body.tokens.refreshToken,
  };
}
