import { css } from "styled-components/native";

// Figma: 00 Design System / Typography
// Android는 font-weight 대신 굵기별 폰트 파일명으로 지정 (android/app/src/main/assets/fonts)

export type FontStyle = typeof fonts;
export type FontStyleKey = keyof FontStyle;

export const fontFamily = {
  light: "Pretendard-Light", // 300
  regular: "Pretendard-Regular", // 400
  medium: "Pretendard-Medium", // 500
  semiBold: "Pretendard-SemiBold", // 600
  bold: "Pretendard-Bold", // 700
  brand: "ChosunGu", // 조선굴림체
} as const;

const fontGenerator = (size: number, family: string, lineHeight: number) => css`
  font-family: ${family};
  font-size: ${size}px;
  line-height: ${lineHeight}px;
`;

export const fonts = {
  //brand (Brand/Logo·Brand/Accent는 조선굴림체 Regular)
  brandLogo: fontGenerator(28, fontFamily.brand, 36),
  brandAccent: fontGenerator(14, fontFamily.brand, 20),
  brandTagline: fontGenerator(12, fontFamily.light, 17),

  //display / heading
  displayAuth: fontGenerator(24, fontFamily.bold, 35),
  headingOnboarding: fontGenerator(22, fontFamily.bold, 31),
  headingDialog: fontGenerator(18, fontFamily.bold, 26),

  //title
  titleAppBar: fontGenerator(18, fontFamily.medium, 25),
  titleSection: fontGenerator(14, fontFamily.semiBold, 20),

  //body
  bodyLarge: fontGenerator(15, fontFamily.regular, 22),
  bodyMedium: fontGenerator(14, fontFamily.regular, 20),
  bodySmall: fontGenerator(13, fontFamily.regular, 19),

  //label
  labelButton: fontGenerator(15, fontFamily.medium, 22),
  labelForm: fontGenerator(13, fontFamily.medium, 18),
  labelCompact: fontGenerator(11, fontFamily.semiBold, 16),

  //caption
  captionRegular: fontGenerator(12, fontFamily.regular, 17),
  captionSmall: fontGenerator(11, fontFamily.regular, 16),
  captionXSmall: fontGenerator(10, fontFamily.regular, 14),
};

export const FontList = Object.keys(fonts);
