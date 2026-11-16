import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager, IsNull, QueryFailedError, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { addDays, isValidBirthdate } from '../../common/utils/date.util';
import { isUniqueViolation } from '../../common/utils/db.util';
import { randomToken, sha256Hex } from '../../common/utils/crypto.util';
import {
  EmailVerification,
  VerificationPurpose,
} from '../../database/entities/email-verification.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { User } from '../../database/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { TermsService } from '../terms/terms.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
  VerifyEmailDto,
} from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
const CODE_TTL_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
// 같은 계정에 비밀번호 재설정 메일을 이 시간 안에 다시 보내지 않는다(메일 폭탄 방지).
const RESET_COOLDOWN_SECONDS = 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSummary {
  id: string;
  username: string;
  name: string;
  email: string | null;
}

export interface AuthResult {
  user: UserSummary;
  tokens: TokenPair;
}

export interface SignupResult {
  user: UserSummary;
  verificationRequired: true;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  // 존재하지 않는 아이디로 로그인해도 bcrypt 비교 시간이 같도록 쓰는 더미 해시
  private readonly dummyHash = bcrypt.hashSync('timing-equalizer', BCRYPT_ROUNDS);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly terms: TermsService,
    private readonly mail: MailService,
  ) {}

  // ── 이메일 중복 확인 (1.1.4) ─────────────────────────────
  async checkEmail(email: string): Promise<{ available: boolean }> {
    const exists = await this.users.existsBy({ email });
    return { available: !exists };
  }

  // ── 아이디 중복 확인 ─────────────────────────────────────
  async checkUsername(username: string): Promise<{ available: boolean }> {
    const exists = await this.users.existsBy({ username });
    return { available: !exists };
  }

  // ── 회원가입 (1.1.1 ~ 1.1.3) + 이메일 인증 코드 발송 ──────
  async signup(dto: SignupDto): Promise<SignupResult> {
    this.assertBirthdate(dto.birthdate);
    await this.terms.assertRequiredAgreed(dto.termsAgreements);
    await this.assertEmailFree(dto.email);
    await this.assertUsernameFree(dto.username);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.getRepository(User).save(
          manager.getRepository(User).create({
            username: dto.username,
            email: dto.email,
            passwordHash,
            name: dto.name,
            birthdate: dto.birthdate,
            gender: dto.gender,
            emailVerifiedAt: null,
          }),
        );
        await this.terms.saveAgreements(manager, user.id, dto.termsAgreements);
        // 메일 발송에 실패하면 가입 전체를 취소한다 (트랜잭션 롤백)
        const code = await this.createCode(manager, user.id, 'EMAIL_VERIFY');
        await this.mail.sendVerificationCode(dto.email, code);
        return { user: toUserSummary(user), verificationRequired: true as const };
      });
    } catch (error) {
      // 같은 이메일·아이디로 동시에 가입하면 unique 제약에서 걸린다
      if (isUniqueViolation(error)) throw uniqueConflict(error);
      throw error;
    }
  }

  // ── 이메일 인증 코드 확인 → 로그인 세션 발급 ───────────────
  async verifyEmail(dto: VerifyEmailDto): Promise<AuthResult> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user || !user.passwordHash || user.emailVerifiedAt) throw codeInvalid();

    const code = await this.assertCode(user.id, 'EMAIL_VERIFY', dto.code);

    return this.dataSource.transaction(async (manager) => {
      // 같은 코드를 동시에 두 번 쓰면 한쪽만 통과한다
      const used = await manager.getRepository(EmailVerification).delete({ id: code.id });
      if (!used.affected) throw codeInvalid();
      await manager.getRepository(User).update({ id: user.id }, { emailVerifiedAt: new Date() });
      const { tokens } = await this.issueTokens(manager, user.id, null);
      return { user: toUserSummary(user), tokens };
    });
  }

  /** 인증 코드 재발송. 계정 존재 여부와 관계없이 호출자에게는 항상 같은 결과(204)를 준다. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.passwordHash || user.emailVerifiedAt) return;

    try {
      await this.dataSource.transaction(async (manager) => {
        const code = await this.createCode(manager, user.id, 'EMAIL_VERIFY');
        await this.mail.sendVerificationCode(email, code);
      });
    } catch {
      this.logger.warn('인증 코드 재발송 실패 (응답은 동일하게 204)');
    }
  }

  // ── 로그인 (1.2.1, 1.2.2): 아이디 + 비밀번호 ───────────────
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findOne({ where: { username: dto.username } });

    const matched = await bcrypt.compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !user.passwordHash || !matched) {
      // 아이디 없음과 비밀번호 틀림을 구분하지 않는다 (명세 4-4)
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        '아이디 또는 비밀번호가 올바르지 않습니다.',
        401,
      );
    }
    // 비밀번호가 맞은 뒤에만 인증 여부를 알려 준다 (계정 존재 여부는 가리지 않음)
    if (!user.emailVerifiedAt) {
      throw new AppException(
        ErrorCode.EMAIL_NOT_VERIFIED,
        '이메일 인증이 필요합니다. 메일로 받은 인증 코드를 입력해 주세요.',
        403,
      );
    }

    const { tokens } = await this.issueTokens(this.dataSource.manager, user.id, dto.deviceId ?? null);
    return { user: toUserSummary(user), tokens };
  }

  // ── 아이디 찾기 ─────────────────────────────────────────
  /**
   * 가입한 이메일로 아이디를 보낸다. 아이디는 응답에 담지 않고 메일로만 알려 준다.
   * 이메일이 가입된 것인지와 관계없이 호출자에게는 항상 같은 결과(204)를 준다.
   * 메일 발송은 기다리지 않는다(응답 시간으로 가입 여부를 알아내지 못하게).
   */
  async findUsername(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.passwordHash || !user.emailVerifiedAt) return;
    this.sendInBackground(() => this.mail.sendUsername(email, user.username));
  }

  // ── 비밀번호 찾기 1단계: 재설정 코드 발송 ───────────────────
  /** 아이디와 가입 이메일이 맞을 때만 코드를 보낸다. 맞는지와 관계없이 항상 204 로 응답한다. */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.users.findOne({ where: { username: dto.username } });
    if (!user || !user.passwordHash || !user.emailVerifiedAt || user.email !== dto.email) return;

    const latest = await this.dataSource
      .getRepository(EmailVerification)
      .findOne({ where: { userId: user.id, purpose: 'PASSWORD_RESET' }, order: { createdAt: 'DESC' } });
    if (latest && Date.now() - latest.createdAt.getTime() < RESET_COOLDOWN_SECONDS * 1000) return;

    const code = await this.createCode(this.dataSource.manager, user.id, 'PASSWORD_RESET');
    this.sendInBackground(() => this.mail.sendPasswordResetCode(dto.email, code));
  }

  // ── 비밀번호 찾기 2단계: 코드 확인 후 새 비밀번호 설정 ───────
  /** 성공하면 이 계정의 모든 세션을 끊는다. 다시 로그인해야 한다. */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.users.findOne({ where: { username: dto.username } });
    // 없는 아이디도 코드가 틀린 것과 같은 에러로 응답한다
    if (!user || !user.passwordHash || !user.emailVerifiedAt) throw codeInvalid();

    const code = await this.assertCode(user.id, 'PASSWORD_RESET', dto.code);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.dataSource.transaction(async (manager) => {
      const used = await manager.getRepository(EmailVerification).delete({ id: code.id });
      if (!used.affected) throw codeInvalid();
      await manager.getRepository(User).update({ id: user.id }, { passwordHash });
      await manager
        .getRepository(RefreshToken)
        .update({ userId: user.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    });
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

  /** 6자리 코드를 만들어 해시만 저장하고, 원문 코드를 돌려준다(메일 발송용). 같은 용도의 이전 코드는 지운다. */
  private async createCode(
    manager: EntityManager,
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<string> {
    const repo = manager.getRepository(EmailVerification);
    await repo.delete({ userId, purpose });
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await repo.save(
      repo.create({
        userId,
        purpose,
        codeHash: this.hashCode(userId, code, purpose),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
        attempts: 0,
      }),
    );
    return code;
  }

  /**
   * 가장 최근 코드와 입력값을 비교한다. 만료, 시도 횟수 초과, 불일치는 모두 같은 에러다.
   * 틀리면 시도 횟수를 올려서 무차별 대입을 막는다. 맞으면 그 코드 행을 돌려준다.
   */
  private async assertCode(
    userId: string,
    purpose: VerificationPurpose,
    given: string,
  ): Promise<EmailVerification> {
    const repo = this.dataSource.getRepository(EmailVerification);
    const latest = await repo.findOne({ where: { userId, purpose }, order: { createdAt: 'DESC' } });
    if (!latest || latest.expiresAt.getTime() <= Date.now() || latest.attempts >= CODE_MAX_ATTEMPTS) {
      throw codeInvalid();
    }

    const expected = Buffer.from(latest.codeHash, 'hex');
    const actual = Buffer.from(this.hashCode(userId, given, purpose), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await repo.increment({ id: latest.id }, 'attempts', 1);
      throw codeInvalid();
    }
    return latest;
  }

  /**
   * 코드는 서버 비밀값을 키로 한 HMAC 으로 저장한다. 6자리라 단순 해시로는 쉽게 뒤집힌다.
   * 용도를 해시에 포함해서 가입 인증 코드로 비밀번호를 바꾸는 식의 오용을 막는다.
   */
  private hashCode(userId: string, code: string, purpose: VerificationPurpose): string {
    const key = this.config.get<string>('jwt.secret') ?? '';
    const tag = purpose === 'EMAIL_VERIFY' ? 'email-verify' : 'password-reset';
    return createHmac('sha256', key).update(`${tag}:${userId}:${code}`).digest('hex');
  }

  /** 응답을 기다리지 않고 메일을 보낸다. 실패해도 호출자 응답은 같다(내용은 로그에 남기지 않는다). */
  private sendInBackground(send: () => Promise<void>): void {
    void send().catch(() => this.logger.warn('메일 발송 실패 (응답은 동일하게 204)'));
  }

  private assertBirthdate(value: string): void {
    if (!isValidBirthdate(value)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다.', 400, [
        { field: 'birthdate', reason: 'invalid' },
      ]);
    }
  }

  private async assertEmailFree(email: string): Promise<void> {
    if (await this.users.existsBy({ email })) throw emailExists();
  }

  private async assertUsernameFree(username: string): Promise<void> {
    if (await this.users.existsBy({ username })) throw usernameExists();
  }
}

