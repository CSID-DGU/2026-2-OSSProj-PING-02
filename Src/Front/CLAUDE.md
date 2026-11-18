# 말씨앗 Front 작업 안내

새 대화(Claude)와 팀원이 같이 보는 요약입니다. 실행 방법은 [README.md](README.md)를 보세요.

## 프로젝트

- **말씨앗**: 고립·은둔 청년의 연락 부담을 덜어 주는 안드로이드 앱. 알림으로 받은 메시지를 정리하고 답장 후보를 제안합니다.
- **스택**: React Native 0.88 + TypeScript, styled-components, React Navigation(native-stack), 시스템 기능은 Kotlin 네이티브 모듈(예정)
- **AI 구조**: 원문은 기기에만 저장 → 기기에서 **규칙 기반 마스킹**([src/utils/masking](src/utils/masking/README.md), 정규식 + 사용자·친구 이름 목록)으로 이름·전화번호 같은 민감한 내용을 먼저 가림 → **가린 내용만 중간 서버를 거쳐 외부 AI**(OpenRouter의 데이터 미보관(ZDR) 모델)로. 서버는 원문을 저장하지 않음. 기기 안 AI 모델은 쓰지 않음

## 디자인 규칙

- 색·글자: [UI/docs/design-system.md](../../UI/docs/design-system.md) 토큰(`theme.colors`, `theme.fonts`)만. hex·폰트 크기 직접 입력 금지
- 컴포넌트: `@core/ui` 공통 컴포넌트만. 비슷한 컴포넌트를 새로 만들지 말고 **조합**으로 해결
- `src/core`는 수정하지 않음. 예외: 터치 영역 48dp용 `hitSlop`(Header·ChoiceGroup·Checkbox·Dialog·Button(text)·Select), 디자이너가 준 아이콘 SVG 등록
- 아이콘: `UI/assets/icons/ui` SVG를 `@core/ui/icon`에 등록해서 사용
- 토큰에 없는 Figma 색은 가장 가까운 기존 토큰을 쓰고 차이를 보고 (새 토큰 추가 금지)

## Figma 사용법

- 기준은 `docs/figma/<영역>/*.png` (gitignore, 각자 로컬에 둠). 이름은 `번호_이름.png`
- PNG는 2x(720×1600) → **수치를 2로 나눠** dp로 읽기
- Figma에 없는 상태(권한 거부·설정 복귀·로딩·오류·빈 상태)는 **부드러운 안내 상자(Notice) + 텍스트 버튼**으로
- Figma와 다르게 간 부분은 코드에 `TODO(디자이너 공유)` / `TODO(Figma 문구 확인)`으로 남김

## UX 원칙

- 압박하지 않는 문구 ("N일째 답장 안 함" 금지, 미뤄도 괜찮다는 톤, 선택권 강조)
- **자동 전송 없음**. 바로 보내기는 **확인 팝업 필수**
- 터치 영역 48dp 이상, 접근성 라벨, 선택·오류 상태는 색만으로 구분하지 않음
- 보이는 뒤로가기(온보딩도 왼쪽 위 화살표) + 안드로이드 뒤로가기가 같은 동작
- 상태는 화면마다: 로딩 / 빈 상태 / 오류 / 정상 (+ AI 분석 중·모델 미준비·분석 실패)

## 데이터

- [src/services/index.ts](src/services/index.ts)가 교체 지점: 인터페이스 + mock. 실제 API·네이티브 모듈이 준비되면 여기만 바꿈
- mock 테스트 계정: **아이디 `malssiat` / 비밀번호 `abcd1234`** (이메일 `demo@malssiat.app`), 인증 코드 `123456`
- 개발 옵션 (services/index.ts): 권한 `DEV_PERMISSION_SCENARIO = "deny"`로 거부 흐름, 모델 `failFirstAttemptAt`로 다운로드 실패, 네트워크 `"cellular"`
- mock 저장소는 메모리라 앱을 완전히 끄면 로그인·진행 상황이 초기화됨
- 서버·외부 AI로 보내는 대화는 반드시 `maskPii`를 거친 `text`만 보냄. `mapping`(자리표시↔원래 값)은 기기 밖으로 보내지 않고, 답장은 `unmaskPii`로 되돌림
- AI 답장은 화면에서 `requestAiReply`(src/services/ai)만 부르면 됨: 관계·결정 여부 규칙 판별 → 마스킹 → `services.ai` 호출 → 되돌리기 → `services.aiReplies`에 로컬 저장. 지금 `services.ai`는 mock

## 작업 규칙

- 기능 브랜치(`feat/...`)에서 작업, **main 머지 금지**(PR은 Draft)
- 덩어리마다 `yarn typecheck && yarn lint && yarn test` 통과 후 로컬 커밋 (`[feat] 설명`)
- 사소한 결정은 원칙대로 정하고 TODO로 남김. 중요한 결정만 모아서 질문
- 테스트: `test-utils/app.tsx` 공통 도구, jest는 안드로이드 플랫폼(`jest.config.js`)이라 하드웨어 뒤로가기 테스트 가능

## 남은 TODO

디자이너 확인 필요
- 연동 앱 아이콘 2x·3x (지금 60px 한 장), 탭바 아이콘 SVG 5개, 홈·탭바 시안
- 07·08 설명 문구 (시안에서 제목과 겹침, 임시 문구)
- 11 AI 메모리 상세 작성 시안 (입력창 + 예시 칩으로 임시)
- Figma와 다르게 간 부분: 온보딩 뒤로가기 화살표 추가, 03 아이콘을 위로, 05 버튼 "다음", 11 버튼 "‘요즘 나의 상태’부터 쓰기", AI 모델 다운로드 화면 추가

팀 결정 필요
- 아이디 규칙 (임시: 영문 소문자+숫자 4~20자, `constants/auth.ts`의 `LOGIN_ID_RULE`)
- 아이디 찾기 방식 (이메일/전화번호, 인터페이스만 있음)
- 11 예시 칩을 다시 누르면 빠지는 동작이 맞는지
- AI 모델 다운로드 화면(`ModelDownload`)과 `ModelService`: 기기 안 모델을 쓰지 않기로 해서 받을 모델이 없음. 온보딩에서 뺄지

기능 추가
- 09 연락처 검색창

네이티브·API 연결
- 권한·연락처·모델 다운로드·클립보드·메신저 열기·바로 답장: Kotlin 모듈로 교체
- 아이디 기반 인증 API(중복 확인·아이디 찾기·비밀번호 찾기): 백엔드 새 API
- 저장소: AsyncStorage/암호화 저장소, 친구 목록은 기기 안 암호화 DB

## 다음 작업

- **홈·연락 화면** (`feat/home` 브랜치, feat/onboarding 기준): 하단 탭(글자 탭 임시), 홈, 연락 목록·미뤄둔 답장까지 로컬 커밋됨. 남은 것: 연락 상세·답장 후보(09-A·B·C)·답장 수정(10)·나중에 답하기(11)·단톡·잘린 메시지
- 시안: `docs/figma/home` (04 연락은 와이어프레임 → 구조·문구만 따르고 색·컴포넌트는 design-system)
