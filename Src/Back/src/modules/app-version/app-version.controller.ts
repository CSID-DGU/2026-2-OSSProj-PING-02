import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PlatformVersionQueryDto } from '../../common/dto/platform-version-query.dto';
import { AppVersionService } from './app-version.service';

@ApiTags('app')
@Controller('app')
export class AppVersionController {
  constructor(private readonly appVersion: AppVersionService) {}

  /** 명세 4-12. 인증 불필요. */
  @Public()
  @Get('version')
  check(@Query() query: PlatformVersionQueryDto) {
    return this.appVersion.check(query.platform, query.appVersion);
  }
}
