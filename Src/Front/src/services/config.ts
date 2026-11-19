// 환경 설정: 서버 주소, mock/실제 API 전환, 인증 기능 켜고 끄기를 여기 한 곳에서 바꿈
// (화면·서비스 코드는 이 값만 읽음)

export type ApiMode = "mock" | "http";

// ▼ 개발 빌드에서 실서버로 확인할 때 이 줄만 "http"로 바꾸고 앱을 다시 불러옴 (Metro에서 r)
//   커밋할 때는 "mock"으로 되돌림 (테스트는 mock 기준)
const DEV_API_MODE: ApiMode = "mock";

// 실서버 (Azure, https)
export const SERVER_BASE_URL =
  "https://malssiat-api.koreacentral.cloudapp.azure.com/v1";

export const API_CONFIG: { mode: ApiMode; baseUrl: string; timeoutMs: number } =
  {
    // "mock": 서버 없이 메모리 mock으로 동작 (기본, 테스트도 mock 기준)
    // "http": baseUrl의 백엔드로 실제 요청
    mode: DEV_API_MODE,
    // 백엔드 PC에 띄운 개발 서버로 붙을 때만 바꿈 (Doc/API_목록.md 1. 접속 정보)
    // - 실기기: 같은 Wi-Fi의 백엔드 PC IP (예: http://192.168.0.10:5010/v1)
    // - 에뮬레이터: http://10.0.2.2:5010/v1 (10.0.2.2가 PC의 localhost)
    // - http 주소는 디버그 빌드만 허용 (릴리스는 https만)
    baseUrl: SERVER_BASE_URL,
    timeoutMs: 10_000,
  };

// 인증 기능 켜고 끄기 (기준: 백엔드 main의 Doc/API_목록.md)
// - 회원가입 이메일은 백엔드가 필수로 받음 (인증하지 않고 아이디·비밀번호 찾기에만 씀) → 설정 없이 항상 받음
// - emailVerification: 가입할 때 메일 코드 확인 (EmailVerify 화면)
//   백엔드에 없음(가입하면 바로 토큰) → false. 화면·코드는 지우지 않고 숨김
//   다시 생기면 경로 확인 후 true (httpAuthService의 verifyEmail·resendVerification)
// - accountRecovery: 아이디 찾기(메일로 아이디) · 비밀번호 찾기(메일 코드 → 새 비밀번호)
//   백엔드 main에 다시 생겨서 true. false면 로그인 화면에 "준비 중" 안내만
// 테스트에서 두 경우를 모두 확인하려고 객체로 둠 (읽는 쪽은 호출 시점에 값을 봄)
export const AUTH_FEATURES = {
  emailVerification: false,
  accountRecovery: true,
};
