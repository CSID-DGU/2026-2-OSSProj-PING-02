// 기기 저장소 인터페이스 (@react-native-async-storage/async-storage와 같은 모양)
// 구현: secureKeyValueStorage.ts (암호화 저장소, 앱을 껐다 켜도 남음) / memoryStorage.ts (테스트용)
// (로그인 토큰은 여기 두지 않고 따로: services.tokens, storage/keychainStorage.ts)
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  onboarding: "malssiat.onboarding",
} as const;
