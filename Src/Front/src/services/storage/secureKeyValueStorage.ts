import type { KeyValueStorage } from "./KeyValueStorage";
import { createKeychainStorage } from "./keychainStorage";

// 기기 저장소 (앱을 껐다 켜도 남음): 키마다 암호화 저장소(react-native-keychain) 한 칸
// - 온보딩에서 고른 친구·AI 메모리, 미뤄 둔 답장, AI 답장 결과처럼 민감한 내용이라 암호화해서 둠
// - prefix로 칸 이름을 나눔 (mock/실서버 데이터가 섞이지 않게 모드를 넣어 씀)
// - jest에서는 __mocks__/react-native-keychain.js (메모리, 테스트마다 비움)
// TODO(네이티브 연결): 친구 목록·대화 상태가 커지면 기기 안 암호화 DB로 옮기기
export const createSecureKeyValueStorage = (prefix: string): KeyValueStorage => {
  const slot = (key: string) => createKeychainStorage(`${prefix}.${key}`);

  return {
    getItem: key => slot(key).read(),
    setItem: (key, value) => slot(key).write(value),
    removeItem: key => slot(key).remove(),
  };
};
