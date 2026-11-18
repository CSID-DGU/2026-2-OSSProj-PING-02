import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiRateLimiter } from './ai-rate-limiter';
import { AiService } from './ai.service';
import { OpenRouterClient } from './openrouter.client';

// AI 답장 통로. DB 엔티티를 쓰지 않는다(아무것도 저장하지 않는다).
@Module({
  controllers: [AiController],
  providers: [AiService, AiRateLimiter, OpenRouterClient],
})
export class AiModule {}
