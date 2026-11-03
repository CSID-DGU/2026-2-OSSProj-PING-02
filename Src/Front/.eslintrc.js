module.exports = {
  root: true,
  extends: "@react-native",
  rules: {
    // 레퍼런스 코드 스타일(큰따옴표) 유지
    quotes: ["warn", "double", { avoidEscape: true }],
  },
};
