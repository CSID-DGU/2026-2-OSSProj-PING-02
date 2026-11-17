import request from 'supertest';
import { startApp, TestContext } from './support/app';

let ctx: TestContext;

afterEach(async () => {
  delete process.env.TRUST_PROXY;
  await ctx.app.close();
});

/** 로그인은 IP 당 분당 5회까지다. 6번째 요청의 상태 코드를 돌려준다. */
async function sixthLoginStatus(ipOf: (i: number) => string): Promise<number> {
  let last = 0;
  for (let i = 0; i < 6; i++) {
    const res = await request(ctx.app.getHttpServer())
      .post('/v1/auth/login')
      .set('X-Forwarded-For', ipOf(i))
      .send({ username: 'nobody_here', password: 'abcd1234' });
    last = res.status;
  }
  return last;
}

describe('TRUST_PROXY', () => {
  it('기본값(0)에서는 X-Forwarded-For 를 믿지 않아서, 헤더를 바꿔도 제한을 피할 수 없다', async () => {
    ctx = await startApp();
    expect(await sixthLoginStatus((i) => `203.0.113.${i + 1}`)).toBe(429);
  });

  it('1 로 설정하면 헤더의 클라이언트 IP 별로 제한을 센다', async () => {
    process.env.TRUST_PROXY = '1';
    ctx = await startApp();
    expect(await sixthLoginStatus((i) => `203.0.113.${i + 1}`)).toBe(401);
  });

  it('1 로 설정해도 같은 클라이언트 IP 는 제한에 걸린다', async () => {
    process.env.TRUST_PROXY = '1';
    ctx = await startApp();
    expect(await sixthLoginStatus(() => '203.0.113.9')).toBe(429);
  });
});
