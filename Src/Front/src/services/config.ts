// 환경 설정: 서버 주소, mock/실제 API 전환, 인증 기능 켜고 끄기를 여기 한 곳에서 바꿈
// (화면·서비스 코드는 이 값만 읽음)

export type ApiMode = "mock" | "http";

export const API_CONFIG: { mode: ApiMode; baseUrl: string; timeoutMs: number } =
  {
    // "mock": 서버 없이 메모리 mock으로 동작 (테스트도 mock 기준)
    // "http": baseUrl의 백엔드로 실제 요청
    mode: "mock",
    // TODO(서버 주소): 개발 서버 주소가 정해지면 여기만 바꿈 (Doc/API_목록.md 1. 접속 정보)
    // - 실기기: 같은 Wi-Fi의 백엔드 PC IP (예: http://192.168.0.10:5010/v1)
    // - 에뮬레이터: 10.0.2.2가 PC의 localhost
    // - 디버그 빌드만 http 허용. 릴리스는 https(Caddy 도메인) 주소여야 함
    baseUrl: "http://10.0.2.2:5010/v1",
    timeoutMs: 10_000,
  };

// 인증 기능 켜고 끄기
// emailEnabled: 백엔드 #25에서 이메일을 받지 않기로 해서 기본 false
//   false → 회원가입 이메일 칸·인증 코드 화면·아이디/비밀번호 찾기를 숨기고, 가입하면 바로 로그인
//   true  → 이메일 인증 흐름 (백엔드에 /auth/email/*, /auth/username/find, /auth/password/* 가 다시 생기면)
// TODO(팀 결정): 아이디·비밀번호 복구 방식이 정해지면 다시 연결
// 테스트에서 두 경우를 모두 확인하려고 객체로 둠 (읽는 쪽은 호출 시점에 값을 봄)
export const AUTH_FEATURES = {
  emailEnabled: false,
};
