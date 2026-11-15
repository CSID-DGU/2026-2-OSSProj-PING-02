# 말씨앗 백엔드 연동 가이드 (curl 예시)

> 엔드포인트 명세는 `Doc/API_목록.md`를 봅니다. 이 문서는 **순서대로 따라 하는 예시**입니다.
> 모든 예시는 로컬 개발 서버 기준입니다. 실기기에서는 `localhost` 대신 백엔드 PC의 IP를 씁니다.

## 0. 준비

```bash
export BASE=http://localhost:5010/v1
export EMAIL=test$(date +%s)@example.com   # 매번 새 이메일로 테스트
export PW=abcd1234
```

- 메일 발송이 되려면 `Src/Back/.env`에 `MAIL_*` 설정이 있어야 합니다. 없으면 가입이 503 `UPSTREAM_UNAVAILABLE`입니다.
- 인증 코드는 가입 메일로 옵니다. 개발 중에는 메일함에서 6자리 코드를 확인해 아래 `CODE`에 넣습니다.

## 1. 시나리오 한눈에 보기

```
[약관 조회] → [이메일 확인] → [회원가입] → [인증 코드 확인: 토큰 발급]
     → [로그인] → [내 정보] → [토큰 갱신] → [모델 조회] → [로그아웃] / [탈퇴]
```

| 단계 | 호출 | 프론트가 할 일 |
|---|---|---|
| 1 | `GET /terms` | 가입 화면에 약관 목록을 그리고, 각 약관 `id`를 저장 |
| 2 | `POST /auth/email/check` | 이메일 입력 중 사용 가능 여부 표시 |
| 3 | `POST /auth/signup` | 201을 받으면 **토큰이 없습니다.** 인증 코드 입력 화면으로 이동 |
| 4 | `POST /auth/email/verify` | 200의 `tokens`를 저장 (이때부터 로그인 상태) |
| 5 | `POST /auth/email/resend` | "코드 다시 받기" 버튼. 204면 성공 (가입 여부와 무관) |
| 6 | `POST /auth/login` | 인증이 끝난 계정만 로그인됨. 403 `EMAIL_NOT_VERIFIED`면 인증 화면으로 |
| 7 | `POST /auth/refresh` | 액세스 토큰 만료(401) 시 호출. 응답의 **새 refreshToken으로 교체 저장** |
| 8 | `GET /models/latest` | 모델 정보와 다운로드 URL을 받음 (현재 시드 없음, 404 정상) |
| 9 | `POST /auth/logout` | 204 후 로컬 토큰 삭제. 이 기기 세션만 끊김 |
| 10 | `DELETE /users/me` | 204 후 기기 내 데이터 삭제 |

## 2. 단계별 curl

### 2.1 약관 목록

```bash
curl -s "$BASE/terms"
```

응답 200
```json
{ "terms": [ { "id": "5ce1be91-...", "type": "PRIVACY", "required": true, "...": "..." } ] }
```

```bash
TERM_IDS=$(curl -s "$BASE/terms" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).terms.map(t=>`{"termsId":"${t.id}","agreed":true}`).join(",")))')
```

### 2.2 이메일 중복 확인

```bash
curl -s -X POST "$BASE/auth/email/check" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\"}"
```

응답 200 `{ "available": true }`

### 2.3 회원가입

```bash
curl -s -X POST "$BASE/auth/signup" -H 'Content-Type: application/json' -d "{
  \"name\": \"홍길동\",
  \"birthdate\": \"1999-01-01\",
  \"gender\": \"MALE\",
  \"email\": \"$EMAIL\",
  \"password\": \"$PW\",
  \"termsAgreements\": [$TERM_IDS]
}"
```

응답 201 (토큰 없음)
```json
{ "user": { "id": "uuid", "name": "홍길동", "email": "..." }, "verificationRequired": true }
```

| 에러 | 의미 |
|---|---|
| 409 `EMAIL_ALREADY_EXISTS` | 이미 가입된 이메일 |
| 422 `REQUIRED_TERMS_NOT_AGREED` | 필수 약관에 `agreed: true`가 없음 |
| 400 `VALIDATION_FAILED` | 입력값 오류 (`details` 확인) |
| 503 `UPSTREAM_UNAVAILABLE` | 메일 발송 실패. 가입도 되지 않음 |

### 2.4 인증 코드 확인 (토큰 발급)

메일에서 받은 6자리 코드를 넣습니다.

```bash
CODE=123456
curl -s -X POST "$BASE/auth/email/verify" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}"
```

응답 200
```json
{
  "user": { "id": "uuid", "name": "홍길동", "email": "..." },
  "tokens": { "accessToken": "eyJ...", "refreshToken": "XIt...", "expiresIn": 1800 }
}
```