// ── 모듈 밖에서도 쓰는 순수 함수 ─────────────────────────────
export function toUserSummary(user: Pick<User, 'id' | 'username' | 'name' | 'email'>): UserSummary {
  return { id: user.id, username: user.username, name: user.name, email: user.email };
}

function emailExists(): AppException {
  return new AppException(ErrorCode.EMAIL_ALREADY_EXISTS, '이미 가입된 이메일입니다.', 409, [
    { field: 'email', reason: 'duplicated' },
  ]);
}

function usernameExists(): AppException {
  return new AppException(ErrorCode.USERNAME_ALREADY_EXISTS, '이미 사용 중인 아이디입니다.', 409, [
    { field: 'username', reason: 'duplicated' },
  ]);
}

/** unique 위반이 아이디 쪽인지 이메일 쪽인지 가려서 맞는 에러로 바꾼다. */
function uniqueConflict(error: unknown): AppException {
  const detail =
    error instanceof QueryFailedError
      ? String((error.driverError as { detail?: string } | undefined)?.detail ?? '')
      : '';
  return detail.includes('(username)') ? usernameExists() : emailExists();
}

function codeInvalid(): AppException {
  return new AppException(
    ErrorCode.VERIFICATION_CODE_INVALID,
    '인증 코드가 올바르지 않거나 만료되었습니다. 코드를 다시 받아 주세요.',
    400,
  );
}

function refreshInvalid(): AppException {
  return new AppException(
    ErrorCode.REFRESH_TOKEN_INVALID,
    '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    401,
  );
}
