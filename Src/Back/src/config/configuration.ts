const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

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
    kakao: {
      apiBaseUrl: process.env.KAKAO_API_BASE_URL ?? 'https://kapi.kakao.com',
    },
    model: {
      cdnBaseUrl: process.env.MODEL_CDN_BASE_URL ?? 'https://cdn.example.com/models',
      urlTtlMinutes: toInt(process.env.MODEL_URL_TTL_MINUTES, 15),
    },
  };
};
