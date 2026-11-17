import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TermsType } from '../../src/common/enums';
import { AppVersion } from '../../src/database/entities/app-version.entity';
import { Terms } from '../../src/database/entities/terms.entity';
import { MailService } from '../../src/modules/mail/mail.service';

/**
 * 테스트용 메일 발송기. 실제 SMTP 대신 보낸 내용을 기억해 두었다가 테스트가 읽게 한다.
 */
export class FakeMailService {
  readonly resets: Array<{ to: string; code: string }> = [];
  readonly usernames: Array<{ to: string; usernames: string[] }> = [];

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    this.resets.push({ to, code });
  }

  async sendUsername(to: string, usernames: string[]): Promise<void> {
    this.usernames.push({ to, usernames });
  }

  /** 해당 주소로 마지막에 보낸 비밀번호 재설정 코드 */
  resetCodeFor(to: string): string {
    const found = [...this.resets].reverse().find((m) => m.to === to);
    if (!found) throw new Error(`no reset mail for ${to}`);
    return found.code;
  }
}

/** 테스트용 아이디. 이메일 앞부분으로 만들어서 회원마다 다르고 규칙(4~20자)을 지킨다. */
export const usernameOf = (email: string): string =>
  `user_${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 20);

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
    'TRUNCATE TABLE users, auth_providers, refresh_tokens, password_resets, mail_sends, terms_agreements, terms, model_releases, app_versions RESTART IDENTITY CASCADE',
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

/** 가입하고 바로 받은 토큰을 돌려준다(이메일 인증은 없다). 로그인이 필요한 테스트가 공통으로 쓴다. */
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
