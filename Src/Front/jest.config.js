module.exports = {
  preset: "@react-native/jest-preset",
  setupFiles: ["./jest.setup.js"],
  // 화면 테스트는 앱 전체를 그려서 에뮬레이터 등으로 PC가 바쁘면 기본 5초를 넘김 (#79)
  testTimeout: 20000,
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
