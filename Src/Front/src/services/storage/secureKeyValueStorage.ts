import * as Keychain from "react-native-keychain";
import type { KeyValueStorage } from "./KeyValueStorage";
import { createKeychainStorage } from "./keychainStorage";

// 기기 저장소 (앱을 껐다 켜도 남음): 키마다 암호화 저장소(react-native-keychain) 한 칸
// - 온보딩에서 고른 친구·AI 메모리, 미뤄 둔 답장, AI 답장 결과처럼 민감한 내용이라 암호화해서 둠
// - prefix로 칸 이름을 나눔 (mock/실서버 데이터가 섞이지 않게 모드를 넣어 씀)
// - jest에서는 __mocks__/react-native-keychain.js (메모리, 테스트마다 비움)
// - 칸(service)마다 Keystore 키가 따로 생기므로 키 이름에 대화방 id처럼 늘어나는 값을 넣지 말 것
//   (여러 개는 칸 하나에 묶어서 저장: ai/AiReplyStore.ts)
// TODO(네이티브 연결): 친구 목록·대화 상태가 커지면 기기 안 암호화 DB로 옮기기
export const createSecureKeyValueStorage = (prefix: string): KeyValueStorage => {
  const slotPrefix = `${prefix}.`;
  const slot = (key: string) => createKeychainStorage(slotPrefix + key);

  return {
    getItem: key => slot(key).read(),
    setItem: (key, value) => slot(key).write(value),
    removeItem: key => slot(key).remove(),
    // 값은 복호화하지 않고 칸 이름만 읽음
    getAllKeys: async () =>
      (await Keychain.getAllGenericPasswordServices())
        .filter(service => service.startsWith(slotPrefix))
        .map(service => service.slice(slotPrefix.length)),
  };
};
