import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { compareVersions } from '../../common/utils/version.util';
import { AppVersion } from '../../database/entities/app-version.entity';

@Injectable()
export class AppVersionService {
  constructor(@InjectRepository(AppVersion) private readonly versions: Repository<AppVersion>) {}

  /** 명세 4-12. 현재 앱 버전이 최소 지원 버전보다 낮으면 forceUpdate 가 true 다. */
  async check(platform: string, appVersion: string) {
    const row = await this.versions.findOneBy({ platform });
    if (!row) {
      throw new AppException(ErrorCode.NOT_FOUND, '앱 버전 정보가 없습니다.', 404);
    }
    return {
      latestVersion: row.latestVersion,
      minSupportedVersion: row.minSupportedVersion,
      forceUpdate: compareVersions(appVersion, row.minSupportedVersion) < 0,
      storeUrl: row.storeUrl,
    };
  }
}
