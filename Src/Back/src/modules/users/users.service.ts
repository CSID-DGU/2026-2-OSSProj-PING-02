import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { AuthProviderType } from '../../common/enums';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { isValidBirthdate, toDateOnly } from '../../common/utils/date.util';
import { AuthProvider } from '../../database/entities/auth-provider.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { TermsAgreement } from '../../database/entities/terms-agreement.entity';
import { User } from '../../database/entities/user.entity';
import { TermsAgreementDto } from '../terms/dto/terms-agreement.dto';
import { TermsService } from '../terms/terms.service';
import { PasswordVerifier } from '../auth/password-verifier';
import { ChangePasswordDto, UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuthProvider) private readonly providers: Repository<AuthProvider>,
    @InjectRepository(TermsAgreement) private readonly agreements: Repository<TermsAgreement>,
    private readonly terms: TermsService,
    private readonly dataSource: DataSource,
    private readonly passwords: PasswordVerifier,
  ) {}

  /** 명세 4-8. */
  async getMe(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { termsAgreements: { terms: true } },
    });
    if (!user) throw new AppException(ErrorCode.UNAUTHORIZED, '인증이 필요합니다.', 401);

    const isKakao = await this.providers.existsBy({
      userId,
      provider: AuthProviderType.KAKAO,
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      birthdate: toDateOnly(user.birthdate),
      gender: user.gender,
      provider: isKakao ? 'KAKAO' : 'EMAIL',
      createdAt: user.createdAt.toISOString(),
      termsAgreements: user.termsAgreements
        .filter((a) => a.agreed)
        .map((a) => ({ termsId: a.termsId, version: a.terms.version })),
    };
  }

  /**
   * 명세 4-9 / 5.6.2. 서버 데이터를 지우면 refresh_tokens, terms_agreements 등은
   * FK CASCADE 로 함께 지워진다. 기기 안 데이터는 앱이 204 를 받은 뒤 직접 지운다.
   */
  async deleteAccount(userId: string, password?: string): Promise<void> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.UNAUTHORIZED, '인증이 필요합니다.', 401);

    if (user.passwordHash) {
      if (!password) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다.', 400, [
          { field: 'password', reason: 'required' },
        ]);
      }
      if (!(await bcrypt.compare(password, user.passwordHash))) {
        throw new AppException(
          ErrorCode.INVALID_CREDENTIALS,
          '아이디 또는 비밀번호가 올바르지 않습니다.',
          401,
        );
      }
    }

    await this.users.delete({ id: userId });
  }

  /** 내 정보 수정·비밀번호 변경 화면에 들어가기 전 비밀번호 확인 (#62). 카카오 계정은 비밀번호가 없다. */
  async verifyPassword(userId: string, password: string): Promise<void> {
    const user = await this.findUser(userId);
    if (!user.passwordHash) throw noPassword('password');
    await this.passwords.assertPassword(user, password);
  }

  /** 내 정보 수정 (#62). 보낸 항목만 고치고, 고친 뒤의 GET /users/me 를 돌려준다. */
  async updateMe(userId: string, dto: UpdateMeDto) {
    const changes: Partial<Pick<User, 'email' | 'birthdate' | 'gender'>> = {};
    if (dto.email !== undefined) changes.email = dto.email;
    if (dto.birthdate !== undefined) {
      if (!isValidBirthdate(dto.birthdate)) throw invalidField('birthdate', 'invalid');
      changes.birthdate = dto.birthdate;
    }
    if (dto.gender !== undefined) changes.gender = dto.gender;

    const user = await this.findUser(userId);
    // 화면 흐름의 확인(verify)과 별개로, 실제로 고칠 때도 서버에서 한 번 더 확인한다
    if (user.passwordHash) {
      if (!dto.password) throw invalidField('password', 'required');
      await this.passwords.assertPassword(user, dto.password);
    }

    // 바꿀 항목이 없으면(수정 화면에서 아무것도 안 바꾸고 저장) 오류 없이 지금 정보를 그대로 돌려준다
    if (Object.keys(changes).length > 0) await this.users.update({ id: userId }, changes);
    return this.getMe(userId);
  }

  /**
   * 비밀번호 변경 (#62). 지금 기기의 세션은 남기고 다른 기기의 세션은 모두 끊는다.
   * 비밀번호 찾기의 재설정처럼 실패 횟수와 잠금 기록도 지운다.
   */
  async changePassword(userId: string, sessionId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUser(userId);
    if (!user.passwordHash) throw noPassword('currentPassword');
    await this.passwords.assertPassword(user, dto.currentPassword);
    if (await this.passwords.matches(user, dto.newPassword)) {
      throw invalidField('newPassword', 'same_as_current');
    }

    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(User)
        .update({ id: userId }, { passwordHash, failedLoginCount: 0, lockedUntil: null });
      await manager
        .getRepository(RefreshToken)
        .update(
          { userId, sessionId: Not(sessionId), revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
    });
  }

  private async findUser(userId: string): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.UNAUTHORIZED, '인증이 필요합니다.', 401);
    return user;
  }

  /** 명세 4-10 (선택): 약관 재동의. 필수 약관 철회는 막는다. */
  async updateAgreements(userId: string, items: TermsAgreementDto[]): Promise<void> {
    await this.terms.assertNotRevokingRequired(items);
    await this.terms.saveAgreements(this.dataSource.manager, userId, items);
  }
}

function invalidField(field: string, reason: string): AppException {
  return new AppException(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다.', 400, [
    { field, reason },
  ]);
}

/** 카카오 계정처럼 비밀번호가 없는 계정은 비밀번호를 확인하거나 바꿀 수 없다. */
function noPassword(field: string): AppException {
  return invalidField(field, 'no_password');
}
