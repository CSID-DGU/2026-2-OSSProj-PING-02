import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface ErrorDetail {
  field: string;
  reason: string;
}

/**
 * 명세의 에러 형식을 만드는 예외. 필터(AllExceptionsFilter)가
 * { error: { code, message, details } } 형태로 변환한다.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    public readonly appMessage: string,
    status: number, // 426 등 HttpStatus 열거형에 없는 코드도 쓰므로 number 로 받는다
    public readonly details: ErrorDetail[] = [],
  ) {
    super(appMessage, status);
  }
}
