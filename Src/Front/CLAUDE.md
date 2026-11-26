# 말씨앗 Front 작업 안내

새 대화(Claude)와 팀원이 같이 보는 요약입니다. 실행 방법은 [README.md](README.md)를 보세요.

## 작업 규칙

### [Figma 일치 최우선] (다른 모든 규칙보다 우선)

- 화면은 Figma 초록 배경 프레임과 똑같이 만드는 게 1순위. 배치·문구·크기·색·간격을 시안 그대로.
- 아래 경우엔 만들지 말고 멈춘 뒤 먼저 물어볼 것:
  - 시안에 없는 화면·버튼·문구·상태(빈 상태, 오류 등)를 새로 넣어야 할 때
  - 시안과 다르게 만들어야 할 때(48dp, 글자 잘림, 토큰에 없는 색 등 이유가 있어도)
  - 시안이 미완성이거나 서로 다른 버전이 있어 어느 쪽인지 애매할 때
  - 기능·흐름을 정해야 할 때(버튼 누르면 어디로 가는지 등)
- 물어볼 때는 한 번에 모아서, 각 항목마다 "시안 상태 / 내 제안 / 선택지"로.
- 덩어리(화면 1~2개) 끝날 때마다 시안과 나란히 비교한 결과를 보고하고 확인받은 뒤 다음으로.
- 시안에 없는 걸 임의로 만들어 둔 곳은 없어야 함. 이미 있는 건 보고만 하고 지우지 말 것.

### 그 밖의 작업 규칙

- 덩어리마다 `yarn typecheck && yarn lint && yarn test` 통과 후 커밋
- 테스트: `test-utils/app.tsx` 공통 도구, jest는 안드로이드 플랫폼(`jest.config.js`)이라 하드웨어 뒤로가기 테스트 가능

## 프로젝트

- **말씨앗**: 고립·은둔 청년의 연락 부담을 덜어 주는 안드로이드 앱. 알림으로 받은 메시지를 정리하고 답장 후보를 제안합니다.
- **스택**: React Native 0.88 + TypeScript, styled-components, React Navigation(native-stack), 시스템 기능은 Kotlin 네이티브 모듈(예정)
- **AI 구조**: 원문은 기기에만 저장 → 기기에서 **규칙 기반 마스킹**([src/utils/masking](src/utils/masking/README.md), 정규식 + 사용자·친구 이름 목록)으로 이름·전화번호 같은 민감한 내용을 먼저 가림 → **가린 내용만 중간 서버를 거쳐 외부 AI**(OpenRouter의 데이터 미보관(ZDR) 모델)로. 서버는 원문을 저장하지 않음. 기기 안 AI 모델은 쓰지 않음

## 디자인 규칙

