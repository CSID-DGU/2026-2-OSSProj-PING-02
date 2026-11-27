#!/usr/bin/env bash
# 운영 서버 배포 (#64). 서버에서 레포 폴더 아무 곳에서나 실행한다.
#
#   bash Src/Back/scripts/deploy.sh
#
# 순서: 사전 점검 → 팀 레포 main 받기 → 이미지 빌드 → 컨테이너 교체 → 상태 확인
# - 빌드가 실패하면 그 자리에서 멈춘다. 돌고 있는 컨테이너는 건드리지 않으므로 서비스는 그대로 유지된다.
# - .env 값은 출력하지 않는다(키 이름만 확인).
#
# 옵션 (환경변수)
#   DEPLOY_SKIP_PULL=1   git pull 을 건너뛴다 (지금 받아 둔 코드로 다시 빌드할 때, 로컬 테스트용)
#   DEPLOY_REPO_URL=...  받을 레포 (기본: 팀 레포)
#   DEPLOY_BRANCH=...    받을 브랜치 (기본: main)
#   DEPLOY_HEALTH_TIMEOUT=120  backend 가 healthy 가 될 때까지 기다리는 최대 초

set -euo pipefail

REPO_URL="${DEPLOY_REPO_URL:-https://github.com/CSID-DGU/2026-2-OSSProj-PING-02.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
HEALTH_TIMEOUT="${DEPLOY_HEALTH_TIMEOUT:-120}"
CONTAINERS=(malssiat-postgres malssiat-backend malssiat-caddy)

BACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(git -C "$BACK_DIR" rev-parse --show-toplevel)"

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '  [OK] %s\n' "$*"; }
warn() { printf '  [주의] %s\n' "$*"; }
fail() {
  printf '  [실패] %s\n' "$*" >&2
  exit 1
}

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose --profile app)
else
  fail "docker compose 를 찾을 수 없습니다. Docker 가 설치·실행 중인지 확인하세요."
fi
compose() { (cd "$BACK_DIR" && "${COMPOSE[@]}" "$@"); }

# .env 에서 키 값을 읽는다 (따옴표 제거). 값은 화면에 출력하지 않는다.
env_value() {
  local line
  line="$(grep -E "^[[:space:]]*$1=" "$BACK_DIR/.env" | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%$'\r'}"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

# ── 1. 사전 점검 ───────────────────────────────────────────
step "1/5 사전 점검"

docker info >/dev/null 2>&1 || fail "Docker 데몬에 연결할 수 없습니다. 'sudo systemctl start docker' 후 다시 실행하세요."
ok "Docker 실행 중"

if command -v systemctl >/dev/null 2>&1; then
  if [ "$(systemctl is-enabled docker 2>/dev/null || true)" = "enabled" ]; then
    ok "부팅 시 Docker 자동 시작"
  else
    warn "부팅 시 Docker 가 자동으로 켜지지 않습니다. 'sudo systemctl enable docker' 를 권장합니다."
  fi
fi

[ -f "$BACK_DIR/.env" ] || fail "Src/Back/.env 가 없습니다. .env.example 을 복사해 값을 채우세요."
missing=()
for key in JWT_SECRET DB_PASSWORD; do
  [ -n "$(env_value "$key")" ] || missing+=("$key")
done
# DOMAIN 은 compose 가 caddy 에 넣는 값이라 셸 환경변수가 .env 보다 우선한다 (compose 규칙과 같게)
[ -n "${DOMAIN:-}" ] || [ -n "$(env_value DOMAIN)" ] || missing+=(DOMAIN)
[ ${#missing[@]} -eq 0 ] || fail ".env 에 값이 비어 있습니다: ${missing[*]}"
ok ".env 필수 값 있음 (JWT_SECRET, DB_PASSWORD, DOMAIN)"
[ "$(env_value DB_PASSWORD)" != "malssiat" ] || warn "DB_PASSWORD 가 기본값입니다. 운영에서는 바꾸세요 (배포 체크리스트 2장)."

provider="$(env_value AI_PROVIDER | tr '[:upper:]' '[:lower:]')"
case "$provider" in
  "" | openrouter) [ -n "$(env_value OPENROUTER_API_KEY)" ] || warn "OPENROUTER_API_KEY 가 비어 있어 AI 답장(/v1/ai/reply)이 503 입니다." ;;
  anthropic) [ -n "$(env_value ANTHROPIC_API_KEY)" ] && [ -n "$(env_value ANTHROPIC_MODEL)" ] || warn "AI_PROVIDER=anthropic 인데 ANTHROPIC_API_KEY 또는 ANTHROPIC_MODEL 이 비어 있어 AI 답장이 503 입니다." ;;
  *) warn "AI_PROVIDER 값을 알 수 없습니다 (openrouter 또는 anthropic). AI 답장이 503 입니다." ;;
