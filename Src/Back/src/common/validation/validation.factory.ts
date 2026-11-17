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

/** ValidationPipe 실패를 명세 코드(VALIDATION_FAILED)로 바꾼다. */
export function validationExceptionFactory(errors: ValidationError[]): AppException {
  return new AppException(
    ErrorCode.VALIDATION_FAILED,
    '입력값이 올바르지 않습니다.',
    400,
    flatten(errors),
  );
}
