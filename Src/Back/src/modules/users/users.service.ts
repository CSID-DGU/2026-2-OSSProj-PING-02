import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { AuthProviderType } from '../../common/enums';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { toDateOnly } from '../../common/utils/date.util';
import { AuthProvider } from '../../database/entities/auth-provider.entity';
import { TermsAgreement } from '../../database/entities/terms-agreement.entity';
import { User } from '../../database/entities/user.entity';
import { TermsAgreementDto } from '../terms/dto/terms-agreement.dto';
import { TermsService } from '../terms/terms.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuthProvider) private readonly providers: Repository<AuthProvider>,
    @InjectRepository(TermsAgreement) private readonly agreements: Repository<TermsAgreement>,
    private readonly terms: TermsService,
    private readonly dataSource: DataSource,
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

  /** 명세 4-10 (선택): 약관 재동의. 필수 약관 철회는 막는다. */
  async updateAgreements(userId: string, items: TermsAgreementDto[]): Promise<void> {
    await this.terms.assertNotRevokingRequired(items);
    await this.terms.saveAgreements(this.dataSource.manager, userId, items);
  }
}
