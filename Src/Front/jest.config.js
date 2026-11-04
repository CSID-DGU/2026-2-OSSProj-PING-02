module.exports = {
  preset: "@react-native/jest-preset",
  setupFiles: ["./jest.setup.js"],
  // ESM으로 배포되는 라이브러리는 babel 변환 대상에 포함
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|styled-components)/)",
  ],
};
