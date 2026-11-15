import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 인증이 필요 없는 엔드포인트에 붙인다 (명세 API 표의 "인증 불필요"). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
