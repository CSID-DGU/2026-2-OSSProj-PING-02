import { applyDecorators } from '@nestjs/common';
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
// 아이디: 소문자 영문으로 시작, 영문 소문자·숫자·밑줄, 4~20자 (확정 전)
export const USERNAME_RULE = /^[a-z][a-z0-9_]{3,19}$/;

/** 비밀번호 규칙. 가입과 비밀번호 재설정에서 같은 규칙을 쓴다. */
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

export class EmailCheckDto {
  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class UsernameCheckDto {
  @IsUsername()
  username: string;
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

// 아이디 찾기: 가입한 이메일로 아이디를 보낸다. 계정 존재 여부와 관계없이 같은 응답을 준다.
export class FindUsernameDto {
  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;
}

// 비밀번호 찾기 1단계: 아이디와 가입 이메일이 맞으면 재설정 코드를 보낸다.
export class ForgotPasswordDto {
  @IsUsername()
  username: string;

  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;
}

// 비밀번호 찾기 2단계: 메일로 받은 코드와 새 비밀번호
export class ResetPasswordDto {
  @IsUsername()
  username: string;

  @Matches(/^\d{6}$/, { message: '인증 코드는 숫자 6자리입니다.' })
  code: string;

  @IsPassword()
  newPassword: string;
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

  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsPassword()
  password: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermsAgreementDto)
  termsAgreements: TermsAgreementDto[];
}

export class LoginDto {
  // 로그인은 아이디로 한다. 이메일은 인증과 아이디·비밀번호 찾기에만 쓴다.
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
