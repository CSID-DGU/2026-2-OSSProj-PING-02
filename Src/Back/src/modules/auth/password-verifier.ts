import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { User } from '../../database/entities/user.entity';

// 비밀번호를 연속으로 이만큼 틀리면 계정을 잠시 잠근다(IP 를 바꿔 가며 한 계정을 두드리는 공격 방지).
// 로그인과 로그인한 뒤의 비밀번호 확인(내 정보 수정, 비밀번호 변경)이 같은 횟수를 쓴다.
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MINUTES = 5;
export const BCRYPT_ROUNDS = 12;

/**
 * 비밀번호 비교와 연속 실패 잠금.
 * 로그인은 잠김 여부를 알려 주지 않고(AuthService), 로그인한 뒤의 확인은 잠기면 429 로 알려 준다(assertPassword).
 */
@Injectable()
export class PasswordVerifier {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  isLocked(user: Pick<User, 'lockedUntil'>): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }

  /**
   * 로그인한 사용자의 비밀번호를 다시 확인한다. 비밀번호가 있는 계정에서만 부른다.
   * 잠겨 있으면 429, 틀리면 실패 횟수를 올리고 401, 맞으면 실패 기록을 지운다.
   */
  async assertPassword(user: User, password: string): Promise<void> {
    if (this.isLocked(user)) {
      throw new AppException(
        ErrorCode.RATE_LIMITED,
        '비밀번호를 여러 번 틀렸습니다. 잠시 후 다시 시도해 주세요.',
        429,
      );
    }
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      await this.recordFailure(user.id);
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, '비밀번호가 올바르지 않습니다.', 401);
    }
    await this.clearFailures(user);
  }

  /** 비밀번호와 같은지 확인만 한다(실패 횟수에 더하지 않음). 새 비밀번호가 지금과 같은지 볼 때 쓴다. */
  matches(user: Pick<User, 'passwordHash'>, password: string): Promise<boolean> {
    return user.passwordHash ? bcrypt.compare(password, user.passwordHash) : Promise.resolve(false);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /** 실패 기록이 있으면 지운다. */
  async clearFailures(user: Pick<User, 'id' | 'failedLoginCount' | 'lockedUntil'>): Promise<void> {
    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.users.update({ id: user.id }, { failedLoginCount: 0, lockedUntil: null });
    }
  }

  /** 비밀번호 실패를 센다. 동시에 여러 요청이 와도 횟수가 어긋나지 않도록 DB 에서 더하고, 한도에 닿으면 잠근다. */
  async recordFailure(userId: string): Promise<void> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ failedLoginCount: () => '"failed_login_count" + 1' })
      .where('id = :id', { id: userId })
      .returning('failed_login_count')
      .execute();
    const count = Number(result.raw?.[0]?.failed_login_count ?? 0);
    if (count >= LOGIN_MAX_FAILURES) {
      await this.users.update(
        { id: userId },
        { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000) },
      );
    }
  }
}
