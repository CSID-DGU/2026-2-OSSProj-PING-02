const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * AI 호출 기본값 (#65: 답장이 9개로 늘어 출력이 약 3배).
 * - 출력 토큰: 답장 9개 × 최대 약 100자 + 요약 + JSON 키 ≈ 최대 1,200 토큰 → 1500
 * - 시간 제한: 앱이 35초까지 기다리므로 그보다 짧은 30초
 * - Claude 는 생각 토큰도 max_tokens 에 들어가서 더 넉넉하게 4096
 */
export const AI_DEFAULTS = {
  timeoutMs: 30_000,
  maxOutputTokens: 1500,
  anthropicMaxOutputTokens: 4096,
} as const;

export default () => {
  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET 은 32자 이상이어야 합니다. (.env 확인)');
  }

  return {
    port: toInt(process.env.PORT, 5010),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    db: {
      host: process.env.DB_HOST ?? 'localhost',
      port: toInt(process.env.DB_PORT, 5432),
      username: process.env.DB_USERNAME ?? 'malssiat',
      password: process.env.DB_PASSWORD ?? 'malssiat',
      name: process.env.DB_NAME ?? 'malssiat',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    },
    jwt: {
      secret: jwtSecret,
      accessTtlSeconds: toInt(process.env.ACCESS_TOKEN_TTL_SECONDS, 1800),
      refreshTtlDays: toInt(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
    },
    mail: {
      host: process.env.MAIL_HOST ?? '',
      port: toInt(process.env.MAIL_PORT, 587),
      secure: process.env.MAIL_SECURE === 'true',
      user: process.env.MAIL_USER ?? '',
      pass: process.env.MAIL_PASS ?? '',
      from: process.env.MAIL_FROM ?? 'no-reply@example.com',
    },
    // AI 답장 통로(OpenRouter). 키나 모델이 비어 있으면 서버는 뜨고 AI 요청만 503 으로 응답한다.
    ai: {
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      model: process.env.AI_MODEL ?? '',
      timeoutMs: toInt(process.env.AI_TIMEOUT_MS, AI_DEFAULTS.timeoutMs),
      maxOutputTokens: toInt(process.env.AI_MAX_OUTPUT_TOKENS, AI_DEFAULTS.maxOutputTokens),
      maxInputChars: toInt(process.env.AI_MAX_INPUT_CHARS, 1000),
      perMinute: toInt(process.env.AI_RATE_PER_MINUTE, 10),
      perDay: toInt(process.env.AI_RATE_PER_DAY, 300),
      // 어느 통로를 쓸지. 비어 있으면 주 통로(openrouter). anthropic 은 보조(테스트용) 통로.
      provider: process.env.AI_PROVIDER ?? '',
      // 보조(테스트용) 통로: Claude API. AI_PROVIDER=anthropic 일 때만 쓴다. 키나 모델이 비어 있으면 AI 요청만 503.
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        baseUrl: process.env.ANTHROPIC_BASE_URL ?? '',
        model: process.env.ANTHROPIC_MODEL ?? '',
        maxOutputTokens: toInt(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS, AI_DEFAULTS.anthropicMaxOutputTokens),
        effort: process.env.ANTHROPIC_EFFORT ?? 'low',
      },
    },
    model: {
      cdnBaseUrl: process.env.MODEL_CDN_BASE_URL ?? 'https://cdn.example.com/models',
      urlTtlMinutes: toInt(process.env.MODEL_URL_TTL_MINUTES, 15),
    },
  };
};
