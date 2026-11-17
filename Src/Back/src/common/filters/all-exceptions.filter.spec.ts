import { ArgumentsHost, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';

function makeHost() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('AppException 을 명세 형식으로 응답한다', () => {
    const { res, host } = makeHost();
    filter.catch(
      new AppException(ErrorCode.USERNAME_ALREADY_EXISTS, '이미 사용 중인 아이디입니다.', 409, [
        { field: 'username', reason: 'duplicated' },
      ]),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'USERNAME_ALREADY_EXISTS',
        message: '이미 사용 중인 아이디입니다.',
        details: [{ field: 'username', reason: 'duplicated' }],
      },
    });
  });

  it('429 는 RATE_LIMITED 코드, 한국어 문구, Retry-After 헤더로 응답한다', () => {
    const { res, host } = makeHost();
    filter.catch(new ThrottlerException(), host);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'RATE_LIMITED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        details: [],
      },
    });
  });

  it('처리되지 않은 예외는 500 으로 응답하고, 로그에 이메일을 남기지 않는다', () => {
    const { res, host } = makeHost();
    const spy = Logger.prototype.error as jest.Mock;
    filter.catch(new Error('lookup failed for secret@example.com'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: [] },
    });
    const logged = String(spy.mock.calls[0][0]);
    expect(logged).not.toContain('secret@example.com');
    expect(logged).toContain('se***@example.com');
  });
});
