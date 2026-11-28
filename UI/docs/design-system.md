# 말씨앗 디자인 시스템

이 문서는 현재 확정된 디자인 원칙을 개발과 공유하기 위한 요약입니다. 최종 값의 기준은 Figma Variables이며, 값이 변경되면 Figma와 이 문서를 함께 갱신합니다.

## 브랜드 방향

- 사용자를 재촉하거나 평가하지 않는 차분한 인상
- 연노랑, 밀크모카, 새싹 그린을 중심으로 한 따뜻한 색감
- 관계 단절을 실패로 표현하지 않고 다시 시작할 여지를 보여주는 문구
- 3D 에셋은 온보딩과 빈 상태처럼 정서적 안내가 필요한 곳에 제한적으로 사용

## 컬러 시스템

말씨앗은 씨앗 노랑, 밀크모카 브라운, 새싹 그린, 웜 뉴트럴을 중심으로 설계합니다. 전체적으로 따뜻하고 부담스럽지 않은 인상을 유지하되, 선택 상태와 주요 행동은 분명하게 구분합니다. 일반 크기 텍스트는 배경과 최소 `4.5:1` 이상의 명도 대비를 확보합니다.

Figma의 원본 변수 컬렉션은 다음과 같습니다.

- Primitive: `말씨앗 / Primitives`
- Semantic: `말씨앗 / Color`
- 현재 모드: `Light`

화면과 컴포넌트에서는 원시 팔레트를 직접 연결하지 않고, 아래의 시맨틱 토큰을 사용합니다.

### Primitive Palette

#### Seed Yellow

| 단계 | 값 | 단계 | 값 |
|---:|---:|---:|---:|
| `seed/50` | `#FFFBF0` | `seed/500` | `#C9A33A` |
| `seed/100` | `#FFF5D6` | `seed/600` | `#A17F28` |
| `seed/200` | `#FFE9A6` | `seed/700` | `#795D1E` |
| `seed/300` | `#F7D876` | `seed/800` | `#5C4619` |
| `seed/400` | `#E7C24F` | `seed/900` | `#423313` |

#### Milk Mocha Brown

| 단계 | 값 | 단계 | 값 |
|---:|---:|---:|---:|
| `brown/50` | `#F8F3F0` | `brown/500` | `#806253` |
| `brown/100` | `#EFE5DF` | `brown/600` | `#644B40` |
| `brown/200` | `#DBC9BE` | `brown/700` | `#4D3932` |
| `brown/300` | `#C1A99A` | `brown/800` | `#3A2B27` |
| `brown/400` | `#A38373` | `brown/900` | `#2B211E` |

#### Sprout Green

| 단계 | 값 | 단계 | 값 |
|---:|---:|---:|---:|
| `green/50` | `#F5F9F2` | `green/500` | `#689653` |
| `green/100` | `#E7F1E1` | `green/600` | `#527A40` |
| `green/200` | `#CFE4C4` | `green/700` | `#3F6032` |
| `green/300` | `#ACCC9C` | `green/800` | `#314A28` |
| `green/400` | `#88B474` | `green/900` | `#263A20` |

#### Warm Neutral

| 단계 | 값 | 단계 | 값 |
|---:|---:|---:|---:|
| `neutral/0` | `#FFFFFF` | `neutral/500` | `#81746B` |
| `neutral/25` | `#FFFDF8` | `neutral/600` | `#655A53` |
| `neutral/50` | `#FAF7F2` | `neutral/700` | `#4D4540` |
| `neutral/100` | `#F3EEE8` | `neutral/800` | `#39332F` |
| `neutral/200` | `#E7DED6` | `neutral/900` | `#2B2724` |
| `neutral/300` | `#D2C6BC` |  |  |
| `neutral/400` | `#A99B91` |  |  |

#### Feedback Supporting Colors

| 토큰 | 값 | 용도 |
|---|---:|---|
| `danger/50` | `#FFF1F0` | 경고·오류 배경 |
| `danger/600` | `#B94747` | 오류 텍스트·테두리 |
| `info/50` | `#EEF5FA` | 안내 배경 |
| `info/600` | `#4D7599` | 안내 텍스트 |

기존 `gray/*` 원시는 시스템·이전 내비게이션 호환용입니다. 신규 기능 화면에서는 Warm Neutral 시리즈를 우선 사용합니다.

### Semantic Colors

#### Foundation

