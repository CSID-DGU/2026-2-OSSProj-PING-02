# 말씨앗 백엔드 API 목록 (프론트 연동용)

> 현재 구현 기준 문서입니다. 명세서와 다른 부분은 **[확인 필요]**로 표시했습니다.
> 개발 서버는 로컬 PC에서만 떠 있으므로, 실기기 연결 시 `localhost` 대신 PC의 IP를 씁니다.

## 1. 접속 정보

| 항목 | 값 |
|---|---|
| 개발 서버 기본 주소 | `http://<백엔드 PC IP>:5010/v1` |
| 포트 | `5010` (`.env`의 `PORT`) |
| 문서 (Swagger) | `http://<백엔드 PC IP>:5010/docs` (개발 환경에서만) |
| 데이터 형식 | 요청·응답 모두 `application/json` (UTF-8) |

- 모든 경로는 `/v1` 아래에 있습니다.
- 같은 Wi-Fi에 있어야 하고, PC 방화벽에서 5010 포트를 열어야 합니다.

## 2. 인증 방식

> 사용자 ID는 UUID입니다. 명세 예시의 `u_123`은 예시 값입니다.

- 회원가입·로그인 응답으로 `accessToken`, `refreshToken`, `expiresIn`을 받습니다.
- 인증이 필요한 요청에는 `Authorization: Bearer <accessToken>` 헤더를 붙입니다.
- `accessToken`은 **1800초(30분)**입니다. 만료되면 `POST /auth/refresh`로 갱신합니다.
- 리프레시 토큰은 **한 번 쓰면 바뀝니다.** 갱신 응답의 새 `refreshToken`으로 교체 저장해야 합니다. 이전 토큰을 다시 쓰면 401이 납니다.
- 토큰 저장 위치는 프론트가 정합니다.

## 3. 공통 에러 형식

> 요청 본문에 DTO에 없는 필드(예: 메시지 원문)가 오면 400 `VALIDATION_FAILED`로 거부하고, 저장하지 않습니다. `details`에 해당 필드가 나옵니다.

