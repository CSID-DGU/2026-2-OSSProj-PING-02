# 🌱 말씨앗 Front

> 고립·은둔 청년의 연락 부담을 덜어 주는 **안드로이드(갤럭시) 앱**의 프론트엔드입니다.
> 알림으로 받은 메시지를 기기 안에서 요약하고 답장 후보를 제안합니다.

화면은 **React Native**로 만들고, 알림 수집·온디바이스 AI·암호화 DB 같은 시스템 기능은 **Kotlin 네이티브 모듈**로 구현합니다. 기획·설계 문서는 [Doc 폴더](../../Doc)에 있습니다.

| 구분 | 사용 기술 |
|---|---|
| 화면 | React Native 0.88 · TypeScript |
| 스타일 | styled-components (`styled-components/native`) |
| 화면 이동 | React Navigation (native-stack) |
| 네이티브 | Kotlin (`android/`) |
| 패키지 매니저 | Yarn 4 (레포에 포함, 별도 설치 불필요) |
| 테스트 | Jest + react-test-renderer |
| 디자인 | [Figma – OSSP-PING](https://www.figma.com/design/MGVPVLr17JxvhsA6TDXf2N/OSSP-PING) |

> iOS는 대상이 아니라서 `ios/` 폴더가 없습니다.

<br>

## 🚀 처음 세팅하기

처음 한 번만 하면 됩니다.

### 1. 필요한 프로그램 설치

- **Node.js 22.11 이상**: `node -v`로 확인
- **Yarn**: `yarn -v`가 동작하면 됩니다. 없으면 `npm install -g yarn`으로 설치하세요.
  - 전역으로 설치된 버전과 상관없이, `Src/Front/` 안에서는 레포에 포함된 Yarn 4.10.3이 자동으로 쓰입니다.
- **[Android Studio](https://developer.android.com/studio)**: JDK와 Android SDK가 함께 설치됩니다.

> 📱 **안드로이드 폰을 쓰고 있다면 에뮬레이터 없이 폰을 USB로 연결해서 테스트할 수 있습니다.** 맥이 가볍고 실제 기기라 더 정확합니다. 빌드에 필요해서 Android Studio 설치는 그대로 해야 합니다. 방법은 [3. 테스트 기기 준비](#3-테스트-기기-준비)를 참고하세요.

### 2. 환경변수 등록 (macOS)

터미널이 Android Studio 안의 Java와 SDK를 찾을 수 있게 `~/.zshrc` 맨 아래에 추가합니다.

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

저장한 뒤 **터미널을 새로 열거나** `source ~/.zshrc`를 실행하세요.

<details>
<summary>Windows라면</summary>

시스템 환경변수에 아래를 추가하고 터미널을 다시 엽니다.

- `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
- `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
- `Path`에 `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\emulator` 추가

</details>

### 3. 테스트 기기 준비

아래 둘 중 하나만 하면 됩니다.

**A. 안드로이드 폰 연결 (폰이 있다면 추천)**

1. **개발자 옵션 켜기:** 설정 → 휴대전화 정보 → 소프트웨어 정보에서 **빌드번호를 7번** 누릅니다.
   - 갤럭시 기준 경로이며, 다른 제조사 폰은 "빌드번호" 위치만 조금 다릅니다.
2. **USB 디버깅 켜기:** 설정 → 개발자 옵션 → **USB 디버깅**을 켭니다.
3. **연결:** 폰을 USB 케이블로 맥에 연결하고, 폰에 뜨는 **"USB 디버깅을 허용하시겠습니까?"** 에서 **허용**을 누릅니다.
   - 데이터 전송이 되는 케이블이어야 합니다. 충전 전용 케이블은 인식되지 않습니다.
4. **확인:** 터미널에서 `adb devices`를 실행해 기기가 `device`로 보이면 준비 끝입니다.
   - `unauthorized`로 보이면 폰 화면의 허용 팝업을 확인하세요.

> 케이블 없이 하고 싶다면 개발자 옵션의 **무선 디버깅**을 켜고, Android Studio → Device Manager → **Pair Devices Using Wi-Fi**로 연결할 수 있습니다. 맥과 폰이 같은 와이파이에 있어야 합니다.

**B. 에뮬레이터 만들기**

Android Studio → **Device Manager** → **+ (Create Virtual Device)** 에서 Pixel이나 Medium Phone 등 아무 폰이나 골라 만듭니다.

### 4. 의존성 설치

```bash
cd Src/Front
yarn install
```

<br>

## ▶️ 실행하기

1. **기기를 준비합니다.**
   - 폰: USB로 연결합니다 (`adb devices`에서 `device` 확인).
   - 에뮬레이터: Device Manager에서 ▶ 버튼을 누르고 홈 화면이 뜰 때까지 기다리세요.
2. **터미널 1:** Metro(개발 서버)를 켭니다. 켜 둔 채로 개발합니다.
   ```bash
   cd Src/Front && yarn start
   ```
3. **터미널 2:** 앱을 빌드해서 에뮬레이터에 설치합니다.
   ```bash
   cd Src/Front && yarn android
   ```

> 첫 빌드는 Gradle과 라이브러리를 내려받느라 **5~10분** 걸립니다. 두 번째부터는 빠릅니다.

### 코드를 고칠 때마다 다시 빌드해야 하나요?

아니요. 기기(폰 또는 에뮬레이터)와 Metro를 켜 둔 상태에서 `.tsx`, `.ts` 파일을 저장하면 **Fast Refresh**로 1~2초 안에 화면에 반영됩니다. 반영이 안 되면 Metro 터미널에서 `r`을 누르세요.

`yarn android`를 **다시 실행해야 하는 경우**는 아래뿐입니다.
- `android/` 폴더를 수정했을 때 (Kotlin 코드, 매니페스트, 권한)
- 네이티브 코드가 포함된 라이브러리를 추가했을 때
- 폰트 파일을 추가하거나 바꿨을 때

<br>

## 🧰 명령어

`Src/Front/` 폴더에서 실행합니다.

| 명령어 | 설명 |
|---|---|
| `yarn start` | Metro 개발 서버 실행 |
| `yarn android` | 앱 빌드 후 에뮬레이터·폰에 설치 |
| `yarn typecheck` | TypeScript 타입 검사 |
| `yarn lint` | ESLint 검사 |
| `yarn test` | Jest 테스트 실행 |

> PR을 올리기 전에 `yarn typecheck && yarn lint && yarn test`를 한 번 돌려 주세요.

<br>

## 📁 폴더 구조

```
Front/
├── android/                    # 안드로이드 네이티브 (Kotlin)
│   └── app/src/main/
│       ├── java/com/malssiat/  # MainActivity.kt, 네이티브 모듈
│       ├── assets/fonts/       # 앱 폰트 파일 (Pretendard, 조선굴림체)
│       └── AndroidManifest.xml # 권한, 서비스 등록
├── src/
│   ├── App.tsx                 # 앱 진입점 (Provider + Navigation)
│   ├── core/                   # 🎨 공용 디자인 시스템
│   │   ├── styles/             #   colors.ts · fonts.ts · theme.ts
│   │   ├── ui/                 #   공용 UI 컴포넌트 (Button 등)
│   │   └── components/         #   MalssiatProvider
│   ├── routes/router.tsx       # 화면 목록과 이동 설정
│   ├── pages/<도메인>/         # 화면 (Page.tsx + Page_styled.ts)
│   ├── components/<도메인>/    # 화면에서 쓰는 컴포넌트
│   └── assets/img/<도메인>/    # 이미지 (@2x, @3x 포함)
└── __tests__/                  # Jest 테스트
```

### 경로 별칭

긴 상대경로(`../../..`) 대신 아래 별칭을 씁니다. 설정은 `babel.config.js`와 `tsconfig.json` 두 곳에 있으니, 별칭을 추가할 때는 둘 다 고쳐야 합니다.

| 별칭 | 경로 |
|---|---|
| `@core` | `src/core` |
| `@pages` | `src/pages` |
| `@components` | `src/components` |
| `@routes` | `src/routes` |
| `@assets` | `src/assets` |
| `@hooks` · `@apis` · `@constants` | `src/hooks` · `src/apis` · `src/constants` |

<br>

## 🎨 디자인 시스템

디자이너가 정리한 [UI/docs/design-system.md](../../UI/docs/design-system.md)(Figma Variables 기준)를 그대로 옮겨 둔 값입니다. 문서가 바뀌면 `src/core/styles/`도 같이 맞춰 주세요. **색상 hex 값이나 폰트 크기를 직접 쓰지 말고 테마 값을 쓰세요.**

### 색상

```ts
color: ${({ theme }) => theme.colors.textPrimary};          // ✅ 역할 토큰 (기본으로 사용)
background-color: ${({ theme }) => theme.palette.seed100};  // 필요할 때만 원색
color: #2B2724;                                             // ❌ 직접 입력 금지
```

- **`theme.colors`**: 역할 토큰입니다. 문서의 `background/base`는 `backgroundBase`처럼 camelCase로 바꿔 씁니다.
  - 배경·표면: `backgroundBase`, `backgroundSubtle`, `surfaceDefault`, `surfaceSeed`, `surfaceSprout`, `surfaceBrown`
  - 텍스트: `textPrimary`, `textSecondary`, `textTertiary`, `textOnDark`, `textBrand`
  - 아이콘·경계선: `iconDefault`, `iconSubtle`, `iconBrand`, `borderDefault`, `borderStrong`
  - 브랜드·버튼: `brandSeed`, `brandSeedStrong`, `brandBrown`, `brandSprout`, `actionPrimaryBg/Text`, `actionSecondaryBg/Text`
  - 상태·피드백: `stateSelectedBg`, `stateSelectedContent`, `stateFocus`, `stateError`, `feedbackSuccess/Danger/InfoBg`, `feedbackSuccess/Danger/InfoText`
- **`theme.palette`**: 원색 팔레트입니다. `seed`, `brown`, `green` 50~900 / `neutral` 0~900 / `danger50·600`, `info50·600`

> 디자인 규칙: 노랑 위에는 진한 브라운 텍스트를 쓰고, 흰 글씨는 쓰지 않습니다. 넓은 배경은 웜 뉴트럴을 씁니다. 선택·오류·완료 상태는 색만으로 구분하지 말고 아이콘이나 라벨을 함께 씁니다.

### 타이포그래피

```ts
const Title = styled.Text`
  ${({ theme }) => theme.fonts.headingOnboarding};
  color: ${({ theme }) => theme.colors.textPrimary};
`;
```

| 분류 | 스타일 키 |
|---|---|
| 브랜드 | `brandLogo` · `brandAccent` (조선굴림체), `brandTagline` |
| 제목 | `displayAuth`, `headingOnboarding`, `headingDialog`, `titleAppBar`, `titleSection` |
| 본문 | `bodyLarge`, `bodyMedium`, `bodySmall` |
| 라벨 | `labelButton`, `labelForm`, `labelCompact` |
| 캡션 | `captionRegular`, `captionSmall`, `captionXSmall` |

> ⚠️ 안드로이드는 `font-weight`로 굵기가 바뀌지 않습니다. 굵기마다 폰트 파일이 따로 있어서, 위 스타일 키를 쓰면 알맞은 파일(`Pretendard-Medium` 등)이 자동으로 지정됩니다.

### 버튼

```tsx
import { Button } from "@core/ui/button";

<Button variant="primary" fullWidth onPress={handleLogin}>로그인</Button>        // 노랑 (brand/seed)
<Button variant="secondary" fullWidth onPress={handleSignup}>회원가입</Button>  // 연노랑
<Button variant="text" onPress={handleFindId}>아이디 찾기</Button>              // 텍스트 버튼
```

<br>

## ✍️ 화면 추가하는 방법

예시: `01-2 로그인` 화면을 추가하는 경우

**1. 화면 파일 만들기:** `src/pages/auth/Login.tsx` + `Login_styled.ts`

```tsx
// Login.tsx
import * as s from "./Login_styled";

const Login = () => {
  return <s.LoginWrapper>{/* ... */}</s.LoginWrapper>;
};

export default Login;
```

```ts
// Login_styled.ts
import styled from "styled-components/native";

export const LoginWrapper = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;
```

**2. 라우터에 등록하기:** `src/routes/router.tsx`

```tsx
export type RootStackParamList = {
  Splash: undefined;
  AccountStart: undefined;
  Login: undefined; // 추가
};

<Stack.Screen name="Login" component={Login} />; // 추가
```

**3. 이동하기**

```tsx
const navigation = useNavigation();
navigation.navigate("Login");
```

### 코드 컨벤션

- **파일 구성:** 화면은 `Page.tsx`(구조·로직)와 `Page_styled.ts`(스타일)로 나누고, `import * as s from "./Page_styled"`로 불러옵니다.
- **컴포넌트 작성:** 화살표 함수 컴포넌트에 `export default`를 씁니다.
- **핸들러 이름:** `handleXxx`로 짓습니다.
- **styled props:** 스타일 전용 prop은 `$`를 붙입니다 (예: `$top`, `$variant`). 실제 컴포넌트로 전달되지 않게 하기 위해서입니다.
- **안전 영역:** 상태바와 하단 제스처 영역은 `useSafeAreaInsets()`로 여백을 줍니다 (`Splash.tsx` 참고).
- **크기 단위:** Figma 수치를 `px` 그대로 씁니다. React Native에서는 `rem`, `%` 폰트 크기를 쓸 수 없습니다.
- **이미지:** `src/assets/img/<도메인>/`에 `name.png`, `name@2x.png`, `name@3x.png` 세 가지를 넣고 `import`해서 씁니다. 기기 해상도에 맞는 파일이 자동으로 선택됩니다.
  - 캐릭터·일러스트·아이콘 원본은 레포 루트 [UI/assets](../../UI/assets)에 있습니다. 용도는 [asset-catalog.md](../../UI/docs/asset-catalog.md)를 참고하세요.
  - 원본(1000px 이상)을 그대로 쓰지 말고, 화면에 쓸 파일만 표시 크기의 1x/2x/3x로 줄여서 `src/assets`에 복사합니다.
  - `UI/references`는 참고용이라 앱에 넣지 않습니다.

<br>

## 🤝 협업 규칙

[CONTRIBUTING.md](../../CONTRIBUTING.md)를 따릅니다.

- **커밋:** `[feat] #12 로그인 화면 UI 구현`
- **브랜치:** `feat/#12-login-screen`
- **Type:** `feat` · `fix` · `docs` · `style` · `refactor` · `chore`
- PR은 [템플릿](../../.github/PULL_REQUEST_TEMPLATE.md)에 맞춰 작성하고, 화면 작업이면 에뮬레이터 스크린샷을 첨부해 주세요.

<br>

## 🛠 문제 해결

<details>
<summary><code>Unable to locate a Java Runtime</code> / <code>adb: command not found</code></summary>

환경변수가 등록되지 않은 상태입니다. [환경변수 등록](#2-환경변수-등록-macos)을 확인하고 **터미널을 새로 여세요.** `echo $ANDROID_HOME`을 실행했을 때 경로가 나와야 합니다.
</details>

<details>
<summary><code>No emulators found</code> / <code>No devices connected</code></summary>

`yarn android` 전에 폰이 연결돼 있거나 에뮬레이터가 켜져 있어야 합니다. `adb devices`에 기기가 `device` 상태로 보이는지 확인하세요.

폰이 목록에 안 보이면 아래를 확인하세요.
- USB 디버깅이 켜져 있는지
- 데이터 전송이 되는 케이블인지
- 폰의 "USB 디버깅 허용" 팝업에서 허용을 눌렀는지

케이블을 뺐다 다시 꽂아 보는 것도 방법입니다.
</details>

<details>
<summary>코드를 고쳤는데 화면이 안 바뀌어요</summary>

1. Metro 터미널에서 `r`을 눌러 새로고침합니다.
2. 그래도 안 되면 캐시를 지우고 다시 켭니다: `yarn start --reset-cache`
3. 네이티브 파일(폰트, `android/`)을 바꿨다면 `yarn android`로 다시 빌드합니다.
</details>

<details>
<summary><code>yarn react-native doctor</code>에서 JDK·Android SDK에 ✖가 떠요</summary>

doctor의 버전 기준이 오래돼서 Android Studio 내장 JDK(25)를 지원하지 않는다고 표시됩니다. `yarn android` 빌드가 성공하면 문제없습니다. iOS 관련 항목(CocoaPods 등)도 무시하세요.
</details>

<details>
<summary><code>npx</code>가 <code>EACCES</code> 에러로 실패해요</summary>

`~/.npm` 캐시 폴더의 권한 문제입니다. 아래 명령으로 소유자를 고친 뒤 다시 시도하세요.

```bash
sudo chown -R $(whoami) ~/.npm
```
</details>
