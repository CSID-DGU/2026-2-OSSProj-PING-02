# 말씨앗 UI 디자인 리소스

말씨앗 앱의 확정 에셋과 디자인 참고 자료를 정리한 폴더입니다. Figma가 화면과 컴포넌트의 원본이며, 이 폴더는 개발 전달과 버전 관리를 위한 저장소입니다.

## 폴더 구조

```text
UI/
├── assets/                         # 앱에서 사용할 수 있는 에셋
│   ├── app-icons/                  # 연동 앱 로고
│   ├── character/malssi/poses/     # 투명 배경 말씨 포즈
│   ├── illustrations/onboarding/   # 온보딩 장면 일러스트
│   └── icons/
│       ├── feature/                # 화면 설명용 3D 기능 아이콘
│       └── ui/                     # 조작에 사용하는 단순 SVG 아이콘
├── references/character/           # 캐릭터 일관성 확인용 시트
└── docs/
    ├── asset-catalog.md            # 에셋별 용도와 화면 매핑
    └── design-system.md            # 현재 디자인 토큰과 적용 원칙
```

## 프론트엔드 사용 원칙

- `assets`만 앱 번들 후보로 사용합니다. `references`는 개발 번들에 포함하지 않습니다.
- 기본 버튼, 체크박스, 입력창, 카드 등은 이미지가 아닌 React Native 컴포넌트로 구현합니다.
- `icons/ui`의 SVG는 조작 아이콘, `icons/feature`의 PNG는 설명용 장식 에셋입니다.
- PNG는 투명 배경을 유지하고 임의로 늘리지 않습니다. 화면에서는 원본 비율을 유지합니다.
- 현재 3D PNG는 디자인 원본 해상도입니다. 실제 앱에 포함하기 전 표시 크기에 맞는 `2x/3x` 런타임 파일로 최적화합니다.
- 앱 로고는 각 서비스 식별 용도로만 사용하고 색상이나 비율을 변형하지 않습니다.

## 파일명 규칙

```text
{subject}-{action-or-context}-{style?}-v{number}.{extension}
```

- 영문 소문자와 숫자만 사용합니다.
- 단어 구분은 하이픈(`-`)을 사용합니다.
- 공백, 밑줄, 한글 파일명은 사용하지 않습니다.
- 동일 콘셉트의 수정본은 기존 파일을 덮어쓰기보다 `v2`, `v3`로 관리합니다.
- 선택 상태와 같은 UI 상태는 별도 이미지가 아니라 컴포넌트의 `state`로 구현합니다.

## React Native로 옮길 때

앱 소스가 추가되면 `UI/assets` 전체를 무조건 복사하지 말고, 확정된 에셋만 앱의 `assets` 또는 `src/assets`로 옮깁니다. SVG 사용 시 프로젝트에서 채택한 `react-native-svg` 설정에 맞춰 컴포넌트로 불러옵니다.

에셋의 화면별 용도는 [asset-catalog.md](docs/asset-catalog.md), 색상과 컴포넌트 기준은 [design-system.md](docs/design-system.md)를 확인합니다.

