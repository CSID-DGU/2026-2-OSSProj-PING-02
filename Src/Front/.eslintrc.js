module.exports = {
  root: true,
  extends: "@react-native",
  // Gradle 빌드 결과물(테스트 리포트 JS 등)은 검사하지 않음
  ignorePatterns: ["android/**/build/**"],
  rules: {
    // 레퍼런스 코드 스타일(큰따옴표) 유지
    quotes: ["warn", "double", { avoidEscape: true }],
  },
};
