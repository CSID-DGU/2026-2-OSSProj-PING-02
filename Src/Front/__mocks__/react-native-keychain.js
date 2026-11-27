/* eslint-env jest */
// jest용 react-native-keychain (메모리). test-utils가 테스트마다 __reset()으로 비움
const items = new Map();

module.exports = {
  STORAGE_TYPE: {
    AES_CBC: "KeystoreAESCBC",
    AES_GCM_NO_AUTH: "KeystoreAESGCM_NoAuth",
    AES_GCM: "KeystoreAESGCM",
    RSA: "KeystoreRSAECB",
  },
  setGenericPassword: jest.fn(async (username, password, options = {}) => {
    items.set(options.service ?? "default", { username, password });
    return { service: options.service ?? "default", storage: options.storage };
  }),
  getGenericPassword: jest.fn(async (options = {}) => {
    const item = items.get(options.service ?? "default");
    return item ? { ...item, service: options.service ?? "default" } : false;
  }),
  resetGenericPassword: jest.fn(async (options = {}) =>
    items.delete(options.service ?? "default")
  ),
  getAllGenericPasswordServices: jest.fn(async () => [...items.keys()]),
  __reset: () => items.clear(),
};
