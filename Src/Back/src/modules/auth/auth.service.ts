import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { addDays, isValidBirthdate } from '../../common/utils/date.util';
import { isUniqueViolation } from '../../common/utils/db.util';
import { randomToken, sha256Hex } from '../../common/utils/crypto.util';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { User } from '../../database/entities/user.entity';
import { TermsService } from '../terms/terms.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
// 비밀번호를 연속으로 이만큼 틀리면 계정을 잠시 잠근다(IP 를 바꿔 가며 한 계정을 두드리는 공격 방지).
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 5;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSummary {
  id: string;
  username: string;
  name: string;
}

export interface AuthResult {
  user: UserSummary;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  // 존재하지 않는 아이디로 로그인해도 bcrypt 비교 시간이 같도록 쓰는 더미 해시
  private readonly dummyHash = bcrypt.hashSync('timing-equalizer', BCRYPT_ROUNDS);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly terms: TermsService,
  ) {}

  // ── 아이디 중복 확인 ─────────────────────────────────────
  async checkUsername(username: string): Promise<{ available: boolean }> {
    const exists = await this.users.existsBy({ username });
    return { available: !exists };
  }

  // ── 회원가입 (1.1.1 ~ 1.1.3): 가입하면 바로 로그인 세션을 발급한다 ──
  async signup(dto: SignupDto): Promise<AuthResult> {
    this.assertBirthdate(dto.birthdate);
    await this.terms.assertRequiredAgreed(dto.termsAgreements);
    await this.assertUsernameFree(dto.username);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.getRepository(User).save(
          manager.getRepository(User).create({
            username: dto.username,
            passwordHash,
            name: dto.name,
            birthdate: dto.birthdate,
            gender: dto.gender,
          }),
        );
        await this.terms.saveAgreements(manager, user.id, dto.termsAgreements);
        const { tokens } = await this.issueTokens(manager, user.id, null);
        return { user: toUserSummary(user), tokens };
      });
    } catch (error) {
      // 같은 아이디로 동시에 가입하면 unique 제약에서 걸린다
      if (isUniqueViolation(error)) throw usernameExists();
      throw error;
    }
  }

  // ── 로그인 (1.2.1, 1.2.2): 아이디 + 비밀번호 ───────────────
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findOne({ where: { username: dto.username } });

    const matched = await bcrypt.compare(dto.password, user?.passwordHash ?? this.dummyHash);
    const locked = !!user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
    if (!user || !user.passwordHash || !matched || locked) {
      // 잠긴 계정은 비밀번호가 맞아도 같은 응답이다. 잠겨 있는 동안의 시도는 횟수에 더하지 않는다.
      if (user?.passwordHash && !locked) await this.recordLoginFailure(user.id);
      // 아이디 없음, 비밀번호 틀림, 잠김을 구분하지 않는다 (명세 4-4)
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        '아이디 또는 비밀번호가 올바르지 않습니다.',
        401,
      );
    }
    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.users.update({ id: user.id }, { failedLoginCount: 0, lockedUntil: null });
    }

    const { tokens } = await this.issueTokens(this.dataSource.manager, user.id, dto.deviceId ?? null);
    return { user: toUserSummary(user), tokens };
  }

  // ── 토큰 갱신 (1.2.4, 명세 3-1 회전 + 재사용 감지) ─────────
  async refresh(refreshToken: string): Promise<TokenPair> {
    const row = await this.refreshTokens.findOne({
      where: { tokenHash: sha256Hex(refreshToken) },
    });
    if (!row) throw refreshInvalid();

    // 이미 교체된 토큰이 다시 왔다 → 탈취로 보고 해당 기기 세션을 모두 폐기
    if (row.replacedBy) {
      await this.revokeSessions(row.userId, row.deviceId);
      throw refreshInvalid();
    }
    if (row.revokedAt || row.expiresAt.getTime() <= Date.now()) throw refreshInvalid();

    return this.dataSource.transaction(async (manager) => {
      // 같은 세션 안에서 회전한다. 세션 식별자가 유지되므로 accessToken 은 계속 유효하다.
      const { row: next, tokens } = await this.issueTokens(
        manager,
        row.userId,
        row.deviceId,
        row.sessionId,
      );
      // 조건부 갱신: 동시에 두 요청이 같은 토큰을 쓰면 한쪽만 성공한다
      const result = await manager.getRepository(RefreshToken).update(
        { id: row.id, revokedAt: IsNull(), replacedBy: IsNull() },
        { revokedAt: new Date(), replacedBy: next.id },
      );
      if (!result.affected) throw refreshInvalid();
      return tokens;
    });
  }

  // ── 로그아웃 (5.6.1) ────────────────────────────────────
  /** 세션 전체를 폐기한다. 그 세션의 accessToken 도 바로 무효가 된다. */
  async logout(userId: string, refreshToken: string): Promise<void> {
    const row = await this.refreshTokens.findOne({
      where: { userId, tokenHash: sha256Hex(refreshToken) },
    });
    if (!row) return;
    await this.refreshTokens.update(
      { userId, sessionId: row.sessionId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // ── 내부 헬퍼 ───────────────────────────────────────────
  /**
   * refresh 행을 만들고 accessToken 과 함께 돌려준다.
   * sessionId 를 넘기면 같은 세션에 이어 붙인다(회전). 없으면 새 세션을 시작한다(로그인).
   */
  private async issueTokens(
    manager: EntityManager,
    userId: string,
    deviceId: string | null,
    sessionId: string = randomUUID(),
  ): Promise<{ row: RefreshToken; tokens: TokenPair }> {
    const repo = manager.getRepository(RefreshToken);
    const raw = randomToken();
    const now = new Date();
    const ttlDays = this.config.get<number>('jwt.refreshTtlDays') ?? 30;

    const row = await repo.save(
      repo.create({
        userId,
        deviceId,
        sessionId,
        tokenHash: sha256Hex(raw),
        issuedAt: now,
        expiresAt: addDays(now, ttlDays),
      }),
    );

    // sid: 이 세션이 살아 있는지 가드가 매 요청 확인한다 (로그아웃 즉시 무효화)
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: sessionId });
    return {
      row,
      tokens: {
        accessToken,
        refreshToken: raw,
        expiresIn: this.config.get<number>('jwt.accessTtlSeconds') ?? 1800,
      },
    };
  }

  /** 기기 단위로 세션 폐기. deviceId 가 없으면 그 사용자의 모든 세션을 폐기한다. */
  private async revokeSessions(userId: string, deviceId: string | null): Promise<void> {
    await this.refreshTokens.update(
      deviceId ? { userId, deviceId, revokedAt: IsNull() } : { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** 비밀번호 실패를 센다. 동시에 여러 요청이 와도 횟수가 어긋나지 않도록 DB 에서 더하고, 한도에 닿으면 잠근다. */
  private async recordLoginFailure(userId: string): Promise<void> {
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

  private assertBirthdate(value: string): void {
    if (!isValidBirthdate(value)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다.', 400, [
        { field: 'birthdate', reason: 'invalid' },
      ]);
    }
  }

  private async assertUsernameFree(username: string): Promise<void> {
    if (await this.users.existsBy({ username })) throw usernameExists();
  }
}

// ── 모듈 밖에서도 쓰는 순수 함수 ─────────────────────────────
export function toUserSummary(user: Pick<User, 'id' | 'username' | 'name'>): UserSummary {
  return { id: user.id, username: user.username, name: user.name };
}

function usernameExists(): AppException {
  return new AppException(ErrorCode.USERNAME_ALREADY_EXISTS, '이미 사용 중인 아이디입니다.', 409, [
    { field: 'username', reason: 'duplicated' },
  ]);
}

function refreshInvalid(): AppException {
  return new AppException(
    ErrorCode.REFRESH_TOKEN_INVALID,
    '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    401,
  );
}