| 에러 | 의미 |
|---|---|
| 400 `VERIFICATION_CODE_INVALID` | 틀림, 만료(10분), 5회 초과, 이미 사용됨 |
| 400 `VALIDATION_FAILED` | 6자리 숫자가 아님 |

### 2.5 인증 코드 재발송

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/auth/email/resend" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}"
```

응답 204. 이전 코드는 무효가 됩니다. 1분에 3회까지입니다.

### 2.6 로그인

```bash
curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"deviceId\":\"my-phone-1\"}"
```

| 응답 | 의미 |
|---|---|
| 200 `{ user, tokens }` | 성공 |
| 403 `EMAIL_NOT_VERIFIED` | 비밀번호는 맞음. 인증 코드 화면으로 |
| 401 `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |

`deviceId`는 선택입니다. 기기별로 세션을 나눕니다.

```bash
ACCESS=eyJ...   # 로그인/인증 응답의 tokens.accessToken
REFRESH=XIt...  # 로그인/인증 응답의 tokens.refreshToken
```

### 2.7 내 정보

```bash
curl -s "$BASE/users/me" -H "Authorization: Bearer $ACCESS"
```

응답 200 `{ id, name, email, birthdate, gender, provider, createdAt, termsAgreements }`
토큰이 없거나 만료되었으면 401 `UNAUTHORIZED`.

### 2.8 토큰 갱신

액세스 토큰은 30분입니다. 401이 나면 갱신합니다.

```bash
curl -s -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

응답 200 `{ accessToken, refreshToken, expiresIn: 1800 }`

> **중요:** 응답의 새 `refreshToken`으로 **반드시 교체 저장**합니다. 이전 refreshToken을 다시 쓰면 401 `REFRESH_TOKEN_INVALID`이고, 이 세션의 액세스 토큰까지 무효가 됩니다. 다시 로그인해야 합니다.

```bash
# 갱신 후 교체 (수동으로 바꿔 넣는 예)
REFRESH=<응답의 새 refreshToken>
ACCESS=<응답의 새 accessToken>
```

### 2.9 최신 AI 모델 정보

```bash
curl -s "$BASE/models/latest?platform=android&appVersion=1.0.0" \
  -H "Authorization: Bearer $ACCESS"
```

| 응답 | 의미 |
|---|---|
| 200 `{ model, adapters }` | 다운로드 URL(`downloadUrl`)은 `urlExpiresAt` 이후 만료. 만료되면 다시 호출 |
| 404 `MODEL_NOT_FOUND` | 받을 수 있는 모델 없음 (**현재 시드 없음, 정상 동작**) |
| 426 `APP_UPDATE_REQUIRED` | 앱 업데이트 필요 |

앱 버전 확인은 인증 없이 호출합니다.

```bash
curl -s "$BASE/app/version?platform=android&appVersion=1.0.0"
```

### 2.10 로그아웃

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

응답 204. 이 기기 세션이 끊기고, 같은 세션의 액세스 토큰도 즉시 401이 됩니다. 다른 기기 세션은 그대로입니다.

### 2.11 회원 탈퇴

이메일 계정은 비밀번호가 필요합니다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "$BASE/users/me" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PW\"}"
```

| 응답 | 의미 |
|---|---|
| 204 | 서버 데이터(회원, 약관 동의, 토큰) 즉시 삭제. 앱은 기기 내 데이터를 지움 |
| 400 `VALIDATION_FAILED` | 비밀번호 누락 |
| 401 `INVALID_CREDENTIALS` | 비밀번호 틀림 |

## 3. 공통 주의

- **에러 분기는 `error.code`로** 합니다. `message`는 사용자에게 보여줄 한국어 문장입니다.
- **429 `RATE_LIMITED`** 에는 `Retry-After: 60` 헤더가 옵니다. 그 시간 뒤에 다시 시도합니다.
- 요청 본문에 DTO에 없는 필드가 있으면 400으로 거부됩니다. 메시지 원문은 어떤 요청에도 보내지 않습니다.
- 이메일은 서버에서 소문자로 바꿉니다.
- 액세스 토큰 저장 위치는 프론트가 정합니다. 리프레시 토큰은 안전한 저장소에 두세요.

## 4. 검증 상태

- 위 흐름(인증 전 로그인 403, 코드 확인, 재발송, 갱신 후 기존 액세스 토큰 유효, 로그아웃 후 401, 다른 기기 세션 유지)은 `test/auth-flow.e2e-spec.ts` 33건으로 자동 검증합니다.
- 이 문서의 curl 명령은 코드와 e2e 테스트 기준으로 작성했습니다. **SMTP가 설정되지 않은 환경에서는 가입(2.3)과 인증(2.4)이 실패합니다.** 메일 설정 후 한 번 손으로 실행해 확인하는 것을 권합니다.
