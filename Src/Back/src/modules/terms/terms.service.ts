import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { Terms } from '../../database/entities/terms.entity';
import { TermsAgreement } from '../../database/entities/terms-agreement.entity';
import { TermsAgreementDto } from './dto/terms-agreement.dto';

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Terms) private readonly terms: Repository<Terms>,
  ) {}

  findAll(): Promise<Terms[]> {
    return this.terms.find({ order: { type: 'ASC', effectiveAt: 'DESC' } });
  }

  /** 요청에 담긴 약관 id 가 전부 실제 약관인지 확인하고 id → 약관 맵을 돌려준다. */
  async ensureExisting(items: TermsAgreementDto[]): Promise<Map<string, Terms>> {
    const ids = [...new Set(items.map((i) => i.termsId))];
    const found = ids.length ? await this.terms.findBy({ id: In(ids) }) : [];
    if (found.length !== ids.length) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다.', 400, [
        { field: 'termsAgreements', reason: 'unknown_terms' },
      ]);
    }
    return new Map(found.map((t) => [t.id, t]));
  }

  /** 회원가입 / 카카오 신규 가입: 필수 약관 전부에 동의해야 한다 (명세 1.1.3). */
  async assertRequiredAgreed(items: TermsAgreementDto[]): Promise<void> {
    await this.ensureExisting(items);
    const required = await this.terms.findBy({ required: true });
    const agreed = new Set(items.filter((i) => i.agreed).map((i) => i.termsId));
    if (required.some((t) => !agreed.has(t.id))) {
      throw new AppException(
        ErrorCode.REQUIRED_TERMS_NOT_AGREED,
        '필수 약관에 동의해야 합니다.',
        422,
      );
    }
  }

  /** 약관 재동의(4-10): 필수 약관을 철회(agreed=false)하는 요청은 막는다. */
  async assertNotRevokingRequired(items: TermsAgreementDto[]): Promise<void> {
    const byId = await this.ensureExisting(items);
    const revokesRequired = items.some((i) => !i.agreed && byId.get(i.termsId)?.required);
    if (revokesRequired) {
      throw new AppException(
        ErrorCode.REQUIRED_TERMS_NOT_AGREED,
        '필수 약관은 철회할 수 없습니다.',
        422,
      );
    }
  }

  /** 같은 (user, terms) 는 덮어쓴다. ERD 의 unique(user_id, terms_id) 와 맞춘다. */
  async saveAgreements(
    manager: EntityManager,
    userId: string,
    items: TermsAgreementDto[],
  ): Promise<void> {
    if (items.length === 0) return;
    const latest = new Map(items.map((i) => [i.termsId, i]));
    const now = new Date();
    await manager.getRepository(TermsAgreement).upsert(
      [...latest.values()].map((i) => ({
        userId,
        termsId: i.termsId,
        agreed: i.agreed,
        agreedAt: now,
      })),
      { conflictPaths: ['userId', 'termsId'] },
    );
  }
}
