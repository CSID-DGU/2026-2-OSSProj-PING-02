import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlatformVersionQueryDto } from '../../common/dto/platform-version-query.dto';
import { ModelsService } from './models.service';

@ApiTags('models')
@ApiBearerAuth()
@Controller('models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  /** 명세 4-11. 진행률 표시는 앱이 받은 바이트와 sizeBytes 로 계산한다. */
  @Get('latest')
  getLatest(@CurrentUser() user: AuthUser, @Query() query: PlatformVersionQueryDto) {
    return this.models.getLatest(user.id, query.appVersion);
  }
}
