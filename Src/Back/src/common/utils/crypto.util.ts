import { createHash, randomBytes } from 'crypto';

/** 토큰 원문은 저장하지 않고 해시만 저장한다 (ERD refresh_tokens.token_hash). */
export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

/** 발급용 refreshToken 원문 (opaque, 랜덤). */
export const randomToken = (): string => randomBytes(48).toString('base64url');
