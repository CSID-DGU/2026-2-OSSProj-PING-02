// 기기 저장소 인터페이스
// @react-native-async-storage/async-storage와 같은 모양이라, 설치 후 그대로 바꿔 끼우면 됨
// (토큰은 실제 연결 시 암호화 저장소(EncryptedSharedPreferences 등)를 쓰는 구현으로 교체)
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  session: "malssiat.session",
  onboarding: "malssiat.onboarding",
} as const;
