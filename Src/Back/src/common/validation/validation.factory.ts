import { ValidationError } from 'class-validator';
import { AppException, ErrorDetail } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';

/** class-validator 결과를 명세의 details( field / reason ) 목록으로 펼친다. */
function flatten(errors: ValidationError[], prefix = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = `${prefix}${error.property}`;
    const own = Object.keys(error.constraints ?? {}).map((reason) => ({ field, reason }));
    return [...own, ...flatten(error.children ?? [], `${field}.`)];
  });
}

/**
 * ValidationPipe 실패를 명세 코드로 바꾼다.
 * 이메일 형식 오류는 명세대로 INVALID_EMAIL_FORMAT 으로 응답한다.
 */
export function validationExceptionFactory(errors: ValidationError[]): AppException {
  const details = flatten(errors);
  const isEmailFormat = details.some((d) => d.field === 'email' && d.reason === 'isEmail');

  if (isEmailFormat) {
    return new AppException(
      ErrorCode.INVALID_EMAIL_FORMAT,
      '이메일 형식이 올바르지 않습니다.',
      400,
      details,
    );
  }
  return new AppException(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다.', 400, details);
}
