// Claude 통로(AI_PROVIDER=anthropic) e2e 테스트용 환경변수. AppModule 을 불러오기 전에 설정해야 하므로 테스트 파일의 첫 import 로 쓴다.
// 실제 Claude API 대신 테스트가 띄우는 가짜 서버로 보낸다 (setup-env.ts 의 기본값을 덮어쓴다).
export const FAKE_ANTHROPIC_PORT = 47392;

process.env.AI_PROVIDER = 'anthropic';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-only';
process.env.ANTHROPIC_MODEL = 'claude-test-model';
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${FAKE_ANTHROPIC_PORT}`;
process.env.AI_TIMEOUT_MS = '400';
process.env.AI_MAX_INPUT_CHARS = '1000';
process.env.AI_RATE_PER_MINUTE = '10';
process.env.AI_RATE_PER_DAY = '300';
