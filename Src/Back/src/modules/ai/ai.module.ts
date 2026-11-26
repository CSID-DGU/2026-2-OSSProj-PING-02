import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_COMPLETION_CLIENT, selectCompletionClient } from './ai-completion.client';
import { AiController } from './ai.controller';
import { AiRateLimiter } from './ai-rate-limiter';
import { AiService } from './ai.service';
import { AnthropicClient } from './anthropic.client';
import { OpenRouterClient } from './openrouter.client';

// AI 답장 통로. DB 엔티티를 쓰지 않는다(아무것도 저장하지 않는다).
// 주 통로는 OpenRouter, AI_PROVIDER=anthropic 이면 보조(테스트용) Claude API 를 쓴다.
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiRateLimiter,
    OpenRouterClient,
    AnthropicClient,
    {
      provide: AI_COMPLETION_CLIENT,
      inject: [ConfigService, OpenRouterClient, AnthropicClient],
      useFactory: (config: ConfigService, openrouter: OpenRouterClient, anthropic: AnthropicClient) =>
        selectCompletionClient(config.get<string>('ai.provider'), { openrouter, anthropic }),
    },
  ],
})
export class AiModule {}
