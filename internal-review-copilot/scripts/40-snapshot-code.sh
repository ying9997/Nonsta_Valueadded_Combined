#!/bin/bash
# 给 40 上正在跑的 internal-review-copilot 打一份代码快照（不含 .env / Cookie / live_poll）。
# 成功时只往 stdout 打出包路径；日志走 stderr。
set -euo pipefail
DEST="${IRC_DEST:-/home/winit/.agents/services/internal-review-copilot}"
BAK="${IRC_BAK:-/home/winit/.agents/backups/internal-review-copilot}"
STAMP="${1:-$(date +%Y%m%d_%H%M%S)}"
OUT="$BAK/irc-code-${STAMP}.tgz"

if [ ! -d "$DEST/lib" ]; then
  echo "snapshot abort: missing $DEST/lib" >&2
  exit 1
fi
mkdir -p "$BAK"
cd "$DEST"
INCLUDE="lib scripts knowledge prompts docs config README.md package.json"
[ -f .env.example ] && INCLUDE="$INCLUDE .env.example"
[ -f tsconfig.json ] && INCLUDE="$INCLUDE tsconfig.json"
# shellcheck disable=SC2086
tar --exclude='.env' --exclude='node_modules' --exclude='_runs' --exclude='logs' \
  -czf "$OUT" $INCLUDE
if [ ! -s "$OUT" ]; then
  echo "snapshot abort: empty $OUT" >&2
  exit 1
fi
set +o pipefail
if ! tar -tzf "$OUT" 2>/dev/null | grep -q 'lib/'; then
  echo "snapshot abort: $OUT has no lib/" >&2
  rm -f "$OUT"
  exit 1
fi
set -o pipefail
echo "snapshot ok $OUT ($(du -h "$OUT" | awk '{print $1}'))" >&2
printf '%s\n' "$OUT"
