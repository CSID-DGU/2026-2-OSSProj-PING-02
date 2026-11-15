import { QueryFailedError } from 'typeorm';

/** PostgreSQL unique_violation(23505) 여부. 동시 가입 등 경쟁 상태 처리에 쓴다. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
