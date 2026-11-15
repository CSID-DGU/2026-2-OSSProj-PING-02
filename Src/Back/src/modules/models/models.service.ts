import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelStatus, ModelType } from '../../common/enums';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { compareVersions } from '../../common/utils/version.util';
import { sha256Hex } from '../../common/utils/crypto.util';
import { ModelRelease } from '../../database/entities/model-release.entity';
import { ModelStorageService } from './model-storage.service';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(ModelRelease) private readonly models: Repository<ModelRelease>,
    private readonly storage: ModelStorageService,
  ) {}

  /**
   * 명세 4-11. 활성 베이스 모델 1개 + 호환되는 어댑터 목록.
   * MVP 에서는 어댑터가 비어 있다 (adapters: []).
   */
  async getLatest(userId: string, appVersion: string) {
    const base = await this.models.findOne({
      where: { type: ModelType.BASE, status: ModelStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    if (!base || !this.isInRollout(userId, base)) {
      throw new AppException(ErrorCode.MODEL_NOT_FOUND, '받을 수 있는 모델이 없습니다.', 404);
    }
    if (compareVersions(appVersion, base.minAppVersion) < 0) {
      throw new AppException(
        ErrorCode.APP_UPDATE_REQUIRED,
        '앱을 업데이트해야 모델을 받을 수 있습니다.',
        426,
      );
    }

    // 어댑터는 같은 베이스 해시를 가진 것만 붙는다 (명세 4-11, ERD 8. 확인 필요 항목)
    const adapters = await this.models.find({
      where: {
        type: ModelType.ADAPTER,
        status: ModelStatus.ACTIVE,
        baseModelSha256: base.sha256,
      },
      order: { createdAt: 'DESC' },
    });
    const usable = adapters.filter((a) => compareVersions(appVersion, a.minAppVersion) >= 0);

    return {
      model: this.toDto(base),
      adapters: usable.map((a) => this.toDto(a)),
    };
  }

  /** 단계적 배포: userId + modelId 해시로 버킷을 정해 rolloutPercent 안에 든 사용자에게만 준다. */
  private isInRollout(userId: string, model: ModelRelease): boolean {
    if (model.rolloutPercent >= 100) return true;
    const bucket = parseInt(sha256Hex(`${userId}:${model.id}`).slice(0, 8), 16) % 100;
    return bucket < model.rolloutPercent;
  }

  private toDto(model: ModelRelease) {
    const { url, expiresAt } = this.storage.createDownloadUrl(model.storageKey);
    return {
      id: model.id,
      type: model.type,
      task: model.task,
      version: model.version,
      filename: model.filename,
      quantization: model.quantization,
      sizeBytes: model.sizeBytes,
      sha256: model.sha256,
      baseModelSha256: model.baseModelSha256,
      minAppVersion: model.minAppVersion,
      downloadUrl: url,
      urlExpiresAt: expiresAt.toISOString(),
    };
  }
}
