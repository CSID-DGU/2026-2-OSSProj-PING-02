import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../../common/enums';
import { LowerTrim } from '../../../common/transforms';
import { TermsAgreementDto } from '../../terms/dto/terms-agreement.dto';

const BIRTHDATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
// 명세 7-1 제안 규칙: 8자 이상, 영문+숫자 포함 (확정 전)
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class EmailCheckDto {
  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;
}

// 이메일 인증 코드 확인 (가입 직후 또는 재발송 후)
export class VerifyEmailDto {
  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Matches(/^\d{6}$/, { message: '인증 코드는 숫자 6자리입니다.' })
  code: string;
}

// 인증 코드 재발송. 계정 존재 여부와 관계없이 같은 응답을 준다.
export class ResendVerificationDto {
  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class SignupDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @Matches(BIRTHDATE_FORMAT, { message: 'YYYY-MM-DD 형식이어야 합니다.' })
  birthdate: string;

  @IsEnum(Gender)
  gender: Gender;

  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt 입력 한계
  @Matches(PASSWORD_RULE, { message: '영문과 숫자를 포함해야 합니다.' })
  password: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermsAgreementDto)
  termsAgreements: TermsAgreementDto[];
}

export class LoginDto {
  @LowerTrim()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// 약관 재동의(4-10)에서 쓰는 목록 래퍼. 최소 1건.
export class TermsAgreementsBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TermsAgreementDto)
  termsAgreements: TermsAgreementDto[];
}
