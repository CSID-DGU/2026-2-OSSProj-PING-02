import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
// 아이디: 소문자 영문으로 시작, 영문 소문자·숫자·밑줄, 4~20자 (확정 전)
export const USERNAME_RULE = /^[a-z][a-z0-9_]{3,19}$/;

/** 비밀번호 규칙 */
const IsPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(8),
    MaxLength(72), // bcrypt 입력 한계
    Matches(PASSWORD_RULE, { message: '영문과 숫자를 포함해야 합니다.' }),
  );

/** 아이디 규칙. 앞뒤 공백을 지우고 소문자로 맞춘 뒤 검사한다. */
const IsUsername = () =>
  applyDecorators(
    LowerTrim(),
    IsString(),
    Matches(USERNAME_RULE, {
      message: '아이디는 영문 소문자로 시작하는 4~20자(영문 소문자, 숫자, 밑줄)여야 합니다.',
    }),
  );

export class UsernameCheckDto {
  @IsUsername()
  username: string;
}

export class SignupDto {
  @IsUsername()
  username: string;

  @IsString()
  @Length(1, 50)
  name: string;

  @Matches(BIRTHDATE_FORMAT, { message: 'YYYY-MM-DD 형식이어야 합니다.' })
  birthdate: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsPassword()
  password: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermsAgreementDto)
  termsAgreements: TermsAgreementDto[];
}

export class LoginDto {
  // 로그인은 아이디로 한다. (이메일은 사용하지 않는다)
  @LowerTrim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

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
