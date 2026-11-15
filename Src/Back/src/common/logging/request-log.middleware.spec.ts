import { Logger } from '@nestjs/common';
import { RequestLogMiddleware } from './request-log.middleware';

describe('RequestLogMiddleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it('요청 한 줄만 남기고, 본문·Authorization 헤더·이메일 원문은 남기지 않는다', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const finishHandlers: Array<() => void> = [];
    const req = {
      method: 'POST',
      originalUrl: '/v1/terms?email=leak@example.com',
      headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig' },
      body: { password: 'abcd1234', messageText: '원문' },
    };
    const res = {
      statusCode: 200,
      on: (event: string, cb: () => void) => {
        if (event === 'finish') finishHandlers.push(cb);
      },
    };

    new RequestLogMiddleware().use(req as any, res as any, () => undefined);
    finishHandlers.forEach((cb) => cb());

    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = String(logSpy.mock.calls[0][0]);
    expect(line).toMatch(/^POST \/v1\/terms\?email=le\*\*\*@example\.com 200 \d+ms$/);
    expect(line).not.toContain('leak@example.com');
    expect(line).not.toContain('abcd1234');
    expect(line).not.toContain('messageText');
    expect(line).not.toContain('eyJ');
  });
});
