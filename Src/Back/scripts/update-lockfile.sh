#!/usr/bin/env bash
# package.json 을 바꾼 뒤 package-lock.json 을 다시 만든다 (#64).
#
#   bash Src/Back/scripts/update-lockfile.sh
#
# PC 마다 npm 버전이 달라서 lockfile 모양이 달라질 수 있다. npm 11 이 만든 lockfile 은 npm 10 이 거부해서
# 서버 빌드가 깨진 적이 있다. 그래서 Docker 의 node:22-alpine 기본 npm(10)으로 만든다.
# npm 10 이 만든 lockfile 은 npm 10·11 모두 받아들이므로 팀원 PC와 서버(Dockerfile, npm 11) 모두에서 npm ci 가 된다.
#
# lockfile 에 이미 적힌 패키지 버전은 올리지 않는다 (--package-lock-only). lockfile 에 빠진 항목만 새로 채운다.
# 끝나면 Dockerfile 과 같은 npm 으로 npm ci 가 되는지 확인한다.

set -euo pipefail

BACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="node:22-alpine"
NPM_VERSION="$(sed -n 's/^ARG NPM_VERSION=//p' "$BACK_DIR/Dockerfile" | head -n 1)"
[ -n "$NPM_VERSION" ] || { echo "Dockerfile 에서 NPM_VERSION 을 찾지 못했습니다." >&2; exit 1; }

# Windows Git Bash 에서는 docker 에 Windows 경로를 넘긴다
MOUNT_DIR="$BACK_DIR"
if command -v cygpath >/dev/null 2>&1; then MOUNT_DIR="$(cygpath -w "$BACK_DIR")"; fi
run() { MSYS_NO_PATHCONV=1 docker run --rm -v "$MOUNT_DIR:/app" -w /app "$IMAGE" sh -c "$1"; }

echo "== lockfile 다시 만들기 ($IMAGE 기본 npm)"
run 'npm --version && npm install --package-lock-only --ignore-scripts --no-audit --no-fund'

echo "== 확인: 기본 npm 으로 npm ci"
run 'npm ci --dry-run --ignore-scripts --no-audit --no-fund >/dev/null && echo OK'

echo "== 확인: Dockerfile 의 npm@$NPM_VERSION 으로 npm ci"
run "npm install -g npm@$NPM_VERSION >/dev/null 2>&1 && npm ci --dry-run --ignore-scripts --no-audit --no-fund >/dev/null && echo OK"

echo
echo "완료. 'git diff --stat Src/Back/package-lock.json' 으로 바뀐 줄을 확인하고 package.json 과 같이 커밋하세요."
