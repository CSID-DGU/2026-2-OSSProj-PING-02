// e2e 테스트는 개발 DB(malssiat)를 건드리지 않도록 별도 DB(malssiat_test)를 쓴다.
// ConfigModule 은 이미 설정된 환경변수를 .env 로 덮어쓰지 않으므로 여기서 먼저 지정한다.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'malssiat_test';
// 기본은 synchronize 로 스키마를 맞춘다. 마이그레이션 경로를 검증할 때는
// TEST_DB_SYNCHRONIZE=false TEST_MIGRATIONS_RUN=true 로 실행한다.
process.env.DB_SYNCHRONIZE = process.env.TEST_DB_SYNCHRONIZE ?? 'true';
process.env.DB_MIGRATIONS_RUN = process.env.TEST_MIGRATIONS_RUN ?? 'false';
// 로컬 .env 에 진짜 AI 키가 있어도 e2e 가 외부 AI 를 부르지 않게 한다 (비용·데이터 유출 방지).
// 기본은 주 통로(openrouter)이고, Claude 통로 e2e 는 support/anthropic-env.ts 가 가짜 서버로 덮어쓴다.
process.env.AI_PROVIDER = 'openrouter';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-only-not-real';
process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:9';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-chars';
}
