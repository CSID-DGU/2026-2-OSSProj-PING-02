// 기기 저장소 인터페이스
// @react-native-async-storage/async-storage와 같은 모양이라, 설치 후 그대로 바꿔 끼우면 됨
// (로그인 토큰은 여기 두지 않고 암호화 저장소에: services.tokens, storage/keychainStorage.ts)
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  onboarding: "malssiat.onboarding",
  // 04 홈 오늘의 도움 수준 (사용자 id를 붙여 씀)
  homeHelp: "malssiat.homeHelp",
} as const;