- 색·글자: [UI/docs/design-system.md](../../UI/docs/design-system.md) 토큰(`theme.colors`, `theme.fonts`)만. hex·폰트 크기 직접 입력 금지
- 컴포넌트: `@core/ui` 공통 컴포넌트만. 비슷한 컴포넌트를 화면 폴더에 새로 만들지 말고 **조합**으로 해결
- `@core/ui`에 **새 공통 컴포넌트 추가는 가능** (공통 컴포넌트 담당 팀원 허락, #44). 여러 화면에서 쓰는 것만, 폴더 하나 + `index.ts` + `core/index.ts` export + Playground 예시 + `__tests__/CommonUi.test.tsx`
- **기존** `src/core` 컴포넌트는 최소한으로만 수정. 예외: 터치 영역 48dp용 `hitSlop`(Header·ChoiceGroup·Checkbox·Dialog·Button(text)·Select), 아이콘 등록
- #44에서 추가: `BottomSheet`·`BottomSheetActions`(sheet), `Toast`·`ToastProvider`·`useToast`(toast, App에 Provider 있음), `Switch`·`SwitchRow`(switch), `UnderlineTabs`(tabs, `scrollable`), `Calendar`·`TimeSelect`·`DateTimeSheet`·날짜 도우미(calendar, 패키지 없이 구현), `FooterLayout`(layout, 목록 + 아래 고정 버튼), 아이콘 `ChevronRightIcon`·`BellIcon`
- 아이콘: `UI/assets/icons/ui` SVG를 `@core/ui/icon`에 등록해서 사용
- 토큰에 없는 Figma 색은 쓰기 전에 "시안 색 / 가장 가까운 토큰" 후보를 보여주고 물어봄 (새 토큰 추가 금지)

## Figma 사용법

- 기준 우선순위: **디자인 화면**(02 Auth, 03 Onboarding, 04 연락, 05 친구 등) > **통합본 와이어프레임**(01 Wireframes, 초안)
- 디자인 화면이 없는 기능(홈, 설정, 캘린더 등)만 통합본을 흐름·구성 참고용으로 쓰고, 스타일은 design-system 기준
- 통합본과 백엔드가 다르면 **백엔드 기준**
- 온보딩은 현재 구현 유지. 디자이너 수정본이 나오면 마지막에 반영
- Figma 시안은 각자 PC에서 내보내서 `docs/figma/<영역>/*.png`(gitignore)에 넣어 사용. 이름은 `번호_이름.png`
- 한 페이지에 여러 버전이 있으면 **초록 배경 프레임이 최종본**
- PNG는 2x(720×1600) → **수치를 2로 나눠** dp로 읽기
- Figma에 없는 상태(권한 거부·설정 복귀·로딩·오류·빈 상태)는 먼저 제안하고 물어본 뒤, 확인받으면 **부드러운 안내 상자(Notice) + 텍스트 버튼**으로
- Figma와 다르게 가야 하면 만들기 전에 먼저 물어봄. 확인받고 다르게 만든 곳만 코드에 `TODO(디자이너 공유)` / `TODO(Figma 문구 확인)`으로 남김

## 화면 이동 구조 (#44)

- Root stack(`routes/router.tsx`): 인증 / 온보딩 / `Home`(하단 탭) / 개발용. 타입은 `routes/types.ts`
- `Home` = `@react-navigation/bottom-tabs`(7.21, JS만이라 네이티브 재빌드 불필요) + 기존 `TabBar` 디자인(`tabBar` 옵션). 탭 이름 = `MainTabKey`
- **탭마다 스택**(`routes/tabStacks.tsx`): 그 탭 첫 화면(`HomeMain` 등) + 공통 상세 화면(연락·친구·`Notifications`). 상세는 **지금 있는 탭 안에** 쌓여서 탭바가 계속 보임
- 새 상세 화면은 `TabStackParamList` + `createTabStack`에 추가. `RouteProp<AppParamList, "...">`
- 목록으로 돌아가기는 `navigation.popToTop()` (예전 `popTo("Home")` 대신). 다른 탭으로: `navigate("Home", { screen: "contacts" })`. 로그아웃처럼 앱 전체를 바꿀 때는 `getRootNavigation(navigation).reset(...)`
- 뒤로가기: 탭 안 스택 → 홈이 아닌 탭이면 홈 탭(`backBehavior="initialRoute"`) → 앱 종료. 선택된 탭을 다시 누르면 그 탭 첫 화면으로. 키보드가 올라오면 탭바 숨김
- 앱바 오른쪽 🔔(`NotificationBell`): 탭 첫 화면(`TabScreen`)과 탭 안 `AuthLayout` 화면에 자동으로 붙음. 알림 센터는 자리만
- 탭 안 `AuthLayout`은 아래 안전 영역을 빼고(탭바가 맡음) 버튼 아래 여백 12dp

## UX 원칙

- 압박하지 않는 문구 ("N일째 답장 안 함" 금지, 미뤄도 괜찮다는 톤, 선택권 강조)
- **자동 전송 없음**. 바로 보내기는 **확인 팝업 필수**
- 터치 영역 48dp 이상, 접근성 라벨, 선택·오류 상태는 색만으로 구분하지 않음
- 보이는 뒤로가기(온보딩도 왼쪽 위 화살표) + 안드로이드 뒤로가기가 같은 동작
- 상태(로딩 / 빈 상태 / 오류 / AI 분석 중·모델 미준비·분석 실패)는 시안에 있으면 그대로, 없으면 필요한지 먼저 물어봄

## 데이터

- [src/services/index.ts](src/services/index.ts)가 교체 지점: 인터페이스 + mock. 실제 API·네이티브 모듈이 준비되면 여기만 바꿈
- mock 테스트 계정: **아이디 `malssiat` / 비밀번호 `abcd1234`** (이메일 `demo@malssiat.app`), 인증 코드 `123456`
- 인증 API: [src/services/config.ts](src/services/config.ts) 한 곳에서 설정. 모드는 빌드별: **release 빌드는 항상 `http`(실서버)**, 테스트(jest)는 항상 `mock`, debug 빌드는 `DEV_API_MODE`(기본·커밋은 `"mock"`, 실서버로 확인할 때만 `"http"`). 팀 테스트용 APK: `cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` (Metro 없이 실행, debug 키 서명). `baseUrl`은 실서버 `https://malssiat-api.koreacentral.cloudapp.azure.com/v1`. `AUTH_FEATURES`(`emailVerification` false: 백엔드에 없음·화면 숨김 / `accountRecovery` true). 기준 문서는 백엔드 main의 `Doc/API_목록.md`
- **자동 로그인 (팀 확정)**: 토큰은 `services.tokens`(메모리 + react-native-keychain 암호화 저장소, 모드별 service `malssiat.auth.mock|http`). 앱 시작 때 `SessionProvider`가 "loading"으로 시작해 `auth.restoreSession()`(refresh → `GET /users/me`)으로 복구, 저장 토큰이 없거나 실패하면 로그인 화면. 세션 만료(401 등)면 저장 토큰도 지우고, 네트워크 오류면 남겨 다음 실행에서 다시 시도. 로그아웃·비밀번호 재설정 시 저장 토큰 삭제
- 401이면 `httpClient`가 `/auth/refresh`를 한 곳에서 한 번만 보내 갱신 (자동 로그인도 같은 함수)
- 테스트: keychain은 `__mocks__/react-native-keychain.js`(메모리), `test-utils`가 테스트마다 비움. 로그인 상태로 시작하려면 `services.tokens.set(login.tokens)` 후 `renderApp()`, 앱 재시작은 `closeApp()`
- 개발 옵션 (services/index.ts): 권한 `DEV_PERMISSION_SCENARIO = "deny"`로 거부 흐름, 모델 `failFirstAttemptAt`로 다운로드 실패, 네트워크 `"cellular"`
- **연락 데이터는 기기 알림(로컬 DB)**: `services/conversation/deviceConversationService.ts`가 Kotlin 알림 수집 모듈(#42)의 메시지로 연락 목록·상세를 만듦. 네이티브 모듈이 없으면(Jest) mock을 씀. 화면만 작업하면서 예시 대화를 보려면 `services/index.ts`의 `USE_DEVICE_CONVERSATIONS = false` (커밋 전에 되돌리기)
  - 목록 분석(질문·멘션·답장 필요)은 기기 안 규칙만. **AI는 대화방을 열 때 그 방 하나만 한 번** 부르고 결과를 저장해 답장 화면에서 다시 씀. 기관·번호 발신자, 안내 문구(`isPlaceholder`)만 있는 대화는 보내지 않음
  - 기기에 데이터를 쌓으려면 개발용 `NotificationDebug` 화면에서 알림 접근 허용 + 수집 앱 선택
  - 알림 DB는 SQLCipher로 암호화돼 있음 (암호는 Android Keystore로 감싸 보관, 예전 평문 DB는 처음 열 때 옮김). DB는 다시 열 수 없는 게 확실할 때(키 없음·영구 무효·AEADBadTag, SQLITE_NOTADB·CORRUPT)만 지우고, 일시적인 실패는 지우지 않고 다시 시도. 메시지는 보관 기간(기본 30일)이 지나면 지움 → `NotificationStore.get/setRetentionDays`. 자세한 내용은 README "알림 수집"
- 연락 mock (`services/conversation`): 목록 `{ empty: true }` / `{ failList: true }`, 메신저 `createMockMessengerService({ directReplyIds, failSend })`. 바로 답장 가능한 대화는 `mockConversationData.ts`의 `DIRECT_REPLY_IDS` (하늘·대학교 친구들은 불가)
- **기기 저장소 (앱을 껐다 켜도 남음)**: `services.storage`는 keychain 암호화 저장소(`storage/secureKeyValueStorage.ts`, 키마다 한 칸, 모드별 `malssiat.kv.mock|http.<키>`). 새 패키지·네이티브 빌드 없음
  - 온보딩 진행 상황·선택 값(연동 앱·받을 알림·친구·AI 메모리): `services.storage`에 사용자 id를 붙인 키 (`OnboardingProvider`)
  - 연락 상태(답장함·확인함·나중에 답하기)·AI 답장 결과: `services.userStorage`(사용자별로 나눔). `SessionProvider`가 세션을 바꿀 때 `setUserId`로 사용자를 지정, 로그인 전·로그아웃 뒤에는 읽어도 없고 쓰기는 버림
  - 로그아웃해도 지우지 않음 (같은 계정으로 다시 로그인하면 이어서 씀)
  - **칸(키)마다 Keystore 키가 따로 생김** → 키 이름에 대화방 id처럼 늘어나는 값을 넣지 말고 칸 하나에 묶음. AI 답장은 사용자당 `malssiat.aiReplies` 한 칸(30일·대화방당 5개·전체 100개, 예전 대화방별 칸은 처음 읽을 때 옮기고 지움). #47(SQLCipher 알림 DB)이 머지되면 그 DB로 옮김 (`AiReplyStore.ts` TODO)
  - 온보딩 진행 상황을 못 읽으면 다시 시도(0.5·1.5·3초), 그래도 못 읽으면 저장하지 않음 (저장된 완료 상태를 덮어쓰지 않게)
- mock 회원·친구 편집 등 mock 서비스 안의 데이터는 여전히 메모리라 앱을 완전히 끄면 초기화됨 (자동 로그인은 테스트 계정만 복구, 새로 가입한 mock 계정은 로그인 화면으로)
- 서버·외부 AI로 보내는 대화는 반드시 `maskPii`를 거친 `text`만 보냄. `mapping`(자리표시↔원래 값)은 기기 밖으로 보내지 않고, 답장은 `unmaskPii`로 되돌림
- AI 답장은 화면에서 `requestAiReply`(src/services/ai)만 부르면 됨: 관계·결정 여부 규칙 판별 → 마스킹 → `services.ai` 호출 → 되돌리기 → `services.aiReplies`에 로컬 저장. 지금 `services.ai`는 mock

## 팀 Git 규칙

- **작업마다 GitHub 이슈가 있어야 함.** Claude는 이슈를 직접 만들지 못하므로, 새 작업을 시작할 때 이슈 제목·내용 초안(`.github/ISSUE_TEMPLATE` 형식)을 쓰고 번호를 물어봄. 팀원이 GitHub에 만들고 번호를 알려 줌
- 브랜치: `feat/#이슈번호-짧은설명` (예: `feat/#27-auth-api`)
- 커밋: `[feat] #이슈번호 내용` (`fix`, `docs`, `refactor`, `test`도 같은 형식)
- PR: 제목 `[feat] #이슈번호 내용`, 본문은 `.github/PULL_REQUEST_TEMPLATE.md` 형식, "관련 이슈"에 `#이슈번호`. 팀원이 GitHub에서 직접 만들 수 있게 Claude가 제목과 본문을 써 줌
- push는 **현재 브랜치만**. main에 push·머지 금지. PR은 팀원 리뷰 후 머지


## 남은 TODO

디자이너 확인 필요
- #44 토큰에 없는 시안 색 → 가까운 토큰으로 대체 (시안 PNG에서 읽은 근사값)
  - 토스트 진한 갈색 #4F3832 → `actionPrimaryBg`(brown700 #4D3932), 체크 원 #7A6560 → `brandBrown`(brown600 #644B40)
  - "연결됨" 연한 초록 칩 바탕 ≈#EEF5EA·글자 ≈#6B9A5B → `feedbackSuccessBg`(green50 #F5F9F2)·`feedbackSuccessText`(green600 #527A40) (화면 구현 때 적용)
  - 원문 말풍선 영역 연한 파랑 ≈#EBF2F9 → `feedbackInfoBg`(info50 #EEF5FA) (화면 구현 때 적용)
  - 스위치 켜짐 ≈#F5D66F → `brandSeed`(seed300), 꺼짐은 시안 없음 → `borderStrong`
  - 밑줄 탭 바탕선 ≈#F3EEEB → `borderDefault`(neutral200), 선택 밑줄 ≈#3A2B27 → `textPrimary`, 시트 손잡이 → `borderDefault`
- #44 달력 날짜 칸은 시안대로 세로 32(선택 원 지름 32). 줄이 붙어 있어 터치 영역은 세로 약 36dp(줄 간격 절반씩 `hitSlop`)로 48dp 미만, 디자이너 요청으로 시안 우선
- #44 Figma와 다르게 간 부분: 시간 드롭다운 폭 88→148dp("오전 10시 30분"), 시간 칩은 알약 대신 `ChoiceGroup` option 모양, 🔔 SVG 없음(임시 `BellIcon`), 상세 화면 앱바 제목은 지금처럼 왼쪽 정렬(시안은 가운데), 알림 센터 시안 없음
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
- 알림 메시지 기본 보관 기간 (지금 30일, `NotificationRetention.DEFAULT_DAYS`)과 설정 화면에서 바꿀 수 있게 할지
- 단톡 AI 요약: 지금은 1:1처럼 방을 열면 자동으로 보냄. "요약하기 버튼을 누를 때만" 제안(PR #43 리뷰)은 보류 (버튼 시안도 없음)

기능 추가
- 09 연락처 검색창

네이티브·API 연결
- 권한·연락처·모델 다운로드·클립보드·메신저 열기·바로 답장: Kotlin 모듈로 교체
- 연락: `MessengerService`(복사·앱 열기·`canReplyDirectly`·`sendReply`), 11 다시 볼 때 로컬 알림 예약, 잘린 메시지 클립보드 읽기·공유 인텐트
- 친구: `services.friends`(`FriendService`)를 기기 안 암호화 DB의 person·account로 교체, 15 첫마디 후보는 가린 메모로 외부 AI
- 저장소: 친구 목록·대화 상태가 커지면 기기 안 암호화 DB로 (로그인 토큰·온보딩·연락 상태·AI 답장은 keychain 완료)

## 다음 작업

- 진행: **공통 컴포넌트 + 탭 안 스택** `feat/#44-common` (시안: Figma "05 연락 Screens", "06 친구 Screens"). 다음은 새 컴포넌트로 연락·친구 새 시안 화면 반영
- 대기: `feat/#45-real-server` (서버 확인 대기, 건드리지 않음)

- 완료: **인증 API 연결 + 자동 로그인** `feat/#27-auth-api` (PR #38 리뷰 반영, #37까지 들어간 origin/main 위로 rebase). 실기기 확인: `DEV_API_MODE = "http"` → 앱 재빌드(keychain 네이티브 모듈) → 회원가입 → 앱 껐다 켜서 자동 로그인 → 로그아웃 → 로그인
- 머지됨: **05 친구** 13 목록·14 상세·15 첫마디 + 16 시안을 잘린 메시지 화면에 적용 → `feat/#30-friends` (PR #37)
- 머지됨: 하단 탭바·홈(임시)·04 연락 전체(07·08·09-A·B·C·10·11·12·잘린 메시지) → `feat/#29-contacts` (PR #31)
- 다음 후보: 캘린더·설정 탭 (시안·이슈 확인부터. 이슈 초안을 쓰고 번호를 받은 뒤 브랜치 생성)
- 머지 순서 주의: CLAUDE.md는 브랜치마다 고치므로 뒤에 머지하는 쪽에서 충돌이 날 수 있음 (두 쪽 내용을 합치면 됨)
- 시안: `docs/figma/home` (04 연락은 와이어프레임 → 구조·문구만 따르고 색·컴포넌트는 design-system), `docs/figma/friends` (05 친구 Screens 13~16, 디자인 화면이 기준), `docs/figma/auth` (01 인증)
- 친구 mock: `createMockFriendService({ empty: true })` / `({ failList: true })`. 민지는 카카오톡+인스타그램이 합쳐진 상태, 문자 "김민지"는 합치기 후보, 지연은 얼려둔 관계
