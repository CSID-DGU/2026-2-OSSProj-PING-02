// AI e2e 테스트용 환경변수. AppModule 을 불러오기 전에 설정해야 하므로 테스트 파일의 첫 import 로 쓴다.
// 실제 OpenRouter 대신 테스트가 띄우는 가짜 서버로 보낸다.
export const FAKE_AI_PORT = 47391;

process.env.OPENROUTER_API_KEY = 'sk-test-only';
process.env.AI_MODEL = 'test/zdr-model';
process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${FAKE_AI_PORT}/api/v1`;
process.env.AI_TIMEOUT_MS = '400';
process.env.AI_MAX_INPUT_CHARS = '1000';
process.env.AI_RATE_PER_MINUTE = '10';
process.env.AI_RATE_PER_DAY = '300';
