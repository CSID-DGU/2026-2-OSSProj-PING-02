import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiRateLimiter } from './ai-rate-limiter';
import { AiService } from './ai.service';
import { AiReplyDto } from './dto/ai-reply.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly limiter: AiRateLimiter,
  ) {}

  // 마스킹된 메시지로 요약 1줄과 답장 3개를 만든다. 로그인 필요(전역 가드). 서버는 아무것도 저장하지 않는다.
  @Post('reply')
  @HttpCode(200)
  reply(@CurrentUser() user: AuthUser, @Body() dto: AiReplyDto) {
    this.limiter.consume(user.id);
    return this.ai.reply(dto);
  }
}
