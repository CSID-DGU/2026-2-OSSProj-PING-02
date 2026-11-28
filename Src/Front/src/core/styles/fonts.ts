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
  brandHomeLogo: fontGenerator(20, fontFamily.brand, 20), // #53 홈 로고 (Figma: Brand/Accent를 20/20으로)
  brandDateMonth: fontGenerator(9, fontFamily.brand, 15), // #53 홈 일정 카드 "11월"
  brandDateDay: fontGenerator(17, fontFamily.brand, 23), // #53 홈 일정 카드 "22"

  //#53 홈
  headingHomeHero: fontGenerator(20, fontFamily.bold, 26), // 히어로 제목
  titleHomeSection: fontGenerator(16, fontFamily.bold, 22), // 섹션 제목
  titleCard: fontGenerator(14, fontFamily.bold, 20), // 연락·일정·안부 카드 제목
  bodyCompact: fontGenerator(13, fontFamily.regular, 15), // 빈 상태 설명, 도움 수준 화면 설명
  labelButtonCompact: fontGenerator(13, fontFamily.medium, 13), // 도움 수준 화면 버튼
  labelLink: fontGenerator(11, fontFamily.medium, 17), // "상태 바꾸기", "전체 보기"
  captionHero: fontGenerator(11, fontFamily.regular, 17), // 히어로 설명
  captionCompact: fontGenerator(11, fontFamily.regular, 15), // 안부 카드 설명
  captionQuick: fontGenerator(10, fontFamily.regular, 15), // 빠른 기능 카드 설명

  //#60 설정
  titleProfile: fontGenerator(16, fontFamily.bold, 26), // 프로필 카드 이름
  titleSheetCompact: fontGenerator(16, fontFamily.bold, 28), // 회원 탈퇴 시트 제목
  labelSettingSection: fontGenerator(11, fontFamily.medium, 24), // 설정 메뉴 묶음 이름 ("내 계정")
  labelToast: fontGenerator(13, fontFamily.medium, 20), // 오류 토스트 문구
  labelDataRow: fontGenerator(12, fontFamily.medium, 24), // 저장된 데이터 상세 줄 이름 ("수집 원문 개수")
  labelButtonSmall: fontGenerator(12, fontFamily.medium, 17), // 저장된 데이터 상자 안 작은 버튼 (높이 40)
  labelChip: fontGenerator(12, fontFamily.regular, 22), // 내 정보 "재설정"·비밀번호 "확인" 작은 노란 버튼

  //display / heading
  displayAuth: fontGenerator(24, fontFamily.bold, 35),
  headingOnboarding: fontGenerator(22, fontFamily.bold, 31),
  headingDialog: fontGenerator(18, fontFamily.bold, 26),

  //title
  titleAppBar: fontGenerator(18, fontFamily.medium, 25),
  titleSection: fontGenerator(14, fontFamily.semiBold, 20),
  titleCardSmall: fontGenerator(13, fontFamily.bold, 19), // #53 홈 빠른 기능 카드 제목

  //body
  bodyLarge: fontGenerator(15, fontFamily.regular, 22),
  bodyMedium: fontGenerator(14, fontFamily.regular, 20),
  bodySmall: fontGenerator(13, fontFamily.regular, 19),

  //label
  labelButton: fontGenerator(15, fontFamily.medium, 22),
  labelForm: fontGenerator(13, fontFamily.medium, 18),
  labelCompact: fontGenerator(11, fontFamily.semiBold, 16),
  labelTab: fontGenerator(11, fontFamily.medium, 16), // #53 하단 탭 글자 (선택·기본 같음, 색만 다름)

  //caption
  captionRegular: fontGenerator(12, fontFamily.regular, 17),
  captionSmall: fontGenerator(11, fontFamily.regular, 16),
  captionXSmall: fontGenerator(10, fontFamily.regular, 14),
  captionCard: fontGenerator(10, fontFamily.regular, 16), // #53 홈 연락 카드 요약
  captionDense: fontGenerator(11, fontFamily.regular, 12), // #59 온보딩 06 알림 항목 설명
  titleSubsection: fontGenerator(16, fontFamily.bold, 24), // #59 온보딩 11 "AI 답장 맞춤 설정"
  bodySmallRelaxed: fontGenerator(13, fontFamily.regular, 20), // #59 온보딩 11 소제목 설명
  labelField: fontGenerator(12, fontFamily.semiBold, 18), // #59 TextArea 상자 라벨
  captionChip: fontGenerator(10, fontFamily.regular, 13.5), // #59 공통 칩 글자 (135%)
};

export const FontList = Object.keys(fonts);