| 토큰 | 연결값 | 값 | 사용처 |
|---|---|---:|---|
| `background/base` | `neutral/25` | `#FFFDF8` | 전체 앱 배경 |
| `background/subtle` | `neutral/50` | `#FAF7F2` | 구분되는 보조 배경 |
| `surface/default` | `neutral/0` | `#FFFFFF` | 카드, 입력창, 다이얼로그 |
| `surface/seed` | `seed/50` | `#FFFBF0` | 씨앗 관련 연노랑 표면 |
| `surface/sprout` | `green/50` | `#F5F9F2` | 회복·완료 관련 표면 |
| `surface/brown` | `brown/50` | `#F8F3F0` | 브라운 계열 보조 표면 |
| `text/primary` | `neutral/900` | `#2B2724` | 제목, 주요 본문 |
| `text/secondary` | `neutral/600` | `#655A53` | 설명, 보조 텍스트 |
| `text/tertiary` | `neutral/500` | `#81746B` | 플레이스홀더, 낮은 강조 |
| `text/on-dark` | `neutral/0` | `#FFFFFF` | 어두운 배경 위 텍스트 |
| `text/brand` | `brown/700` | `#4D3932` | 브랜드 강조 텍스트 |
| `icon/default` | `neutral/700` | `#4D4540` | 기본 아이콘 |
| `icon/subtle` | `neutral/500` | `#81746B` | 보조 아이콘 |
| `icon/brand` | `brown/700` | `#4D3932` | 브랜드 강조 아이콘 |
| `border/default` | `neutral/200` | `#E7DED6` | 기본 경계선 |
| `border/strong` | `neutral/300` | `#D2C6BC` | 강조 경계선 |

#### Brand & Action

| 토큰 | 연결값 | 값 | 사용처 |
|---|---|---:|---|
| `brand/seed` | `seed/300` | `#F7D876` | 씨앗, 포인트, 제한적인 강조 |
| `brand/seed-strong` | `seed/400` | `#E7C24F` | 강한 노랑 강조·포커스 보조 |
| `brand/brown` | `brown/600` | `#644B40` | 브랜드 브라운 |
| `brand/sprout` | `green/500` | `#689653` | 성장·회복·새싹 강조 |
| `action/primary-bg` | `brown/700` | `#4D3932` | 주요 행동 버튼 배경 |
| `action/primary-text` | `neutral/0` | `#FFFFFF` | 주요 행동 버튼 텍스트 |
| `action/secondary-bg` | `seed/100` | `#FFF5D6` | 보조 행동 버튼 배경 |
| `action/secondary-text` | `brown/700` | `#4D3932` | 보조 행동 버튼 텍스트 |
| `state/selected-bg` | `seed/100` | `#FFF5D6` | 선택된 항목 배경 |
| `state/selected-content` | `brown/700` | `#4D3932` | 선택된 항목의 텍스트·아이콘·테두리 |
| `state/focus` | `seed/400` | `#E7C24F` | 포커스 테두리 |

#### State & Feedback

| 토큰 | 연결값 | 값 | 사용처 |
|---|---|---:|---|
| `feedback/success-bg` | `green/50` | `#F5F9F2` | 완료·성공 배경 |
| `feedback/success-text` | `green/600` | `#527A40` | 완료·성공 텍스트 |
| `feedback/danger-bg` | `danger/50` | `#FFF1F0` | 주의·오류 배경 |
| `feedback/danger-text` | `danger/600` | `#B94747` | 주의·오류 텍스트 |
| `feedback/info-bg` | `info/50` | `#EEF5FA` | 정보 안내 배경 |
| `feedback/info-text` | `info/600` | `#4D7599` | 정보 안내 텍스트 |
| `state/error` | `danger/600` | `#B94747` | 오류 상태 입력창 테두리 |

`state`라는 단독 이름의 변수는 이전 작업용 내부 변수입니다. 신규 화면에서는 사용하지 않고, `state/selected-*`, `state/focus`, `state/error`처럼 역할이 명확한 토큰을 사용합니다.

### Seed Yellow Usage

씨앗 노랑은 말씨앗의 핵심 브랜드 색이지만, 화면을 넓게 채우는 기본색이 아니라 작은 포인트와 상태를 조용히 드러내는 색입니다.

- 씨앗 에셋과 브랜드 포인트
- 놓치면 아쉬운 연락을 보여주는 강조 카드
- 선택된 카드·칩·체크박스 등의 선택 상태
- 제한적인 하이라이트와 포커스 표현

### Color Rules

#### DO

- 노랑 위에는 진한 브라운 텍스트를 사용합니다.
- 초록은 회복·완료·긍정 상태에 제한적으로 사용합니다.
- 넓은 배경은 흰색과 웜 뉴트럴을 사용해 안정감을 유지합니다.
- 선택·오류·완료 상태는 색상과 아이콘 또는 라벨을 함께 사용합니다.
- 컴포넌트에서는 원시 HEX 대신 시맨틱 변수를 연결합니다.

#### DON'T

- 연노랑 위에 흰색 텍스트를 사용하지 않습니다.
- 중요한 경고를 노랑만으로 표현하지 않습니다.
- 화면 전체를 브라운으로 채우지 않습니다.
- 사용자의 미응답 상태를 빨강으로 압박하거나 평가하지 않습니다.
- 브랜드 컬러를 장식 목적으로 과도하게 반복하지 않습니다.

