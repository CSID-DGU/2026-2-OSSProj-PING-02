// e2e 테스트는 개발 DB(malssiat)를 건드리지 않도록 별도 DB(malssiat_test)를 쓴다.
// ConfigModule 은 이미 설정된 환경변수를 .env 로 덮어쓰지 않으므로 여기서 먼저 지정한다.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'malssiat_test';
// 기본은 synchronize 로 스키마를 맞춘다. 마이그레이션 경로를 검증할 때는
// TEST_DB_SYNCHRONIZE=false TEST_MIGRATIONS_RUN=true 로 실행한다.
process.env.DB_SYNCHRONIZE = process.env.TEST_DB_SYNCHRONIZE ?? 'true';
process.env.DB_MIGRATIONS_RUN = process.env.TEST_MIGRATIONS_RUN ?? 'false';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-chars';
}
