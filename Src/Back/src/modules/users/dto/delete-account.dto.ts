import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  // 이메일 계정은 재확인용으로 필요하다. 카카오 계정은 보내지 않는다 (명세 4-9).
  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;
}
