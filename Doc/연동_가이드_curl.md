# 말씨앗 백엔드 연동 가이드 (curl 예시)

> 엔드포인트 명세는 `Doc/API_목록.md`를 봅니다. 이 문서는 **순서대로 따라 하는 예시**입니다.
> 모든 예시는 로컬 개발 서버 기준입니다. 실기기에서는 `localhost` 대신 백엔드 PC의 IP를 씁니다.

## 0. 준비

```bash
export BASE=http://localhost:5010/v1
export USERNAME=user_$(date +%s)            # 로그인 아이디 (영문 소문자로 시작, 4~20자). 매번 새 값으로 테스트
export PW=abcd1234
```

- 이 서비스는 **이메일을 받지 않습니다.** 아이디와 비밀번호로 가입하고 로그인합니다. 가입하면 바로 토큰을 받습니다.

## 1. 시나리오 한눈에 보기

```
[약관 조회] → [아이디 확인] → [회원가입: 토큰 발급]
     → [내 정보] → [토큰 갱신] → [모델 조회] → [로그아웃] / [탈퇴]

[앱을 다시 켤 때] 저장해 둔 refreshToken 으로 갱신 → 성공하면 자동 로그인
[로그인 화면]    아이디 + 비밀번호 → 토큰 발급
```

| 단계 | 호출 | 프론트가 할 일 |
|---|---|---|
| 1 | `GET /terms` | 가입 화면에 약관 목록을 그리고, 각 약관 `id`를 저장 |
| 2 | `POST /auth/username/check` | 아이디 입력 중 사용 가능 여부 표시 |
| 3 | `POST /auth/signup` | 201의 `tokens`를 저장 (가입 즉시 로그인 상태) |
| 4 | `POST /auth/login` | **아이디**와 비밀번호로 로그인 (다른 기기·로그아웃 후) |
| 5 | `POST /auth/refresh` | 액세스 토큰 만료(401) 시 호출. 응답의 **새 refreshToken으로 교체 저장** |
| 6 | `GET /models/latest` | 모델 정보와 다운로드 URL을 받음 (현재 시드 없음, 404 정상) |
| 7 | `POST /auth/logout` | 204 후 로컬 토큰 삭제. 이 기기 세션만 끊김 |
| 8 | `DELETE /users/me` | 204 후 기기 내 데이터 삭제 |

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

### 2.2 아이디 중복 확인

```bash
curl -s -X POST "$BASE/auth/username/check" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\"}"
```

응답 200 `{ "available": true }`. 형식(소문자로 시작, 소문자·숫자·밑줄, 4~20자)이 틀리면 400입니다.

### 2.3 회원가입

```bash
curl -s -X POST "$BASE/auth/signup" -H 'Content-Type: application/json' -d "{
  \"username\": \"$USERNAME\",
  \"name\": \"홍길동\",
  \"birthdate\": \"1999-01-01\",
  \"gender\": \"MALE\",
  \"password\": \"$PW\",
  \"termsAgreements\": [$TERM_IDS]
}"
```

응답 201 (가입하면 바로 토큰을 줍니다)
```json
{
  "user": { "id": "uuid", "username": "user_1700000000", "name": "홍길동" },
  "tokens": { "accessToken": "eyJ...", "refreshToken": "XIt...", "expiresIn": 1800 }
}
```

| 에러 | 의미 |
|---|---|
| 409 `USERNAME_ALREADY_EXISTS` | 이미 사용 중인 아이디 |
| 422 `REQUIRED_TERMS_NOT_AGREED` | 필수 약관에 `agreed: true`가 없음 |
| 400 `VALIDATION_FAILED` | 입력값 오류 (`details` 확인). `email` 같은 정의되지 않은 필드도 여기에 해당 |

### 2.4 로그인

```bash
curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PW\",\"deviceId\":\"my-phone-1\"}"
```

| 응답 | 의미 |
|---|---|
| 200 `{ user, tokens }` | 성공 |
| 401 `INVALID_CREDENTIALS` | 아이디 또는 비밀번호 불일치 |

`deviceId`는 선택입니다. 기기별로 세션을 나눕니다.

```bash
ACCESS=eyJ...   # 가입/로그인 응답의 tokens.accessToken
REFRESH=XIt...  # 가입/로그인 응답의 tokens.refreshToken
```

### 2.7 내 정보

```bash
curl -s "$BASE/users/me" -H "Authorization: Bearer $ACCESS"
```

응답 200 `{ id, username, name, birthdate, gender, provider, createdAt, termsAgreements }`
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

아이디·비밀번호 계정은 비밀번호가 필요합니다.

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
- 아이디는 서버에서 소문자로 바꾸고 앞뒤 공백을 지웁니다.
- **아이디·비밀번호 찾기는 없습니다.** 이메일을 받지 않아 본인 확인 수단이 없기 때문입니다(MVP). 비밀번호를 잊으면 복구할 수 없습니다.
- **자동 로그인:** 앱을 켤 때마다 저장된 refreshToken으로 `POST /auth/refresh`를 호출하면 됩니다. 갱신할 때마다 만료가 30일 연장되므로 자주 쓰면 계속 유지됩니다. 갱신 요청은 앱 안에서 **한 곳에서만** 보내세요(동시에 두 곳이 같은 토큰을 쓰면 세션이 끊깁니다).
- 액세스 토큰 저장 위치는 프론트가 정합니다. 리프레시 토큰은 안전한 저장소에 두세요.

## 4. 검증 상태

- 위 흐름(가입 즉시 토큰, 갱신 후 기존 액세스 토큰 유효, 로그아웃 후 401, 다른 기기 세션 유지)은 `test/auth-flow.e2e-spec.ts` 33건으로 자동 검증합니다.
- 이 문서의 curl 명령은 코드와 e2e 테스트 기준으로 작성했습니다. **SMTP가 설정되지 않은 환경에서는 가입(2.3)과 인증(2.4)이 실패합니다.** 메일 설정 후 한 번 손으로 실행해 확인하는 것을 권합니다.
