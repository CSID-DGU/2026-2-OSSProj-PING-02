import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppException, ErrorDetail } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { maskText } from '../utils/log-mask.util';

const RATE_LIMIT_MESSAGE = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
const RETRY_AFTER_SECONDS = 60;

// 명세에 없는 HttpException(라우트 미존재 등)을 명세 코드로 맞춘다.
const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHORIZED,
  404: ErrorCode.NOT_FOUND,
  413: ErrorCode.VALIDATION_FAILED,
  415: ErrorCode.VALIDATION_FAILED,
  429: ErrorCode.RATE_LIMITED,
};

// 프레임워크가 만드는 영문 문구 대신 사용자에게 보여줄 문구
const STATUS_MESSAGE: Partial<Record<number, string>> = {
  413: '요청 본문이 너무 큽니다.',
  415: '지원하지 않는 요청 형식입니다. JSON으로 보내 주세요.',
};

const GENERIC_MESSAGE: Partial<Record<number, string>> = {
  400: '요청 형식이 올바르지 않습니다.',
  401: '인증이 필요합니다.',
  404: '요청한 경로를 찾을 수 없습니다.',
  405: '허용되지 않은 요청 방법입니다.',
};

/** body-parser 가 만드는 4xx 오류 (status 속성이 있는 Error). */
function isBodyParserError(e: unknown): e is Error & { status: number } {
  if (!(e instanceof Error)) return false;
  const status = (e as { status?: unknown }).status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

interface ErrorBody {
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
}

/**
 * 모든 예외를 명세 형식({ error: { code, message, details } })으로 응답한다.
 * 요청 본문은 로그에 남기지 않는다(명세 6. 보안·개인정보).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ErrorBody = {
      code: ErrorCode.INTERNAL_ERROR,
      message: '서버 오류가 발생했습니다.',
      details: [],
    };

    if (exception instanceof AppException) {
      status = exception.getStatus();
      error = {
        code: exception.code,
        message: exception.appMessage,
        details: exception.details,
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = {
        code: STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR,
        // 프레임워크 문구(파싱 오류 위치 등)는 내부 정보라서 그대로 내보내지 않는다.
        message:
          status === 429
            ? RATE_LIMIT_MESSAGE
            : (STATUS_MESSAGE[status] ?? GENERIC_MESSAGE[status] ?? '요청을 처리할 수 없습니다.'),
        details: [],
      };
    } else if (isBodyParserError(exception)) {
      // 본문 파싱 실패(JSON 문법 오류, 본문 과대)는 Nest 예외가 아니라 body-parser 가 던진다.
      status = exception.status;
      error = {
        code: STATUS_TO_CODE[status] ?? ErrorCode.VALIDATION_FAILED,
        message: STATUS_MESSAGE[status] ?? '요청 본문을 읽을 수 없습니다.',
        details: [],
      };
    } else {
      // 스택만 기록한다. 원인 객체 전체를 찍으면 요청 값이 섞일 수 있다.
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(maskText(`Unhandled exception: ${stack}`));
    }

    if (status === 429) {
      // 인증 라우트의 제한 창이 60초다.
      res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS));
    }
    res.status(status).json({ error });
  }
}
