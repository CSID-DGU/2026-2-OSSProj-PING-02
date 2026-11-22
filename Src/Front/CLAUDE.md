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

- 기준 우선순위: **디자인 화면**(02 Auth, 03 Onboarding, 04 연락, 05 친구 등) > **통합본 와이어프레임**(01 Wireframes, 초안)
- 디자인 화면이 없는 기능(홈, 설정, 캘린더 등)만 통합본을 흐름·구성 참고용으로 쓰고, 스타일은 design-system 기준
- 통합본과 백엔드가 다르면 **백엔드 기준**
- 온보딩은 현재 구현 유지. 디자이너 수정본이 나오면 마지막에 반영
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
- 인증 API: [src/services/config.ts](src/services/config.ts) 한 곳에서 설정. 실서버로 확인할 때는 `DEV_API_MODE`만 `"http"`로 (기본·커밋은 `"mock"`). `baseUrl`은 실서버 `https://malssiat-api.koreacentral.cloudapp.azure.com/v1`. `AUTH_FEATURES`(`emailVerification` false: 백엔드에 없음·화면 숨김 / `accountRecovery` true). 기준 문서는 백엔드 main의 `Doc/API_목록.md`
- **자동 로그인 (팀 확정)**: 토큰은 `services.tokens`(메모리 + react-native-keychain 암호화 저장소, 모드별 service `malssiat.auth.mock|http`). 앱 시작 때 `SessionProvider`가 "loading"으로 시작해 `auth.restoreSession()`(refresh → `GET /users/me`)으로 복구, 저장 토큰이 없거나 실패하면 로그인 화면. 세션 만료(401 등)면 저장 토큰도 지우고, 네트워크 오류면 남겨 다음 실행에서 다시 시도. 로그아웃·비밀번호 재설정 시 저장 토큰 삭제
- 401이면 `httpClient`가 `/auth/refresh`를 한 곳에서 한 번만 보내 갱신 (자동 로그인도 같은 함수)
- 테스트: keychain은 `__mocks__/react-native-keychain.js`(메모리), `test-utils`가 테스트마다 비움. 로그인 상태로 시작하려면 `services.tokens.set(login.tokens)` 후 `renderApp()`, 앱 재시작은 `closeApp()`
- 개발 옵션 (services/index.ts): 권한 `DEV_PERMISSION_SCENARIO = "deny"`로 거부 흐름, 모델 `failFirstAttemptAt`로 다운로드 실패, 네트워크 `"cellular"`
- **연락 데이터는 기기 알림(로컬 DB)**: `services/conversation/deviceConversationService.ts`가 Kotlin 알림 수집 모듈(#42)의 메시지로 연락 목록·상세를 만듦. 네이티브 모듈이 없으면(Jest) mock을 씀. 화면만 작업하면서 예시 대화를 보려면 `services/index.ts`의 `USE_DEVICE_CONVERSATIONS = false` (커밋 전에 되돌리기)
  - 목록 분석(질문·멘션·답장 필요)은 기기 안 규칙만. **AI는 대화방을 열 때 그 방 하나만 한 번** 부르고 결과를 저장해 답장 화면에서 다시 씀. 기관·번호 발신자, 안내 문구(`isPlaceholder`)만 있는 대화는 보내지 않음
  - 기기에 데이터를 쌓으려면 개발용 `NotificationDebug` 화면에서 알림 접근 허용 + 수집 앱 선택
- 연락 mock (`services/conversation`): 목록 `{ empty: true }` / `{ failList: true }`, 메신저 `createMockMessengerService({ directReplyIds, failSend })`. 바로 답장 가능한 대화는 `mockConversationData.ts`의 `DIRECT_REPLY_IDS` (하늘·대학교 친구들은 불가)
- mock 저장소는 메모리라 앱을 완전히 끄면 진행 상황·mock 회원이 초기화됨 (자동 로그인은 테스트 계정만 복구, 새로 가입한 mock 계정은 로그인 화면으로)
- 서버·외부 AI로 보내는 대화는 반드시 `maskPii`를 거친 `text`만 보냄. `mapping`(자리표시↔원래 값)은 기기 밖으로 보내지 않고, 답장은 `unmaskPii`로 되돌림
- AI 답장은 화면에서 `requestAiReply`(src/services/ai)만 부르면 됨: 관계·결정 여부 규칙 판별 → 마스킹 → `services.ai` 호출 → 되돌리기 → `services.aiReplies`에 로컬 저장. 지금 `services.ai`는 mock

## 팀 Git 규칙

- **작업마다 GitHub 이슈가 있어야 함.** Claude는 이슈를 직접 만들지 못하므로, 새 작업을 시작할 때 이슈 제목·내용 초안(`.github/ISSUE_TEMPLATE` 형식)을 쓰고 번호를 물어봄. 팀원이 GitHub에 만들고 번호를 알려 줌
- 브랜치: `feat/#이슈번호-짧은설명` (예: `feat/#27-auth-api`)
- 커밋: `[feat] #이슈번호 내용` (`fix`, `docs`, `refactor`, `test`도 같은 형식)
- PR: 제목 `[feat] #이슈번호 내용`, 본문은 `.github/PULL_REQUEST_TEMPLATE.md` 형식, "관련 이슈"에 `#이슈번호`. 팀원이 GitHub에서 직접 만들 수 있게 Claude가 제목과 본문을 써 줌
- push는 **현재 브랜치만**. main에 push·머지 금지. PR은 팀원 리뷰 후 머지

## 작업 규칙

- 덩어리마다 `yarn typecheck && yarn lint && yarn test` 통과 후 커밋
- 사소한 결정은 원칙대로 정하고 TODO로 남김. 중요한 결정만 모아서 질문
- 테스트: `test-utils/app.tsx` 공통 도구, jest는 안드로이드 플랫폼(`jest.config.js`)이라 하드웨어 뒤로가기 테스트 가능

## 남은 TODO

디자이너 확인 필요
- 연동 앱 아이콘 2x·3x (지금 60px 한 장), 탭바 아이콘 SVG 5개, 홈·탭바 시안
- 07·08 설명 문구 (시안에서 제목과 겹침, 임시 문구)
- 11 AI 메모리 상세 작성 시안 (입력창 + 예시 칩으로 임시)
- Figma와 다르게 간 부분: 온보딩 뒤로가기 화살표 추가, 03 아이콘을 위로, 05 버튼 "다음", 11 버튼 "‘요즘 나의 상태’부터 쓰기", AI 모델 다운로드 화면 추가
- 04 연락: 앱바 햄버거·프로필 생략, "Label" 자리는 화면 이름, ○/● 카드는 `RadioCard`(Card 조합), 09-C는 ○ 3줄+버튼 2개 → 안내 줄 + ○ 2개 + 버튼 1개로 합침, 09-C 질문 있을 때 제목·설명(임시), 10 "복사하고 메신저 열기" 추가, 08 "친구 정보 보기" 텍스트 버튼 추가
- 05 친구: 14 "연결된 계정" 카드(합치기·따로 보기)·얼려두기 버튼, 15 "직접 쓰기" 버튼, 15 두 번째 후보 "연락이 늦었어…" → 사과 없는 문장으로 바꿈, 16(잘린 메시지) "{앱} 열어서 복사하기" 추가, 관계 메모·생일 편집 시안 없음
- 인증(백엔드 기준): 01-3 이메일 칸 도움말 "찾기에 쓰여요", 01-4 아이디 찾기는 이메일만 받고 메일로 아이디(다이얼로그에 아이디 표시 안 함), 01-5 비밀번호 찾기는 임시 비밀번호 대신 코드 + 새 비밀번호 2단계

팀 결정 필요
- 오프라인으로 앱을 켰을 때: 지금은 로그인 화면(저장 토큰은 남김). "다시 시도" 안내를 둘지 (`TODO(디자이너 공유)` in SessionProvider)
- 로그인 `deviceId`(선택)를 보낼지 (기기별 세션 구분)
- 11 예시 칩을 다시 누르면 빠지는 동작이 맞는지
- AI 모델 다운로드 화면(`ModelDownload`)과 `ModelService`: 기기 안 모델을 쓰지 않기로 해서 받을 모델이 없음. 온보딩에서 뺄지
- 얼려둔 관계를 알림·제안(홈 작은 행동 등)에서도 뺄지

기능 추가
- 09 연락처 검색창

네이티브·API 연결
- 권한·연락처·모델 다운로드·클립보드·메신저 열기·바로 답장: Kotlin 모듈로 교체
- 연락: `MessengerService`(복사·앱 열기·`canReplyDirectly`·`sendReply`), 11 다시 볼 때 로컬 알림 예약, 잘린 메시지 클립보드 읽기·공유 인텐트
- 친구: `services.friends`(`FriendService`)를 기기 안 암호화 DB의 person·account로 교체, 15 첫마디 후보는 가린 메모로 외부 AI
- 저장소: 온보딩 진행 상황·AI 답장 결과는 AsyncStorage/암호화 저장소(지금 메모리 `services.storage`), 친구 목록은 기기 안 암호화 DB (로그인 토큰은 keychain 완료)

## 다음 작업

- 완료: **인증 API 연결 + 자동 로그인** `feat/#27-auth-api` (PR #38 리뷰 반영, #37까지 들어간 origin/main 위로 rebase). 실기기 확인: `DEV_API_MODE = "http"` → 앱 재빌드(keychain 네이티브 모듈) → 회원가입 → 앱 껐다 켜서 자동 로그인 → 로그아웃 → 로그인
- 머지됨: **05 친구** 13 목록·14 상세·15 첫마디 + 16 시안을 잘린 메시지 화면에 적용 → `feat/#30-friends` (PR #37)
- 머지됨: 하단 탭바·홈(임시)·04 연락 전체(07·08·09-A·B·C·10·11·12·잘린 메시지) → `feat/#29-contacts` (PR #31)
- 다음 후보: 캘린더·설정 탭 (시안·이슈 확인부터. 이슈 초안을 쓰고 번호를 받은 뒤 브랜치 생성)
- 머지 순서 주의: CLAUDE.md는 브랜치마다 고치므로 뒤에 머지하는 쪽에서 충돌이 날 수 있음 (두 쪽 내용을 합치면 됨)
- 시안: `docs/figma/home` (04 연락은 와이어프레임 → 구조·문구만 따르고 색·컴포넌트는 design-system), `docs/figma/friends` (05 친구 Screens 13~16, 디자인 화면이 기준), `docs/figma/auth` (01 인증)
- 친구 mock: `createMockFriendService({ empty: true })` / `({ failList: true })`. 민지는 카카오톡+인스타그램이 합쳐진 상태, 문자 "김민지"는 합치기 후보, 지연은 얼려둔 관계
