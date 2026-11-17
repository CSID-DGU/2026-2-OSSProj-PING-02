module.exports = {
  preset: "@react-native/jest-preset",
  setupFiles: ["./jest.setup.js"],
  // 안드로이드 전용 앱이라 안드로이드 구현으로 테스트 (뒤로가기 BackHandler 등)
  haste: {
    defaultPlatform: "android",
    platforms: ["android", "ios", "native"],
  },
  // ESM으로 배포되는 라이브러리는 babel 변환 대상에 포함
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|styled-components)/)",
  ],
};
