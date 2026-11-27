import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { Gender } from '../../../common/enums';
import { LowerTrim } from '../../../common/transforms';
import { BIRTHDATE_FORMAT, IsPassword } from '../../auth/dto/auth.dto';

// 보내지 않은 항목만 건너뛴다. null 은 검사해서 400 으로 막는다 (IsOptional 은 null 도 통과시켜 DB 오류가 난다).
const IfPresent = () => ValidateIf((_o, value) => value !== undefined);

/** POST /users/me/password/verify */
export class VerifyPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}

/**
 * PATCH /users/me. 보낸 항목만 고친다. 이름·아이디는 고치지 않는다(보내면 400).
 * 값 규칙은 회원가입과 같다. 이메일은 가입과 같이 중복을 막지 않는다.
 */
export class UpdateMeDto {
  // 이메일 계정은 비밀번호를 다시 확인한다. 카카오 계정(비밀번호 없음)은 보내지 않는다 (회원 탈퇴와 같음).
  @IfPresent()
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password?: string;

  @IfPresent()
  @LowerTrim()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IfPresent()
  @Matches(BIRTHDATE_FORMAT, { message: 'YYYY-MM-DD 형식이어야 합니다.' })
  birthdate?: string;

  @IfPresent()
  @IsEnum(Gender)
  gender?: Gender;
}

/** PATCH /users/me/password. 새 비밀번호 규칙은 회원가입과 같다. */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword: string;

  @IsPassword()
  newPassword: string;
}
