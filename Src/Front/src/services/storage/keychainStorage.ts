import * as Keychain from "react-native-keychain";
import type { SecureValueStorage } from "../auth/tokenStore";

// 암호화 저장소 한 칸 (react-native-keychain)
// - Android: Android Keystore 키로 AES-GCM 암호화. 생체 인증 없이 읽음 (앱 시작 때 자동 로그인용)
// - service 이름별로 따로 저장 → mock/http 토큰이 섞이지 않게 모드마다 다른 이름을 씀
// - jest에서는 __mocks__/react-native-keychain.js (메모리)
const USERNAME = "malssiat";

export const createKeychainStorage = (service: string): SecureValueStorage => ({
  async read() {
    const saved = await Keychain.getGenericPassword({ service });
    return saved ? saved.password : null;
  },
  async write(value) {
    await Keychain.setGenericPassword(USERNAME, value, {
      service,
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
  },
  async remove() {
    await Keychain.resetGenericPassword({ service });
  },
});
