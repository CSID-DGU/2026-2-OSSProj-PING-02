import { IsBoolean, IsUUID } from 'class-validator';

/** 약관 동의 한 건. 회원가입·카카오 신규 가입·약관 재동의에서 공통으로 쓴다. */
export class TermsAgreementDto {
  @IsUUID()
  termsId: string;

  @IsBoolean()
  agreed: boolean;
}
