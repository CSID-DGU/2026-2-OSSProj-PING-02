# 말씨앗 백엔드 연동 가이드 (curl 예시)

> 엔드포인트 명세는 `Doc/API_목록.md`를 봅니다. 이 문서는 **순서대로 따라 하는 예시**입니다.
> 모든 예시는 로컬 개발 서버 기준입니다. 실기기에서는 `localhost` 대신 백엔드 PC의 IP를 씁니다.

## 0. 준비

```bash
export BASE=http://localhost:5010/v1
export USERNAME=user_$(date +%s)   # 로그인 아이디 (영문 소문자로 시작, 4~20자). 매번 새 값으로 테스트
export EMAIL=test@example.com      # 아이디·비밀번호 찾기용 이메일. 가입할 때 인증하지 않는다 (메일을 받으려면 실제 주소)
export PW=abcd1234
```

- 아이디와 비밀번호로 가입하고 로그인합니다. **가입하면 바로 토큰을 받습니다**(가입할 때 이메일 인증은 없습니다).
- 아이디·비밀번호 찾기 메일을 받으려면 `Src/Back/.env`에 `MAIL_*` 설정이 있어야 합니다. 개발 중에는 메일함에서 6자리 코드를 확인해 `CODE`에 넣습니다.

## 1. 시나리오 한눈에 보기

```
[약관 조회] → [아이디 확인] → [회원가입(이메일 포함): 토큰 발급]
     → [내 정보] → [토큰 갱신] → [모델 조회] → [로그아웃] / [탈퇴]

[앱을 다시 켤 때] 저장해 둔 refreshToken 으로 갱신 → 성공하면 자동 로그인
[로그인 화면]    아이디 + 비밀번호 → 토큰 발급
[아이디 찾기]   이메일 입력 → 메일로 아이디 수신
[비밀번호 찾기] 아이디+이메일 → 메일로 코드 → 코드+새 비밀번호 → 다시 로그인
[AI 답장]       폰에서 마스킹 → POST /ai/reply → 요약·답장 3개 → 폰에서 이름 복원·로컬 저장
```

| 단계 | 호출 | 프론트가 할 일 |
|---|---|---|
| 1 | `GET /terms` | 가입 화면에 약관 목록을 그리고, 각 약관 `id`를 저장 |
| 2 | `POST /auth/username/check` | 아이디 입력 중 사용 가능 여부 표시 |
| 3 | `POST /auth/signup` | 201의 `tokens`를 저장 (가입 즉시 로그인 상태) |
| 4 | `POST /auth/login` | **아이디**와 비밀번호로 로그인 (다른 기기·로그아웃 후) |
| 5 | `POST /auth/refresh` | 앱을 켤 때, 액세스 토큰 만료(401) 시 호출. 응답의 **새 refreshToken으로 교체 저장** |
| 6 | `GET /models/latest` | 모델 정보와 다운로드 URL을 받음 (현재 시드 없음, 404 정상) |
| 7 | `POST /auth/logout` | 204 후 로컬 토큰 삭제. 이 기기 세션만 끊김 |
| 8 | `DELETE /users/me` | 204 후 기기 내 데이터 삭제 |
| 9 | `POST /auth/username/find` | 이메일로 아이디 찾기. 204는 가입 여부와 무관 |
| 10 | `POST /auth/password/forgot`, `/auth/password/reset` | 코드 받기 → 코드와 새 비밀번호 입력. 성공하면 모든 기기 로그아웃 |
| 11 | `POST /ai/reply` | 마스킹한 메시지를 보내 요약·답장 3개를 받음. 서버는 저장하지 않음 (2.14) |

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
  \"email\": \"$EMAIL\",
  \"password\": \"$PW\",
  \"termsAgreements\": [$TERM_IDS]
}"
```

응답 201 (가입하면 바로 토큰을 줍니다)
```json
{
  "user": { "id": "uuid", "username": "user_1700000000", "name": "홍길동", "email": "test@example.com" },
  "tokens": { "accessToken": "eyJ...", "refreshToken": "XIt...", "expiresIn": 1800 }
}
```

| 에러 | 의미 |
|---|---|
| 409 `USERNAME_ALREADY_EXISTS` | 이미 사용 중인 아이디 |
| 422 `REQUIRED_TERMS_NOT_AGREED` | 필수 약관에 `agreed: true`가 없음 |
| 400 `VALIDATION_FAILED` / `INVALID_EMAIL_FORMAT` | 입력값 오류 (`details` 확인) |

> 이메일은 인증하지 않고 중복도 막지 않습니다. 오타가 나면 찾기 메일이 가지 않으니, 가입 화면에서 이메일을 두 번 입력받는 것을 권합니다.

### 2.4 로그인

```bash
curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PW\",\"deviceId\":\"my-phone-1\"}"
```

> **이메일로는 로그인할 수 없습니다.** `email` 필드를 보내면 400입니다.

| 응답 | 의미 |
|---|---|
| 200 `{ user, tokens }` | 성공 |
| 401 `INVALID_CREDENTIALS` | 아이디 또는 비밀번호 불일치. 5번 연속 틀리면 5분 잠기는데, 잠긴 동안은 맞는 비밀번호도 같은 401이고 잠겼다는 안내는 오지 않음 |

`deviceId`는 선택입니다. 기기별로 세션을 나눕니다.

```bash
ACCESS=eyJ...   # 가입/로그인 응답의 tokens.accessToken
REFRESH=XIt...  # 가입/로그인 응답의 tokens.refreshToken
```

### 2.7 내 정보

```bash
curl -s "$BASE/users/me" -H "Authorization: Bearer $ACCESS"
```

응답 200 `{ id, username, name, email, birthdate, gender, provider, createdAt, termsAgreements }`
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

### 2.12 아이디 찾기

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/auth/username/find" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}"
```

