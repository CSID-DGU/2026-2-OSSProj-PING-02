import request from 'supertest';
import { TermsType } from '../src/common/enums';
import { Terms } from '../src/database/entities/terms.entity';
import { register, startApp, TestContext, usernameOf } from './support/app';

// 외부 AI 서버 전송 동의(AI_TRANSFER) 약관을 추가했을 때 기존 가입·재동의 흐름이 그대로 동작하는지 확인한다.
let ctx: TestContext;
let aiTermsId: string;

beforeEach(async () => {
  ctx = await startApp();
});

afterEach(async () => {
  await ctx.app.close();
});

const http = () => request(ctx.app.getHttpServer());

/** 시드와 같은 형태(선택 동의)로 AI 전송 약관을 넣는다. 필수 여부는 테스트마다 바꿀 수 있다. */
async function addAiTerms(required = false): Promise<void> {
  const saved = await ctx.ds.getRepository(Terms).save({
    type: TermsType.AI_TRANSFER,
    version: '1.0.0',
    required,
    title: '외부 AI 서버 전송 및 국외 이전 동의 (초안)',
    url: 'https://example.com/terms/ai-transfer',
    effectiveAt: new Date('2026-12-01T00:00:00Z'),
  });
  aiTermsId = saved.id;
}

const signupBody = (extra: Array<{ termsId: string; agreed: boolean }> = []) => ({
  username: usernameOf('termsai@example.com'),
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  email: 'termsai@example.com',
  password: 'abcd1234',
  termsAgreements: [
    { termsId: ctx.termsIds.service, agreed: true },
    { termsId: ctx.termsIds.privacy, agreed: true },
    ...extra,
  ],
});

describe('AI 전송 동의 약관 (선택 동의, 초안)', () => {
  it('약관 목록에 AI_TRANSFER 가 선택 동의로 나온다', async () => {
    await addAiTerms();
    const res = await http().get('/v1/terms');
    expect(res.body.terms).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: aiTermsId, type: 'AI_TRANSFER', required: false })]),
    );
  });

  it('선택 동의라서 동의하지 않아도 가입할 수 있다 (기존 가입 흐름 유지)', async () => {
    await addAiTerms();
    const res = await http().post('/v1/auth/signup').send(signupBody());
    expect(res.status).toBe(201);
  });

  it('가입할 때 동의하면 내 정보의 약관 목록에 나온다', async () => {
    await addAiTerms();
    const { accessToken } = await register(ctx, signupBody([{ termsId: aiTermsId, agreed: true }]));
    const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.body.termsAgreements).toEqual(
      expect.arrayContaining([expect.objectContaining({ termsId: aiTermsId, version: '1.0.0' })]),
    );
  });

  it('약관이 생기기 전에 가입한 회원도 재동의 API(4-10)로 동의할 수 있다', async () => {
    const { accessToken } = await register(ctx, signupBody());
    await addAiTerms();

    const res = await http()
      .post('/v1/users/me/terms-agreements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ termsAgreements: [{ termsId: aiTermsId, agreed: true }] });
    expect(res.status).toBe(204);

    const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.body.termsAgreements.map((a: { termsId: string }) => a.termsId)).toContain(aiTermsId);
  });

  it('선택 동의는 나중에 철회할 수 있다', async () => {
    await addAiTerms();
    const { accessToken } = await register(ctx, signupBody([{ termsId: aiTermsId, agreed: true }]));

    const res = await http()
      .post('/v1/users/me/terms-agreements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ termsAgreements: [{ termsId: aiTermsId, agreed: false }] });
    expect(res.status).toBe(204);

    const me = await http().get('/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.body.termsAgreements.map((a: { termsId: string }) => a.termsId)).not.toContain(aiTermsId);
  });

  it('필수로 바꾸면 동의하지 않은 가입은 422 이고, 철회도 막힌다 (나중에 필수로 정할 경우)', async () => {
    await addAiTerms(true);
    const refused = await http().post('/v1/auth/signup').send(signupBody());
    expect(refused.status).toBe(422);
    expect(refused.body.error.code).toBe('REQUIRED_TERMS_NOT_AGREED');

    const { accessToken } = await register(ctx, signupBody([{ termsId: aiTermsId, agreed: true }]));
    const revoke = await http()
      .post('/v1/users/me/terms-agreements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ termsAgreements: [{ termsId: aiTermsId, agreed: false }] });
    expect(revoke.status).toBe(422);
  });
});