모든 에러는 아래 형식입니다.

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "아이디 또는 비밀번호가 올바르지 않습니다.",
    "details": []
  }
}
```

- `code`로 분기하고, `message`는 사용자에게 보여줄 수 있는 한국어 문장입니다.
- `details`는 입력값 오류일 때 `[{ "field": "email", "reason": "isEmail" }]` 형태로 옵니다.

## 4. 엔드포인트 목록

| # | 메서드 | 경로 | 인증 | 성공 코드 | 설명 | 명세 번호 |
|---|---|---|---|---|---|---|
| 1 | GET | `/app/version` | 불필요 | 200 | 앱 버전 확인, 강제 업데이트 여부 | 4-12 |
| 2 | GET | `/terms` | 불필요 | 200 | 약관 목록 | 4-2 |
| 3 | POST | `/auth/email/check` | 불필요 | 200 | 이메일 사용 가능 여부 | 1.1.4 |
| 3-1 | POST | `/auth/username/check` | 불필요 | 200 | 아이디 사용 가능 여부 | 확인 필요 (명세 외 추가) |
| 3-2 | POST | `/auth/username/find` | 불필요 | 204 | 아이디 찾기 (가입 이메일로 발송) | 확인 필요 (명세 외 추가) |
| 3-3 | POST | `/auth/password/forgot` | 불필요 | 204 | 비밀번호 찾기 1단계: 재설정 코드 발송 | 확인 필요 (명세 외 추가) |
| 3-4 | POST | `/auth/password/reset` | 불필요 | 204 | 비밀번호 찾기 2단계: 코드 확인 후 새 비밀번호 설정 | 확인 필요 (명세 외 추가) |
| 4 | POST | `/auth/signup` | 불필요 | 201 | 회원가입 (아이디·약관 동의 포함, 토큰 없음) | 1.1.1~1.1.3 |
| 4-1 | POST | `/auth/email/verify` | 불필요 | 200 | 인증 코드 확인 후 토큰 발급 | 확인 필요 (명세 외 추가) |
| 4-2 | POST | `/auth/email/resend` | 불필요 | 204 | 인증 코드 재발송 | 확인 필요 (명세 외 추가) |
| 5 | POST | `/auth/login` | 불필요 | 200 | 아이디 로그인 (이메일 인증 완료 필요) | 1.2.1, 1.2.2 |
| 6 | POST | `/auth/refresh` | 불필요 | 200 | 토큰 갱신 | 1.2.4 |
| 7 | POST | `/auth/logout` | 필요 | 204 | 로그아웃 (리프레시 토큰 폐기) | 5.6.1 |
| 8 | GET | `/users/me` | 필요 | 200 | 내 정보 조회 | 확인 필요 |
| 9 | DELETE | `/users/me` | 필요 | 204 | 회원 탈퇴 | 4-9 |
| 10 | POST | `/users/me/terms-agreements` | 필요 | 204 | 약관 재동의 | 4-10 |
| 11 | GET | `/models/latest` | 필요 | 200 | 최신 AI 모델 정보와 다운로드 URL | 4-11 |

> 명세 번호는 코드 주석에 적힌 것만 옮겼습니다. 나머지는 명세서 원문과 대조가 필요합니다.

---

### 4.1 앱 버전 확인

`GET /v1/app/version?platform=android&appVersion=1.0.0`

| 쿼리 | 필수 | 형식 |
|---|---|---|
| `platform` | O | 현재 `android`만 허용 |
| `appVersion` | O | `x.y.z` 형식 |

응답 200
```json
{
  "latestVersion": "1.0.0",
  "minSupportedVersion": "1.0.0",
  "forceUpdate": false,
  "storeUrl": "https://..."
}
```
- `forceUpdate`가 `true`면 앱 업데이트를 강제해야 합니다.
- 버전 정보가 DB에 없으면 404 `NOT_FOUND`.

---

### 4.2 약관 목록

`GET /v1/terms`

응답 200
```json
{
  "terms": [
    {
      "id": "5ce1be91-4b94-4a27-b6cf-5925c11912cd",
      "type": "PRIVACY",
      "version": "1.0.0",
      "required": true,
      "title": "개인정보 수집 및 이용 동의",
      "url": "https://example.com/terms/privacy",
      "effectiveAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```
- 회원가입 화면에서 약관 `id`를 가져와 `termsAgreements`에 넣습니다.
- 현재 시드 데이터는 2건(`PRIVACY`, `SERVICE`)입니다.

---

### 4.3 이메일 중복 확인

`POST /v1/auth/email/check`

요청
```json
{ "email": "user@example.com" }
```
응답 200
```json
{ "available": true }
```
- 요청 제한: 1분에 10회 (IP 기준).

---

### 4.3-1 아이디 규칙과 중복 확인

로그인에 쓰는 아이디(`username`)는 이메일과 별개입니다. 이메일은 인증과 아이디·비밀번호 찾기에만 씁니다.

- 규칙: **영문 소문자로 시작**, 영문 소문자·숫자·밑줄(`_`), **4~20자**. 대문자와 앞뒤 공백은 서버가 소문자·공백 제거로 맞춥니다.

`POST /v1/auth/username/check`

요청
```json
{ "username": "hong_gildong" }
```
응답 200
```json
{ "available": true }
```
- 형식에 맞지 않으면 400 `VALIDATION_FAILED`.
- 요청 제한: 1분에 10회 (IP 기준).

---

### 4.3-2 아이디 찾기

`POST /v1/auth/username/find`

요청
```json
{ "email": "user@example.com" }
```
응답 204 (본문 없음). **가입 여부와 관계없이 항상 같은 응답**입니다.
- 가입했고 이메일 인증을 마친 계정이면, 그 이메일로 아이디를 보냅니다. 아이디는 응답에 담기지 않습니다.
- 메일 발송은 기다리지 않습니다. 앱에는 "가입된 이메일이라면 아이디를 보냈습니다" 정도로 안내해 주세요.
- 요청 제한: 1분에 3회 (IP 기준).

---

### 4.3-3 비밀번호 찾기 (1단계: 코드 받기)

`POST /v1/auth/password/forgot`

요청
```json
{ "username": "hong_gildong", "email": "user@example.com" }
```
응답 204 (본문 없음). **아이디와 이메일이 맞는지와 관계없이 항상 같은 응답**입니다.
- 아이디와 가입 이메일이 일치하고 인증을 마친 계정이면, 이메일로 **6자리 재설정 코드**를 보냅니다. 코드는 10분 동안 유효하고, 5번 틀리면 무효가 됩니다.
- 같은 계정에는 60초 안에 새 메일을 보내지 않습니다(응답은 같음).
- 요청 제한: 1분에 3회 (IP 기준).

### 4.3-4 비밀번호 찾기 (2단계: 새 비밀번호 설정)

`POST /v1/auth/password/reset`

요청
```json
{ "username": "hong_gildong", "code": "123456", "newPassword": "newpass5678" }
```
응답 204 (본문 없음)
- 성공하면 **이 계정의 모든 기기 세션이 끊깁니다.** 앱은 로그인 화면으로 보내 새 비밀번호로 다시 로그인하게 해 주세요.
- `newPassword`는 가입 비밀번호와 같은 규칙입니다(8~72자, 영문과 숫자 포함).
- 코드는 한 번만 쓸 수 있고, **가입 인증 코드와는 서로 바꿔 쓸 수 없습니다.**

에러
- 400 `VERIFICATION_CODE_INVALID`: 코드가 틀렸거나, 만료되었거나, 시도 횟수(5회)를 넘었거나, 없는 아이디 (구분하지 않음)
- 400 `VALIDATION_FAILED`: 코드가 6자리 숫자가 아니거나 새 비밀번호가 규칙에 맞지 않음
- 요청 제한: 1분에 5회 (IP 기준)

---

### 4.4 회원가입

`POST /v1/auth/signup`

요청
```json
{
  "username": "hong_gildong",
  "name": "홍길동",
  "birthdate": "1999-01-01",
  "gender": "MALE",
  "email": "user@example.com",
  "password": "abcd1234",
  "termsAgreements": [
    { "termsId": "5ce1be91-4b94-4a27-b6cf-5925c11912cd", "agreed": true },
    { "termsId": "c8d3f196-a438-45cf-8696-e55641ded209", "agreed": true }
  ]
}
```

| 필드 | 규칙 |
|---|---|
| `username` | 로그인 아이디. 영문 소문자로 시작, 소문자·숫자·밑줄, 4~20자 (4.3-1 참고) |
| `name` | 1~50자 |
| `birthdate` | `YYYY-MM-DD` |
| `gender` | `MALE` / `FEMALE` / `OTHER` |
| `email` | 이메일 형식, 최대 255자. 서버에서 소문자로 바꿉니다 |
| `password` | 8~72자, 영문과 숫자 포함 **[확인 필요: 팀 확정 전 규칙]** |
| `termsAgreements` | 필수 약관에 모두 `agreed: true`여야 합니다 |

응답 201 (토큰은 주지 않습니다. 인증 코드를 확인해야 로그인됩니다)
```json
{
  "user": { "id": "uuid", "username": "hong_gildong", "name": "홍길동", "email": "user@example.com" },
  "verificationRequired": true
}
```
- 가입하면 입력한 이메일로 **6자리 인증 코드**가 발송됩니다. 코드는 10분 동안 유효하고, 5번 틀리면 무효가 됩니다.
- 다음 단계: `POST /v1/auth/email/verify`로 코드를 확인하면 토큰을 받습니다.
- 메일 발송에 실패하면 503 `UPSTREAM_UNAVAILABLE`이고, 가입도 되지 않습니다.
- **인증을 끝내지 못한 가입(이메일 오타 등)은 다시 가입할 수 있습니다.** 같은 이메일이나 아이디로 가입하면, 만들어진 지 60초가 지난 미인증 계정은 지우고 새로 만듭니다. 60초 안이면 409입니다. 이메일 인증을 마친 계정은 덮어쓰지 않습니다.

에러
- 409 `EMAIL_ALREADY_EXISTS`: 이미 가입된 이메일
- 409 `USERNAME_ALREADY_EXISTS`: 이미 사용 중인 아이디
- 422 `REQUIRED_TERMS_NOT_AGREED`: 필수 약관 미동의
- 400 `VALIDATION_FAILED` / `INVALID_EMAIL_FORMAT`: 입력값 오류

- 요청 제한: 1분에 5회 (IP 기준).

---

### 4.4-1 이메일 인증 코드 확인

`POST /v1/auth/email/verify`

요청
```json
{ "email": "user@example.com", "code": "123456" }
```
응답 200: `{ user, tokens }` (회원가입 응답의 토큰과 같은 형식)

에러
- 400 `VALIDATION_FAILED`: 코드가 6자리 숫자가 아님
- 400 `VERIFICATION_CODE_INVALID`: 코드가 틀렸거나, 만료되었거나, 시도 횟수(5회)를 넘었거나, 이미 인증된 계정
- 요청 제한: 1분에 10회 (IP 기준)

### 4.4-2 인증 코드 재발송

`POST /v1/auth/email/resend`

요청
```json
{ "email": "user@example.com" }
```
응답 204 (본문 없음). 가입 여부와 관계없이 같은 응답입니다.
- 이전 코드는 무효가 되고 새 코드가 발송됩니다.
- 요청 제한: 1분에 3회 (IP 기준)

### 4.5 로그인

`POST /v1/auth/login`

요청
```json
{
  "username": "hong_gildong",
  "password": "abcd1234",
  "deviceId": "optional-device-id"
}
```
- **이메일로는 로그인할 수 없습니다.** 이전 형식(`email`)으로 보내면 400 `VALIDATION_FAILED`입니다.
- 기존 회원에게는 마이그레이션이 임시 아이디(`u` + 12자리 영문·숫자)를 줬습니다. 아이디를 잊었다면 "아이디 찾기"로 확인합니다.
- `deviceId`는 선택입니다. 기기별로 세션을 나눌 때 씁니다.

응답 200: 회원가입과 같은 `{ user, tokens }` 형태

에러
- 401 `INVALID_CREDENTIALS`: 아이디 또는 비밀번호 불일치 (없는 아이디와 틀린 비밀번호를 구분하지 않음)
- 403 `EMAIL_NOT_VERIFIED`: 비밀번호는 맞지만 이메일 인증 전
- 요청 제한: 1분에 5회 (IP 기준).

---

### 4.6 토큰 갱신

`POST /v1/auth/refresh`

요청
```json
{ "refreshToken": "XIt..." }
```
응답 200
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "새로운 refreshToken",
  "expiresIn": 1800
}
```
- 응답의 새 `refreshToken`으로 **반드시 교체 저장**합니다.

에러
- 401 `REFRESH_TOKEN_INVALID`: 만료되었거나 이미 사용된 토큰. 다시 로그인해야 합니다.

---

### 4.7 로그아웃

`POST /v1/auth/logout` (인증 필요)

요청
```json
{ "refreshToken": "XIt..." }
```
응답 204 (본문 없음)

---

### 4.8 내 정보 조회

`GET /v1/users/me` (인증 필요)

응답 200
```json
{
  "id": "uuid",
  "username": "hong_gildong",
  "name": "홍길동",
  "email": "user@example.com",
  "birthdate": "1999-01-01",
  "gender": "MALE",
  "provider": "EMAIL",
  "createdAt": "2026-11-12T08:30:56.378Z",
  "termsAgreements": [
    { "termsId": "c8d3f196-a438-45cf-8696-e55641ded209", "agreed": true }
  ]
}
```

---

### 4.9 회원 탈퇴

`DELETE /v1/users/me` (인증 필요)

요청 (이메일 계정은 비밀번호 필수)
```json
{ "password": "abcd1234" }
```
응답 204 (본문 없음)

- 비밀번호를 빼고 요청하면 400 `VALIDATION_FAILED` (`details`에 `password` required).
- 비밀번호가 틀리면 401 `INVALID_CREDENTIALS`.
- 탈퇴 후 같은 토큰으로 요청하면 401 `UNAUTHORIZED`.
- 서버 데이터(회원, 약관 동의, 토큰)는 **즉시 삭제**합니다. 명세 4-9의 "서버 데이터를 삭제한다"와 같은 방식입니다.
  - 명세 ERD의 `users.deleted_at`(소프트 삭제)은 두지 않았습니다. 이메일 유일 제약과 충돌하고, 탈퇴 후에도 개인정보가 남기 때문입니다.
  - **문서 정리 필요:** ERD(4-1 `users`)에는 `deleted_at` 행이 남아 있고, 중간보고서(3-2)는 탈퇴 시 `deleted_at`을 기록한다고 적혀 있습니다. 현재 결정(즉시 삭제)과 맞지 않으므로 해당 문서를 고쳐야 합니다. ERD 주석에는 "즉시 삭제로 정하면 사용하지 않음"이라고 되어 있어 결정 사항과는 일치합니다.
  - 일정 기간 보관이 필요해지면 그때 추가합니다. **[팀 확인 필요: 명세 7-6]**
- 앱은 204를 받은 뒤 기기 내 데이터를 직접 지웁니다.

---

### 4.10 약관 재동의

`POST /v1/users/me/terms-agreements` (인증 필요)

요청
```json
{
  "termsAgreements": [
    { "termsId": "5ce1be91-4b94-4a27-b6cf-5925c11912cd", "agreed": true }
  ]
}
```
- 최소 1건 이상 보내야 합니다.

응답 204 (본문 없음)

---

### 4.11 최신 AI 모델 정보

`GET /v1/models/latest?platform=android&appVersion=1.0.0` (인증 필요)

| 쿼리 | 필수 | 형식 |
|---|---|---|
| `platform` | O | `android` |
| `appVersion` | O | `x.y.z` |

응답 200 (형식)
```json
{
  "model": {
    "id": "uuid",
    "type": "base",
    "task": "...",
    "version": "1.0.0",
    "filename": "model.gguf",
    "quantization": "Q4_K_M",
    "sizeBytes": 123456789,
    "sha256": "...",
    "baseModelSha256": null,
    "minAppVersion": "1.0.0",
    "downloadUrl": "https://cdn.example.com/models/...",
    "urlExpiresAt": "2026-11-12T09:00:00.000Z"
  },
  "adapters": []
}
```
- 다운로드 진행률은 앱이 받은 바이트와 `sizeBytes`로 계산합니다.
- `sha256`으로 받은 파일을 검증합니다.
- `downloadUrl`은 `urlExpiresAt` 이후 만료됩니다. 만료되면 이 API를 다시 호출합니다.
- `adapters`는 MVP에서 항상 빈 배열입니다.

에러
- 404 `MODEL_NOT_FOUND`: 받을 수 있는 모델이 없음
- 426 `APP_UPDATE_REQUIRED`: 앱을 업데이트해야 함
- **[미완성]** 현재 시드에 모델 데이터가 없어서 항상 404입니다. 다운로드 URL은 서명 없는 임시 형식이며, 서명 URL 방식은 저장소 결정 후 바꿉니다.

---

## 5. 에러 코드 목록

| code | HTTP | 의미 |
|---|---|---|
| `VALIDATION_FAILED` | 400 | 입력값 오류 (`details` 참고) |
| `INVALID_EMAIL_FORMAT` | 400 | 이메일 형식 오류 |
| `UNAUTHORIZED` | 401 | 인증 필요 또는 토큰 만료 |
| `INVALID_CREDENTIALS` | 401 | 로그인 정보 불일치 |
| `REFRESH_TOKEN_INVALID` | 401 | 리프레시 토큰 만료 또는 재사용 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `MODEL_NOT_FOUND` | 404 | 받을 수 있는 모델 없음 |
| `EMAIL_ALREADY_EXISTS` | 409 | 이미 가입된 이메일 |
| `USERNAME_ALREADY_EXISTS` | 409 | 이미 사용 중인 아이디 |
| `REQUIRED_TERMS_NOT_AGREED` | 422 | 필수 약관 미동의 |
| `EMAIL_NOT_VERIFIED` | 403 | 이메일 인증 전 로그인 시도 (비밀번호는 맞음) |
| `VERIFICATION_CODE_INVALID` | 400 | 인증 코드가 틀렸거나 만료됨 |
| `APP_UPDATE_REQUIRED` | 426 | 앱 업데이트 필요 |
| `RATE_LIMITED` | 429 | 요청 횟수 초과. `Retry-After: 60` 헤더가 함께 온다 |
| `UPSTREAM_UNAVAILABLE` | 503 | 외부 연결 실패 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

## 6. 현재 제외된 기능

- **카카오 로그인**: 카카오 앱 등록 문제로 이번 범위에서 제외했습니다. 경로가 없어서 `/auth/kakao`는 404입니다.

## 6-1. 보안 설정 (프론트가 알아 둘 것)

- **요청 제한 (429 `RATE_LIMITED`, `Retry-After: 60`):** 이메일·아이디 중복 확인 10회/분, 가입·로그인·비밀번호 재설정 5회/분, 아이디 찾기·비밀번호 코드 요청 3회/분, 토큰 갱신 20회/분 (IP 기준).
- **정의되지 않은 필드:** DTO에 없는 필드(예: `messageText`, `role`, `id`)가 오면 400으로 거부합니다. 메시지 원문은 어떤 요청에도 보낼 수 없습니다.
- **잘못된 본문:** JSON 문법 오류는 400, 200KB 넘는 본문은 413 (`VALIDATION_FAILED`)으로 응답합니다. 파서의 내부 문구는 노출하지 않습니다.
- **토큰:** 서명이 다르거나, 변조되었거나, 만료되었거나, `alg: none`인 토큰은 401입니다. 탈퇴한 회원의 토큰도 401입니다.
- **인증 범위:** 다른 회원의 refreshToken으로 로그아웃해도 그 세션은 폐기되지 않습니다.
- **응답 헤더:** `X-Powered-By`는 없고, `X-Content-Type-Options: nosniff` 등 보안 헤더가 붙습니다.
- **로그아웃 즉시 무효화:** 로그아웃하면 그 세션의 액세스 토큰도 즉시 401이 됩니다. 같은 세션 안의 갱신(회전)은 세션을 유지하므로 액세스 토큰이 계속 유효합니다.
- **이메일 인증 전 로그인:** 비밀번호가 맞아도 인증 전이면 403 `EMAIL_NOT_VERIFIED`입니다. 비밀번호가 틀리면 401입니다.

## 7. 미정 / 확인 필요

- 비밀번호 규칙: 8~72자, 영문과 숫자 포함 (제안안 적용됨, 팀 확정 시 변경 가능)
- 탈퇴 시 데이터 삭제 방식: 명세 대조 필요
- 모델 다운로드 URL 서명 방식과 저장소: 결정 필요
- 모델 시드 데이터: 아직 없음
- 요청 제한(429) 응답 형식: `RATE_LIMITED` + `Retry-After` 헤더로 확인됨 (보안 e2e 테스트)
- 연동 예시(curl)와 시나리오: `Doc/연동_가이드_curl.md` 참고
