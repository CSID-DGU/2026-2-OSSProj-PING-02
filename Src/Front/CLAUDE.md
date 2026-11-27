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
- #59에서 추가·수정: `TextArea`(field, 라벨·여러 줄 입력·글자 수가 한 상자 안), 글자 토큰 `captionDense`·`titleSubsection`·`bodySmallRelaxed`·`labelField`·`captionChip`, `Switch` 꺼짐 색 `brandBrown`, `ChoiceGroup` chip 모양
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
- 온보딩은 Figma "03 온보딩" 최종 시안(초록 배경) 기준으로 반영 중 (#59, `docs/figma/onboarding`)
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
- 상태(로딩 / 빈 상태 / 오류 / AI 분석 중·분석 실패)는 시안에 있으면 그대로, 없으면 필요한지 먼저 물어봄

## 데이터

- [src/services/index.ts](src/services/index.ts)가 교체 지점: 인터페이스 + mock. 실제 API·네이티브 모듈이 준비되면 여기만 바꿈
- mock 테스트 계정: **아이디 `malssiat` / 비밀번호 `abcd1234`** (이메일 `demo@malssiat.app`), 인증 코드 `123456`
- 인증 API: [src/services/config.ts](src/services/config.ts) 한 곳에서 설정. 모드는 빌드별: **release 빌드는 항상 `http`(실서버)**, 테스트(jest)는 항상 `mock`, debug 빌드는 `DEV_API_MODE`(기본·커밋은 `"mock"`, 실서버로 확인할 때만 `"http"`). 팀 테스트용 APK: `cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` (Metro 없이 실행, debug 키 서명). `baseUrl`은 실서버 `https://malssiat-api.koreacentral.cloudapp.azure.com/v1`. `AUTH_FEATURES`(`emailVerification` false: 백엔드에 없음·화면 숨김 / `accountRecovery` true). 기준 문서는 백엔드 main의 `Doc/API_목록.md`
- **자동 로그인 (팀 확정)**: 토큰은 `services.tokens`(메모리 + react-native-keychain 암호화 저장소, 모드별 service `malssiat.auth.mock|http`). 앱 시작 때 `SessionProvider`가 "loading"으로 시작해 `auth.restoreSession()`(refresh → `GET /users/me`)으로 복구, 저장 토큰이 없거나 실패하면 로그인 화면. 세션 만료(401 등)면 저장 토큰도 지우고, 네트워크 오류면 남겨 다음 실행에서 다시 시도. 로그아웃·비밀번호 재설정 시 저장 토큰 삭제
- 401이면 `httpClient`가 `/auth/refresh`를 한 곳에서 한 번만 보내 갱신 (자동 로그인도 같은 함수)
- 테스트: keychain은 `__mocks__/react-native-keychain.js`(메모리), `test-utils`가 테스트마다 비움. 로그인 상태로 시작하려면 `services.tokens.set(login.tokens)` 후 `renderApp()`, 앱 재시작은 `closeApp()`
- 개발 옵션 (services/index.ts): 권한 `DEV_PERMISSION_SCENARIO = "deny"`로 거부 흐름, 네트워크 `"none"`(오프라인이면 AI 답장을 부르지 않음)
- 온보딩 단계는 `constants/onboarding.ts`의 `ONBOARDING_STEPS`. 없어진 단계(#59: `ModelDownload`·`BatteryOptimization`)가 저장돼 있으면 `resolveSavedStep`이 그다음 단계로 이어 줌
- **연락 데이터는 기기 알림(로컬 DB)**: `services/conversation/deviceConversationService.ts`가 Kotlin 알림 수집 모듈(#42)의 메시지로 연락 목록·상세를 만듦. 네이티브 모듈이 없으면(Jest) mock을 씀. 화면만 작업하면서 예시 대화를 보려면 `services/index.ts`의 `USE_DEVICE_CONVERSATIONS = false` (커밋 전에 되돌리기)
  - 목록 분석(질문·멘션·답장 필요)은 기기 안 규칙만. **AI는 대화방을 열 때 그 방 하나만 한 번** 부르고 결과를 저장해 답장 화면에서 다시 씀. 기관·번호 발신자, 안내 문구(`isPlaceholder`)만 있는 대화는 보내지 않음
  - **자동 갱신 (#71)**: 알림 리스너가 새 메시지를 저장하면 `NotificationEvents` → `NotificationStoreModule`이 JS 이벤트(`malssiat.notificationsSaved`, 내용 없음)를 보냄 → `ConversationService.onChange` → `useConversations`가 화면이 보이는 동안 0.5초 안의 이벤트를 묶어 다시 읽음. 앱이 앞으로 올 때도 다시 읽음. 로딩 표시 없이 내용만 바뀌고 AI는 부르지 않음. 연락 탭 목록은 `maintainVisibleContentPosition`으로 보던 자리 유지. 당겨서 새로고침은 없음
  - **알림 수집 켜기 (#83)**: 알림 리스너는 알림 접근 허용 + 수집 앱 목록(`services.collection`, 네이티브 `MonitoredAppsStore`)에 있는 앱만 저장. 온보딩 04가 알림 접근 설정을 실제로 열고(`devicePermissionService`의 `notificationListener`), 05 연동 앱이 수집 목록이 됨(`collectPackagesFor`, 문자는 삼성·Google 메시지 둘 다). `OnboardingProvider`가 진행 상황을 읽을 때·연동 앱을 바꿀 때 맞추고(연동 앱이 비면 그대로), 로그인하지 않은 상태면 비움(쌓인 알림은 그대로). 개발용 `NotificationDebug` 화면에서 직접 바꿀 수도 있음(다음 로그인 때 연동 앱 기준으로 다시 맞춰짐)
  - 알림 DB는 SQLCipher로 암호화돼 있음 (암호는 Android Keystore로 감싸 보관, 예전 평문 DB는 처음 열 때 옮김). DB는 다시 열 수 없는 게 확실할 때(키 없음·영구 무효·AEADBadTag, SQLITE_NOTADB·CORRUPT)만 지우고, 일시적인 실패는 지우지 않고 다시 시도. 메시지는 보관 기간(기본 30일)이 지나면 지움 → `NotificationStore.get/setRetentionDays`. 자세한 내용은 README "알림 수집"
- **복사하고 메신저 열기 (#69)**: `services.messenger`는 Kotlin `Messenger` 모듈(`android/.../messenger/MessengerModule.kt`, JS `src/native/Messenger.ts`) 위의 `deviceMessengerService`. 네이티브 모듈이 없으면(Jest) mock
  - 복사는 `ClipboardManager`(라이브러리 없음). 앱 열기 순서: 알림에 담긴 동작으로 그 대화방(`ConversationIntents`, 메모리에만, 앱 재시작하면 남은 알림으로 다시 채움) → 알림 보낸 앱 첫 화면 → (첫마디) 문자는 기본 문자 앱, 나머지는 `LINKED_APP_OPTIONS` 패키지. 못 열면 `APP_NOT_INSTALLED`
  - 복사가 되면 앱이 안 열려도 "복사했어요" 안내를 보여 줌. 바로 답장(RemoteInput)은 아직 없음 → `canReplyDirectly`는 `false`
- AI 마스킹 이름: `services.maskNames`(로그인한 사용자 이름 + 성 뺀 이름, `SessionProvider`가 로그인·로그아웃 때 바꿈)를 `getMaskNames`로 넘김. 친구 이름은 연락처 연동(#70) 뒤
- 연락 mock (`services/conversation`): 목록 `{ empty: true }` / `{ failList: true }`, 메신저 `createMockMessengerService({ directReplyIds, failSend })`. 바로 답장 가능한 대화는 `mockConversationData.ts`의 `DIRECT_REPLY_IDS` (하늘·대학교 친구들은 불가)
- **기기 저장소 (앱을 껐다 켜도 남음)**: `services.storage`는 keychain 암호화 저장소(`storage/secureKeyValueStorage.ts`, 키마다 한 칸, 모드별 `malssiat.kv.mock|http.<키>`). 새 패키지·네이티브 빌드 없음
  - 온보딩 진행 상황·선택 값(연동 앱·받을 알림·친구·AI 메모리): `services.storage`에 사용자 id를 붙인 키 (`OnboardingProvider`)
  - 연락 상태(답장함·확인함·나중에 답하기)·AI 답장 결과: `services.userStorage`(사용자별로 나눔). `SessionProvider`가 세션을 바꿀 때 `setUserId`로 사용자를 지정, 로그인 전·로그아웃 뒤에는 읽어도 없고 쓰기는 버림
  - 로그아웃해도 지우지 않음 (같은 계정으로 다시 로그인하면 이어서 씀)
  - **칸(키)마다 Keystore 키가 따로 생김** → 키 이름에 대화방 id처럼 늘어나는 값을 넣지 말고 칸 하나에 묶음. AI 답장은 사용자당 `malssiat.aiReplies` 한 칸(30일·대화방당 5개·전체 100개, 예전 대화방별 칸은 처음 읽을 때 옮기고 지움). #47(SQLCipher 알림 DB)이 머지되면 그 DB로 옮김 (`AiReplyStore.ts` TODO)
  - 온보딩 진행 상황을 못 읽으면 다시 시도(0.5·1.5·3초), 그래도 못 읽으면 저장하지 않음 (저장된 완료 상태를 덮어쓰지 않게)
- mock 회원·친구 편집 등 mock 서비스 안의 데이터는 여전히 메모리라 앱을 완전히 끄면 초기화됨 (자동 로그인은 테스트 계정만 복구, 새로 가입한 mock 계정은 로그인 화면으로)
- 서버·외부 AI로 보내는 대화는 반드시 `maskPii`를 거친 `text`만 보냄. `mapping`(자리표시↔원래 값)은 기기 밖으로 보내지 않고, 답장은 `unmaskPii`로 되돌림
- **기기 연락처 (#70)**: `services.contacts`는 Kotlin `Contacts` 모듈(`android/.../contacts/ContactsModule.kt`, JS `src/native/Contacts.ts`)로 `ContactsContract`에서 id·이름·전화번호만 읽음(대표 번호 하나, 가나다순). 네이티브 모듈이 없으면(Jest) mock 42명. 연락처와 고른 친구는 기기에만 두고 서버로 보내지 않음
  - 권한: `services.permission`은 연락처(`READ_CONTACTS`)가 실제(`devicePermissionService`, RN `PermissionsAndroid` + `Linking.openSettings`), 알림 접근은 #83에서 실제(`NotificationStore` 설정 화면), 앱 알림은 아직 mock. "다시 묻지 않음"은 요청 결과로만 알 수 있어 켜질 때까지 `blocked`로 기억
- AI 답장은 화면에서 `requestAiReply`(src/services/ai)만 부르면 됨: 관계 규칙 판별 → 마스킹 → `services.ai` 호출 → 되돌리기 → `services.aiReplies`에 로컬 저장. `services.ai`는 API 모드가 `http`면 실서버(`createHttpAiReplyService`, 인증과 같은 `httpClient`로 토큰 갱신), 아니면 mock
  - **결정 여부는 AI가 판단**: 응답의 `needsDecision`이 true면 답장 9개(입장 `ACCEPT/HOLD/DECLINE` × 말투 `SHORT/WARM/POLITE`), false면 말투 3개. AI 결과가 있으면 그 판단으로 `question` 태그를 정해 답장 화면 갈래(09-A 입장 먼저 / 09-B 말투 바로)가 AI를 따름. 목록처럼 AI 결과가 없을 때만 기기 규칙(`classifyNeedsDecision`)
  - **갈래가 엇갈리면 (#81)**: AI 분석 전에 기기 규칙으로 들어간 화면과 AI 판단이 다르면 `getReplyCandidates`가 `REPLY_STEP_MISMATCH`를 던지고, `ReplyStance`/`ReplyTone`이 `navigation.replace`로 반대쪽 화면으로 감(뒤로가기는 이전 화면). 단톡(`ReplyGroup`)은 분석 전에도 "답장 만들기"를 누를 수 있어 이 경로로 처리
  - **응답 형식 검사 (#81)**: `parseAiReplyResponse`가 9개(입장×말투 빠짐·겹침 없이)/3개(입장 없음)와 빈 문장을 확인. 서버 응답이 JSON이 아니거나 틀리면 저장하지 않고 `AI_RESPONSE_INVALID`. 예전 형식(`label`)으로 저장된 결과는 없는 것으로 보고 다시 받음. AI 요청의 401 갱신은 `httpClient.refreshAfterUnauthorized`(이미 갱신됐으면 다시 갱신하지 않음)

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
  - 스위치 켜짐 #F7D876 = `brandSeed`(seed300), 꺼짐 #644B40 = `brandBrown`(brown600) (#59에서 시안이 생겨 회색 → 갈색, core 수정)
  - 밑줄 탭 바탕선 ≈#F3EEEB → `borderDefault`(neutral200), 선택 밑줄 ≈#3A2B27 → `textPrimary`, 시트 손잡이 → `borderDefault`
- #44 달력 날짜 칸은 시안대로 세로 32(선택 원 지름 32). 줄이 붙어 있어 터치 영역은 세로 약 36dp(줄 간격 절반씩 `hitSlop`)로 48dp 미만, 디자이너 요청으로 시안 우선
- #44 Figma와 다르게 간 부분: 시간 드롭다운 폭 88→148dp("오전 10시 30분"), 시간 칩은 알약 대신 `ChoiceGroup` option 모양, 🔔 SVG 없음(임시 `BellIcon`), 상세 화면 앱바 제목은 지금처럼 왼쪽 정렬(시안은 가운데), 알림 센터 시안 없음
- 연동 앱 아이콘 2x·3x (지금 60px 한 장), 탭바 아이콘 SVG 5개, 홈·탭바 시안
- Figma와 다르게 간 부분: 온보딩 뒤로가기 화살표 추가, 04 "나중에 할게요"·권한 안내 상자 유지 (05 버튼 "다음"은 디자이너 확인 완료, #59)
- #59 Figma와 다르게 간 부분 (PR 본문에 적기): 11 "먼저 꺼내지 않을 이야기" 칩은 상자 폭에 맞춰 자연스럽게 줄바꿈 (시안은 첫 줄 5개, 앱은 화면 폭에 따라 6~7개), 06 "전체 알림"은 항목이 모두 켜져 있으면 켜짐으로 표시 (시안은 꺼짐 모양), 06-1은 안드로이드 시스템 팝업이라 시안 문구·모양을 쓸 수 없음
- 에뮬레이터 비교 주의: `adb shell wm density`로 밀도를 바꾼 채 오래 쓰면 Android 17 에뮬레이터에서 Modal(바텀시트·팝업) 창이 화면에 안 올라오고 터치만 받음 (#59에서 11-1이 안 보인 원인). 이상하면 `wm density reset` 후 에뮬레이터를 cold boot
- #59 공통 칩(`ChoiceGroup` chip)을 온보딩 11·02-4 시안 값으로 바꿈 (높이 28 · 바탕 seed100 · 테두리 brown700 · 가로 3 세로 4 · 글자 `captionChip` 10/13.5). 연락 말투·미루기·필터 칩도 같이 바뀜. 터치 영역은 세로로만 48dp
- #59 글자 크기는 PNG로 재지 말고 Figma 텍스트 스타일 이름으로 확인 (06·10·11·12 반영 완료)
- 04 연락: 앱바 햄버거·프로필 생략, "Label" 자리는 화면 이름, ○/● 카드는 `RadioCard`(Card 조합), 09-C는 ○ 3줄+버튼 2개 → 안내 줄 + ○ 2개 + 버튼 1개로 합침, 09-C 질문 있을 때 제목·설명(임시), 10 "복사하고 메신저 열기" 추가, 08 "친구 정보 보기" 텍스트 버튼 추가
- 05 친구: 14 "연결된 계정" 카드(합치기·따로 보기)·얼려두기 버튼, 15 "직접 쓰기" 버튼, 15 두 번째 후보 "연락이 늦었어…" → 사과 없는 문장으로 바꿈, 16(잘린 메시지) "{앱} 열어서 복사하기" 추가, 관계 메모·생일 편집 시안 없음
- 인증(백엔드 기준): 01-3 이메일 칸 도움말 "찾기에 쓰여요", 01-4 아이디 찾기는 이메일만 받고 메일로 아이디(다이얼로그에 아이디 표시 안 함), 01-5 비밀번호 찾기는 임시 비밀번호 대신 코드 + 새 비밀번호 2단계

팀 결정 필요
- 오프라인으로 앱을 켰을 때: 지금은 로그인 화면(저장 토큰은 남김). "다시 시도" 안내를 둘지 (`TODO(디자이너 공유)` in SessionProvider)
- 로그인 `deviceId`(선택)를 보낼지 (기기별 세션 구분)
- 얼려둔 관계를 알림·제안(홈 작은 행동 등)에서도 뺄지
- 알림 메시지 기본 보관 기간 (지금 30일, `NotificationRetention.DEFAULT_DAYS`)과 설정 화면에서 바꿀 수 있게 할지
- 단톡 AI 요약: 지금은 1:1처럼 방을 열면 자동으로 보냄. "요약하기 버튼을 누를 때만" 제안(PR #43 리뷰)은 보류 (버튼 시안도 없음)

기능 추가
- 09 연락처 검색창

네이티브·API 연결
- 권한(앱 알림)·바로 답장: Kotlin 모듈로 교체 (클립보드·메신저 열기는 #69, 연락처·연락처 권한은 #70, 알림 접근·수집 앱 목록은 #83에서 구현. 모델 다운로드·배터리 최적화는 #59에서 온보딩에서 뺌)
- 연락: `MessengerService`의 `canReplyDirectly`·`sendReply`(바로 답장, 정책 확인 후), 11 다시 볼 때 로컬 알림 예약, 잘린 메시지 클립보드 읽기·공유 인텐트
- 친구: `services.friends`(`FriendService`)를 기기 안 암호화 DB의 person·account로 교체, 15 첫마디 후보는 가린 메모로 외부 AI
- 저장소: 친구 목록·대화 상태가 커지면 기기 안 암호화 DB로 (로그인 토큰·온보딩·연락 상태·AI 답장은 keychain 완료)

## 다음 작업

- 진행: **온보딩 07~09 연락처** `feat/#59-onboarding-contacts` (worktree `C:\dev\ping-59`). 07 연락처 책 그림·08 불러오는 중(막대가 천천히 차다가 다 받으면 꽉 채우고 09, 실패하면 이 화면에 Notice + 다시 불러오기, 실패 때만 화살표)·09 친구 선택(검색은 목록만 거름, 전체 선택은 전체 기준, 0명이면 저장 비활성 + 아래 건너뛰기, 연락처가 없으면 예전 안내 유지). 아이콘(`SearchIcon`·`AvatarDefaultIcon` 등 6개)·`FriendAvatar`는 #79와 같은 코드. 남은 것: 실기기 APK로 시안 비교
- 머지됨: **온보딩 최종 시안 반영 + AI 모델·배터리 단계 제거** `feat/#59-onboarding` (PR #76, squash). 03·04·05·06·06-1·10·11·11-1·12. 11은 공통 `TextArea`(core/ui/field) 사용, 칩은 여러 개 선택 + "직접 입력"을 고르면 입력칸, 비어 있으면 저장하기도 11-1 시트
- 진행: **공통 컴포넌트 + 탭 안 스택** `feat/#44-common` (시안: Figma "05 연락 Screens", "06 친구 Screens"). 다음은 새 컴포넌트로 연락·친구 새 시안 화면 반영
- 대기: `feat/#45-real-server` (서버 확인 대기, 건드리지 않음)

- 완료: **인증 API 연결 + 자동 로그인** `feat/#27-auth-api` (PR #38 리뷰 반영, #37까지 들어간 origin/main 위로 rebase). 실기기 확인: `DEV_API_MODE = "http"` → 앱 재빌드(keychain 네이티브 모듈) → 회원가입 → 앱 껐다 켜서 자동 로그인 → 로그아웃 → 로그인
- 머지됨: **05 친구** 13 목록·14 상세·15 첫마디 + 16 시안을 잘린 메시지 화면에 적용 → `feat/#30-friends` (PR #37)
- 머지됨: 하단 탭바·홈(임시)·04 연락 전체(07·08·09-A·B·C·10·11·12·잘린 메시지) → `feat/#29-contacts` (PR #31)
- 다음 후보: 캘린더·설정 탭 (시안·이슈 확인부터. 이슈 초안을 쓰고 번호를 받은 뒤 브랜치 생성)
- 머지 순서 주의: CLAUDE.md는 브랜치마다 고치므로 뒤에 머지하는 쪽에서 충돌이 날 수 있음 (두 쪽 내용을 합치면 됨)
- 시안: `docs/figma/home` (04 연락은 와이어프레임 → 구조·문구만 따르고 색·컴포넌트는 design-system), `docs/figma/friends` (05 친구 Screens 13~16, 디자인 화면이 기준), `docs/figma/auth` (01 인증)
- 친구 mock: `createMockFriendService({ empty: true })` / `({ failList: true })`. 민지는 카카오톡+인스타그램이 합쳐진 상태, 문자 "김민지"는 합치기 후보, 지연은 얼려둔 관계
