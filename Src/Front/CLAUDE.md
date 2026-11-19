# 말씨앗 Front 작업 안내

새 대화(Claude)와 팀원이 같이 보는 요약입니다. 실행 방법은 [README.md](README.md)를 보세요.

## 프로젝트

- **말씨앗**: 고립·은둔 청년의 연락 부담을 덜어 주는 안드로이드 앱. 알림으로 받은 메시지를 정리하고 답장 후보를 제안합니다.
- **스택**: React Native 0.88 + TypeScript, styled-components, React Navigation(native-stack), 시스템 기능은 Kotlin 네이티브 모듈(예정)
- **AI 구조**: 원문은 기기에만 저장 → **기기 안 소형 모델**이 이름·전화번호 같은 민감한 내용을 먼저 가림 → **가린 내용만 중간 서버를 거쳐 외부 AI**로. 서버는 원문을 저장하지 않음

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
- 개발 옵션 (services/index.ts): 권한 `DEV_PERMISSION_SCENARIO = "deny"`로 거부 흐름, 모델 `failFirstAttemptAt`로 다운로드 실패, 네트워크 `"cellular"`
- 연락 mock (`services/conversation`): 목록 `{ empty: true }` / `{ failList: true }`, 메신저 `createMockMessengerService({ directReplyIds, failSend })`. 바로 답장 가능한 대화는 `mockConversationData.ts`의 `DIRECT_REPLY_IDS` (하늘·대학교 친구들은 불가)
- mock 저장소는 메모리라 앱을 완전히 끄면 로그인·진행 상황이 초기화됨

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
- 04 연락: 앱바 햄버거·프로필 생략, "Label" 자리는 화면 이름, ○/● 카드는 `RadioCard`(Card 조합), 09-C는 ○ 3줄+버튼 2개 → 안내 줄 + ○ 2개 + 버튼 1개로 합침, 09-C 질문 있을 때 제목·설명(임시), 10 "복사하고 메신저 열기" 추가, 잘린 메시지 화면 시안 없음

팀 결정 필요
- 자동 로그인 여부 미확정 (지금은 앱을 끄면 로그아웃, 토큰은 메모리에만)
- 아이디·비밀번호 복구 방식 (백엔드가 이메일을 받지 않아 지금은 없음)
- 11 예시 칩을 다시 누르면 빠지는 동작이 맞는지

기능 추가
- 09 연락처 검색창

네이티브·API 연결
- 권한·연락처·모델 다운로드·클립보드·메신저 열기·바로 답장: Kotlin 모듈로 교체
- 연락: `MessengerService`(복사·앱 열기·`canReplyDirectly`·`sendReply`), 11 다시 볼 때 로컬 알림 예약, 잘린 메시지 클립보드 읽기
- 저장소: AsyncStorage/암호화 저장소, 친구 목록은 기기 안 암호화 DB

## 다음 작업

- **05 친구** (다음 작업): 시안·이슈 확인부터. 이슈 초안을 쓰고 번호를 받은 뒤 브랜치 생성
- 완료: 하단 탭바·홈(임시)·04 연락 전체(07·08·09-A·B·C·10·11·12·잘린 메시지) → `feat/#29-contacts` (PR 리뷰 대기)
- 보류: 인증 API 연결 `feat/#27-auth-api` (백엔드 수정 대기, push 안 함, 마지막 커밋은 작업 중이라 tsc 실패). 재개할 때 main 위로 rebase하면서 CLAUDE.md 규칙 커밋 중복 정리
- 시안: `docs/figma/home` (04 연락은 와이어프레임 → 구조·문구만 따르고 색·컴포넌트는 design-system)