응답 204. **가입 여부와 관계없이 항상 같습니다.** 아이디는 응답이 아니라 이메일로만 갑니다. 같은 이메일로 만든 계정이 여럿이면 한 통에 모두 보냅니다. 앱 문구는 "가입된 이메일이라면 아이디를 보냈습니다"처럼 쓰세요. 1분에 3회까지입니다.

### 2.13 비밀번호 찾기

1단계: 코드 받기 (아이디와 가입 이메일이 모두 맞아야 메일이 갑니다. 응답은 항상 204)

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/auth/password/forgot" \
  -H 'Content-Type: application/json' -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\"}"
```

2단계: 메일의 6자리 코드와 새 비밀번호

```bash
CODE=123456
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/auth/password/reset" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"code\":\"$CODE\",\"newPassword\":\"newpass5678\"}"
```

| 응답 | 의미 |
|---|---|
| 204 | 변경됨. **모든 기기의 세션이 끊기니** 로그인 화면으로 보내 새 비밀번호로 다시 로그인 |
| 400 `VERIFICATION_CODE_INVALID` | 코드 틀림, 만료(10분), 5회 초과, 없는 아이디 (구분하지 않음) |
| 400 `VALIDATION_FAILED` | 코드가 6자리 숫자가 아니거나 새 비밀번호가 규칙(8~72자, 영문+숫자)에 안 맞음 |

같은 이메일 주소로는 60초에 한 통, 24시간에 10통까지만 메일이 나갑니다(막혀도 응답은 같은 204).

### 2.14 AI 답장

> 자세한 계약은 `Doc/AI_답장_API_명세.md`를 봅니다. 서버에 `OPENROUTER_API_KEY`와 `AI_MODEL`이 없으면 503입니다.

**보내기 전에 앱에서 마스킹합니다.** 앱 마스킹 모듈(`maskPii`)이 개인정보를 `[이름1]`, `[전화번호1]`, `[계좌번호1]` 같은 자리표시로 바꿉니다.

```bash
curl -s -X POST "$BASE/ai/reply" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"text":"[이름1]: 이번 주 금요일에 저녁 먹을래?","relation":"FRIEND","needsDecision":true}'
```

응답 200
```json
{
  "summary": "상대가 금요일 저녁 식사를 제안했어요.",
  "replies": [
    { "label": "수락", "text": "좋아! 금요일에 보자" },
    { "label": "보류", "text": "일정 확인하고 알려줄게" },
    { "label": "거절", "text": "이번 주는 어려울 것 같아" }
  ]
}
```

| 응답 | 의미 |
|---|---|
| 200 | 결과의 자리표시자를 `unmaskPii`로 되돌려 로컬 DB에 저장 |
| 400 `UNMASKED_CONTENT` | 마스킹 누락(`details.reason`: `phone`, `email`, `url`, `account`, `national_id`). 앱 버그로 기록 |
| 400 `VALIDATION_FAILED` | 입력 오류, 1,000자 초과, `model`·`messages` 같은 필드를 보냄 |
| 429 `RATE_LIMITED` | 사용자별 분당 10회, 하루 300회 초과 |
| 502 / 503 / 504 | AI 서버 문제. 자동 재시도하지 말고 "다시 시도" 버튼 |

## 3. 공통 주의

- **에러 분기는 `error.code`로** 합니다. `message`는 사용자에게 보여줄 한국어 문장입니다.
- **429 `RATE_LIMITED`** 에는 `Retry-After: 60` 헤더가 옵니다. 그 시간 뒤에 다시 시도합니다.
- 요청 본문에 DTO에 없는 필드가 있으면 400으로 거부됩니다. 메시지 내용은 **AI 답장(`/ai/reply`)에 마스킹한 뒤에만** 보내고, 다른 요청에는 보내지 않습니다.
- 이메일과 아이디는 서버에서 소문자로 바꾸고 앞뒤 공백을 지웁니다.
- 기존 테스트 계정에는 마이그레이션이 임시 아이디(`u` + 12자리)를 줬습니다. 아이디를 모르면 "아이디 찾기"를 씁니다.
- **자동 로그인:** 앱을 켤 때마다 저장된 refreshToken으로 `POST /auth/refresh`를 호출하면 됩니다. 갱신할 때마다 만료가 30일 연장되므로 자주 쓰면 계속 유지됩니다. 갱신 요청은 앱 안에서 **한 곳에서만** 보내세요(동시에 두 곳이 같은 토큰을 쓰면 세션이 끊깁니다).
- 액세스 토큰 저장 위치는 프론트가 정합니다. 리프레시 토큰은 안전한 저장소에 두세요.

## 4. 검증 상태

- 위 흐름(가입 즉시 토큰, 갱신 후 기존 액세스 토큰 유효, 만료 연장, 로그아웃 후 401, 다른 기기 세션 유지, 아이디·비밀번호 찾기)은 `test/auth-flow.e2e-spec.ts`, `test/account-recovery.e2e-spec.ts`로 자동 검증합니다. AI 답장은 `test/ai-reply.e2e-spec.ts`가 가짜 OpenRouter 서버로 검증합니다(실제 OpenRouter 호출은 아직 미검증).
- 이 문서의 curl 명령은 코드와 e2e 테스트 기준으로 작성했습니다. **SMTP가 설정되지 않은 환경에서는 아이디·비밀번호 찾기 메일이 가지 않습니다**(응답은 204로 같음). 메일 설정 후 한 번 손으로 실행해 확인하는 것을 권합니다.