esac

if [ "${DEPLOY_SKIP_PULL:-0}" != "1" ] && [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]; then
  git -C "$REPO_DIR" status --short --untracked-files=no
  fail "서버에서 직접 고친 파일이 있습니다(위 목록). 내용을 확인한 뒤 정리하고 다시 실행하세요."
fi
[ "${DEPLOY_SKIP_PULL:-0}" = "1" ] || ok "고친 파일 없음"

PREV_COMMIT="$(git -C "$REPO_DIR" rev-parse --short HEAD)"

# ── 2. 최신 코드 받기 ──────────────────────────────────────
step "2/5 최신 코드 받기 ($BRANCH)"
if [ "${DEPLOY_SKIP_PULL:-0}" = "1" ]; then
  warn "DEPLOY_SKIP_PULL=1: 받지 않고 지금 코드($PREV_COMMIT)로 진행합니다."
else
  git -C "$REPO_DIR" pull --ff-only "$REPO_URL" "$BRANCH" ||
    fail "fast-forward 로 받을 수 없습니다. 서버에만 있는 커밋이 있는지 'git log' 로 확인하세요."
fi
NEW_COMMIT="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
ok "$PREV_COMMIT → $NEW_COMMIT  $(git -C "$REPO_DIR" log -1 --format=%s)"

# ── 3. 이미지 빌드 (실패해도 돌고 있는 서비스는 그대로) ──────
step "3/5 이미지 빌드"
if ! compose build; then
  fail "빌드에 실패했습니다. 돌고 있는 컨테이너는 바꾸지 않았습니다(이전 버전으로 계속 동작).
         코드를 되돌리려면: git -C \"$REPO_DIR\" reset --hard $PREV_COMMIT"
fi
ok "빌드 완료"

# ── 4. 컨테이너 교체 ───────────────────────────────────────
step "4/5 컨테이너 교체"
compose up -d --remove-orphans
ok "up -d 완료"

# ── 5. 상태 확인 ───────────────────────────────────────────
step "5/5 상태 확인"
deadline=$((SECONDS + HEALTH_TIMEOUT))
status=""
while [ $SECONDS -lt $deadline ]; do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' malssiat-backend 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  sleep 3
done
if [ "$status" != "healthy" ]; then
  echo "  --- backend 로그 (마지막 30줄) ---"
  compose logs --tail 30 backend || true
  fail "backend 가 ${HEALTH_TIMEOUT}초 안에 healthy 가 되지 않았습니다 (상태: $status).
         이전 버전으로 되돌리려면: git -C \"$REPO_DIR\" reset --hard $PREV_COMMIT && DEPLOY_SKIP_PULL=1 bash \"$0\""
fi
ok "backend healthy"

# 앱이 실제로 요청에 답하는지 (5xx 가 아니면 정상: 버전 확인 API 는 쿼리가 없으면 400 을 준다)
if docker exec malssiat-backend node -e "fetch('http://127.0.0.1:5010/v1/app/version').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"; then
  ok "API 응답 정상 (/v1/app/version)"
else
  warn "API 가 5xx 를 주거나 응답하지 않습니다. 'docker compose --profile app logs backend' 로 확인하세요."
fi

for c in "${CONTAINERS[@]}"; do
  line="$(docker inspect -f '{{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}}' "$c" 2>/dev/null || echo 'missing')"
  case "$line" in
    "running restart=unless-stopped") ok "$c: $line" ;;
    *) warn "$c: $line (running, unless-stopped 여야 합니다)" ;;
  esac
done

printf '\n\033[1m배포 완료: %s\033[0m\n' "$NEW_COMMIT"