## 타이포그래피

UI의 기본 서체는 `Pretendard`입니다. `조선굴림체`는 서비스명과 짧은 브랜드 문구에만 제한적으로 사용합니다(예외: 홈 일정 카드 날짜, 아래 #53 표 참고). `Noto Sans KR`은 사용하지 않습니다.

| 스타일 | 서체·굵기 | 크기/행간 | 사용처 |
|---|---|---:|---|
| `Brand/Logo` | 조선굴림체 Regular | `28/36` | 서비스명, 브랜드 로고 텍스트 |
| `Brand/Accent` | 조선굴림체 Regular | `14/20` | 짧은 감성 문구, 브랜드 강조 |
| `Brand/Tagline` | Pretendard Light | `12/17` | 스플래시 보조 슬로건 |
| `Display/Auth` | Pretendard Bold | `24/35` | 로그인·회원가입 주요 제목 |
| `Heading/Onboarding` | Pretendard Bold | `22/31` | 온보딩 화면 제목 |
| `Heading/Dialog` | Pretendard Bold | `18/26` | 팝업·다이얼로그 제목 |
| `Title/AppBar` | Pretendard Medium | `18/25` | 상단 앱바 제목 |
| `Title/Section` | Pretendard SemiBold | `14/20` | 카드·섹션 제목 |
| `Body/Large` | Pretendard Regular | `15/22` | 주요 설명, 긴 본문 |
| `Body/Medium` | Pretendard Regular | `14/20` | 일반 본문, 안내 문구 |
| `Body/Small` | Pretendard Regular | `13/19` | 보조 본문, 카드 설명 |
| `Label/Button` | Pretendard Medium | `15/22` | 주요 버튼 라벨 |
| `Label/Form` | Pretendard Medium | `13/18` | 입력창·선택 항목 라벨 |
| `Label/Compact` | Pretendard SemiBold | `11/16` | 칩·작은 강조 라벨 |
| `Caption/Regular` | Pretendard Regular | `12/17` | 체크박스·짧은 보조 문구 |
| `Caption/Small` | Pretendard Regular | `11/16` | 약관·주의·하단 안내 |
| `Caption/XSmall` | Pretendard Regular | `10/14` | 상태·아주 작은 보조 정보 |

#53 홈 시안에서 추가한 스타일 (코드 토큰 이름, `src/core/styles/fonts.ts`)

| 코드 토큰 | 서체·굵기 | 크기/행간 | 사용처 |
|---|---|---:|---|
| `brandHomeLogo` | 조선굴림체 Regular | `20/20` | 홈 앱바 "말씨앗" (Figma: Brand/Accent를 20/20으로 사용) |
| `titleCardSmall` | Pretendard Bold | `13/19` | 홈 빠른 기능 카드 제목 |
| `labelTab` | Pretendard Medium | `11/16` | 하단 탭 글자 (선택·기본 같은 굵기) |
| `captionCard` | Pretendard Regular | `10/16` | 홈 연락 카드 요약, 단체방·일정 카드 설명 |
| `brandDateMonth` | 조선굴림체 Regular | `9/15` | 홈 일정 카드 "11월" |
| `brandDateDay` | 조선굴림체 Regular | `17/23` | 홈 일정 카드 날짜 숫자 |
| `headingHomeHero` | Pretendard Bold | `20/26` | 홈 히어로 제목 |
| `titleHomeSection` | Pretendard Bold | `16/22` | 홈 섹션 제목 |
| `titleCard` | Pretendard Bold | `14/20` | 홈 연락·일정·안부 카드 제목 |
| `bodyCompact` | Pretendard Regular | `13/15` | 홈 빈 상태 설명, 도움 수준 화면 설명 |
| `labelButtonCompact` | Pretendard Medium | `13/13` | 도움 수준 화면 버튼 |
| `labelLink` | Pretendard Medium | `11/17` | "상태 바꾸기", "전체 보기", "캘린더" |
| `captionHero` | Pretendard Regular | `11/17` | 홈 히어로 설명 |
| `captionCompact` | Pretendard Regular | `11/15` | 홈 안부 카드 설명 |
| `captionQuick` | Pretendard Regular | `10/15` | 홈 빠른 기능 카드 설명 |

#59 온보딩 최종 시안에서 추가·사용한 스타일

| 코드 토큰 | 서체·굵기 | 크기/행간 | 사용처 |
|---|---|---:|---|
| `captionDense` | Pretendard Regular | `11/12` | 온보딩 06 받을 알림 항목 설명 (추가) |
| `bodyCompact` | Pretendard Regular | `13/15` | 온보딩 06 "전체 알림" (Figma: Body/Small을 행간 15로) |
| `titleSubsection` | Pretendard Bold | `16/24` | 온보딩 11 "AI 답장 맞춤 설정" (추가) |
| `bodySmallRelaxed` | Pretendard Regular | `13/20` | 온보딩 11 소제목 설명 (추가) |
| `labelField` | Pretendard SemiBold | `12/18` | `TextArea` 상자 라벨 (추가) |
| `captionChip` | Pretendard Regular | `10/13.5` (135%) | 공통 칩(`ChoiceGroup` chip) 글자 (추가) |
| `captionRegular` | Pretendard Regular | `12/17` | `TextArea` 입력·placeholder (Caption/Regular) |
| `captionQuick` | Pretendard Regular | `10/15` | `TextArea` 글자 수 |
| `labelForm` | Pretendard Medium | `13/18` | 온보딩 10 줄 제목 (Label/Form) |

#60 설정 시안에서 추가한 스타일

| 코드 토큰 | 서체·굵기 | 크기/행간 | 사용처 |
|---|---|---:|---|
| `titleProfile` | Pretendard Bold | `16/26` | 설정 프로필 카드 이름 |
| `titleSheetCompact` | Pretendard Bold | `16/28` | 회원 탈퇴 시트 제목 |
| `labelSettingSection` | Pretendard Medium | `11/24` | 설정 메뉴 묶음 이름 ("내 계정", "연락 설정") |
| `labelToast` | Pretendard Medium | `13/20` | 오류 토스트 문구 |
| `labelDataRow` | Pretendard Medium | `12/24` | 저장된 데이터 상세 줄 이름 ("수집 원문 개수") |
| `labelButtonSmall` | Pretendard Medium | `12/17` | 저장된 데이터 상자 안 작은 버튼 (높이 40, 시안 행간 normal) |

- 설정 프로필 카드의 아이디·생년월일은 `captionHero`(11/17), 메뉴 제목·설명은 `labelForm`·`captionRegular`, 저장된 데이터 줄 값은 `labelLink`(11/17), 삭제 팝업 설명은 `bodyCompact`(13/15)를 그대로 씀

- **예외: 일정 카드 날짜.** 조선굴림체는 서비스명·브랜드 문구에만 쓰지만, 홈 일정 카드의 날짜 원("11월"·"22")은 시안대로 조선굴림체를 씀 (#53 팀 확정). Figma에서 로고와 같은 폰트로 지정돼 있고, 숫자 폭(약 0.46em)도 굴림 계열 반각 숫자와 일치

- 화면에서는 `__Source/*`가 아니라 위의 역할 기반 스타일을 적용합니다.
- `__Source/*`는 로컬 폰트 연결을 확인하기 위한 내부 소스 스타일이므로 실제 UI에 사용하지 않습니다.
- `01-4-1 / 아이디 찾기`의 기존 폰트 표기는 이번 정리 범위에서 제외합니다.

## 에셋 스타일

### 3D 캐릭터·기능 아이콘

- 부드러운 클레이 또는 벨벳 질감
- 둥글고 단순한 실루엣
- 따뜻한 확산광과 약한 접지 그림자
- 투명 배경 PNG
- 한 화면에서 서로 다른 3D 렌더링 스타일을 혼용하지 않음

### 조작 아이콘

- 단순한 SVG 선형 아이콘
- 동일 화면 내 선 굵기와 모서리 표현 통일
- 일반적인 기능에 3D 아이콘이나 이모지를 사용하지 않음

## 기본 상호작용 기준

- 터치 영역: 최소 `44×44dp`, Android 권장 `48×48dp`
- 본문 텍스트: 가급적 `14dp` 이상, 핵심 본문은 `16dp` 권장
- 선택 상태: 색상만으로 구분하지 않고 체크 표시나 테두리 변화를 함께 제공
- 버튼 상태: `default`, `pressed`, `disabled`, 필요 시 `loading`
- 입력 상태: `empty`, `focused`, `filled`, `error`, `disabled`
- 체크박스 상태: `unchecked`, `checked`, `pressed`, `disabled`

## 캐릭터 활용 원칙

말씨는 사용자의 행동을 감시하거나 답장을 재촉하는 보상 캐릭터가 아닙니다. 사용자가 행동하지 않았을 때 울거나 시드는 연출을 사용하지 않으며, 필요한 순간에만 도움을 건네는 동반자로 표현합니다.

## 구현 전 확인 항목

- 에셋이 `assets`에 있으며 `references`의 파일을 잘못 불러오지 않았는가
- 투명 PNG의 비율을 유지했는가
- 표시 크기에 비해 지나치게 큰 PNG를 번들에 포함하지 않았는가
- 선택·오류·완료 상태가 색상 하나에만 의존하지 않는가
- 아이콘 버튼과 체크박스의 터치 영역이 충분한가
- 앱 로고를 임의로 변형하지 않았는가

