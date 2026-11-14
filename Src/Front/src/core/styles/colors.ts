// 기준: UI/docs/design-system.md (Figma Variables `말씨앗 / Primitives`, `말씨앗 / Color`)

// 원색 팔레트 (컴포넌트에서는 직접 쓰지 말고 아래 colors 역할 토큰 사용)
export const palette = {
  //seed yellow
  seed50: "#FFFBF0",
  seed100: "#FFF5D6",
  seed200: "#FFE9A6",
  seed300: "#F7D876",
  seed400: "#E7C24F",
  seed500: "#C9A33A",
  seed600: "#A17F28",
  seed700: "#795D1E",
  seed800: "#5C4619",
  seed900: "#423313",

  //milk mocha brown
  brown50: "#F8F3F0",
  brown100: "#EFE5DF",
  brown200: "#DBC9BE",
  brown300: "#C1A99A",
  brown400: "#A38373",
  brown500: "#806253",
  brown600: "#644B40",
  brown700: "#4D3932",
  brown800: "#3A2B27",
  brown900: "#2B211E",

  //sprout green
  green50: "#F5F9F2",
  green100: "#E7F1E1",
  green200: "#CFE4C4",
  green300: "#ACCC9C",
  green400: "#88B474",
  green500: "#689653",
  green600: "#527A40",
  green700: "#3F6032",
  green800: "#314A28",
  green900: "#263A20",

  //warm neutral
  neutral0: "#FFFFFF",
  neutral25: "#FFFDF8",
  neutral50: "#FAF7F2",
  neutral100: "#F3EEE8",
  neutral200: "#E7DED6",
  neutral300: "#D2C6BC",
  neutral400: "#A99B91",
  neutral500: "#81746B",
  neutral600: "#655A53",
  neutral700: "#4D4540",
  neutral800: "#39332F",
  neutral900: "#2B2724",

  //feedback supporting
  danger50: "#FFF1F0",
  danger600: "#B94747",
  info50: "#EEF5FA",
  info600: "#4D7599",
} as const;

// 역할(semantic) 토큰
export const colors = {
  //foundation
  backgroundBase: palette.neutral25, // 전체 앱 배경
  backgroundSubtle: palette.neutral50, // 구분되는 보조 배경
  surfaceDefault: palette.neutral0, // 카드, 입력창, 다이얼로그
  surfaceSeed: palette.seed50, // 씨앗 관련 연노랑 표면
  surfaceSprout: palette.green50, // 회복·완료 관련 표면
  surfaceBrown: palette.brown50, // 브라운 계열 보조 표면
  textPrimary: palette.neutral900, // 제목, 주요 본문
  textSecondary: palette.neutral600, // 설명, 보조 텍스트
  textTertiary: palette.neutral500, // 플레이스홀더, 낮은 강조
  textOnDark: palette.neutral0, // 어두운 배경 위 텍스트
  textBrand: palette.brown700, // 브랜드 강조 텍스트
  iconDefault: palette.neutral700, // 기본 아이콘
  iconSubtle: palette.neutral500, // 보조 아이콘
  iconBrand: palette.brown700, // 브랜드 강조 아이콘
  borderDefault: palette.neutral200, // 기본 경계선
  borderStrong: palette.neutral300, // 강조 경계선

  //brand & action
  brandSeed: palette.seed300, // 씨앗, 포인트, 제한적인 강조
  brandSeedStrong: palette.seed400, // 강한 노랑 강조·포커스 보조
  brandBrown: palette.brown600, // 브랜드 브라운
  brandSprout: palette.green500, // 성장·회복·새싹 강조
  actionPrimaryBg: palette.brown700, // 주요 행동 버튼 배경
  actionPrimaryText: palette.neutral0, // 주요 행동 버튼 텍스트
  actionSecondaryBg: palette.seed100, // 보조 행동 버튼 배경
  actionSecondaryText: palette.brown700, // 보조 행동 버튼 텍스트
  stateSelectedBg: palette.seed100, // 선택된 항목 배경
  stateSelectedContent: palette.brown700, // 선택된 항목의 텍스트·아이콘·테두리
  stateFocus: palette.seed400, // 포커스 테두리

  //state & feedback
  feedbackSuccessBg: palette.green50, // 완료·성공 배경
  feedbackSuccessText: palette.green600, // 완료·성공 텍스트
  feedbackDangerBg: palette.danger50, // 주의·오류 배경
  feedbackDangerText: palette.danger600, // 주의·오류 텍스트
  feedbackInfoBg: palette.info50, // 정보 안내 배경
  feedbackInfoText: palette.info600, // 정보 안내 텍스트
  stateError: palette.danger600, // 오류 상태 입력창 테두리

  //overlay
  overlayDim: "rgba(0, 0, 0, 0.3)", // 다이얼로그·시트 뒤 딤 배경 (Figma 01-4-1)
} as const;
