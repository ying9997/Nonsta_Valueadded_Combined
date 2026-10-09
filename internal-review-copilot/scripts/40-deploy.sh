#!/bin/bash
# 固定动作：先 snapshot，再解新包。snapshot 失败则不解包。
# 解包后冒烟失败则自动盖回刚才的 snapshot。
# 不改 secrets 文件 / live_poll。树内若仍有 .env 会暂存还原（过渡期）。
#
#   bash scripts/40-deploy.sh /tmp/irc-patch.tgz
#   bash scripts/40-deploy.sh /tmp/irc-patch.tgz --no-restart
#
# 默认 DEST=方案 A 新路径。P4 前请加 --no-restart（unit 尚未 enable）。
set -euo pipefail
DEST="${IRC_DEST:-/workspace/projects/value-service/vas-internal-review}"
OUTDIR="$DEST/_runs/live_poll"
HERE="$(cd "$(dirname "$0")" && pwd)"
NEW_TGZ="${1:-}"
NO_RESTART=0
[ "${2:-}" = "--no-restart" ] && NO_RESTART=1

if [ -z "$NEW_TGZ" ] || [ ! -f "$NEW_TGZ" ]; then
  echo "usage: bash $0 <patch.tgz> [--no-restart]" >&2
  exit 1
fi
if [ ! -s "$NEW_TGZ" ]; then
  echo "deploy abort: empty patch $NEW_TGZ" >&2
  exit 1
fi

SNAP="$("$HERE/40-snapshot-code.sh")"
if [ ! -s "$SNAP" ]; then
  echo "deploy abort: snapshot failed, not extracting" >&2
  exit 1
fi

restore_env() {
  if [ -f /tmp/irc.env.bak.deploy ]; then
    cp -a /tmp/irc.env.bak.deploy "$DEST/.env"
  fi
}

rollback_extract() {
  echo "deploy failed, restoring $SNAP" >&2
  tar -xzf "$SNAP" -C "$DEST"
  restore_env
}

mkdir -p "$DEST/logs" "$OUTDIR"
if [ -f "$DEST/.env" ]; then
  cp -a "$DEST/.env" /tmp/irc.env.bak.deploy
else
  rm -f /tmp/irc.env.bak.deploy
fi
if ! tar -xzf "$NEW_TGZ" -C "$DEST"; then
  rollback_extract
  exit 1
fi
restore_env
chmod +x "$DEST/run-poll.sh" "$DEST/run-listen.sh" 2>/dev/null || true
# Windows tar 可能带 CRLF，会导致 systemd ExecStart 127
for _sh in "$DEST/run-poll.sh" "$DEST/run-listen.sh" "$DEST/scripts/40-deploy.sh" "$DEST/scripts/40-snapshot-code.sh" "$DEST/scripts/40-rollback.sh"; do
  if [ -f "$_sh" ]; then
    sed -i 's/\r$//' "$_sh" 2>/dev/null || true
    chmod +x "$_sh" 2>/dev/null || true
  fi
done

cd "$DEST"
SMOKE_LOG=/tmp/irc-deploy-smoke.log
set +e
if [ -f scripts/test-feishu-card.ts ]; then
  npx tsx scripts/test-feishu-card.ts >"$SMOKE_LOG" 2>&1
  SMOKE=$?
else
  SMOKE=0
  echo "no test-feishu-card.ts, skip smoke" >"$SMOKE_LOG"
fi
set -e
if [ "$SMOKE" -ne 0 ]; then
  echo "smoke failed:" >&2
  tail -n 40 "$SMOKE_LOG" >&2 || true
  rollback_extract
  exit 1
fi

if [ "$NO_RESTART" -eq 0 ]; then
  if systemctl --user cat vas-internal-review-poll.service >/dev/null 2>&1; then
    systemctl --user restart vas-internal-review-poll.service || true
    systemctl --user restart vas-internal-review-listen.service || true
    sleep 3
    systemctl --user --no-pager --full status vas-internal-review-poll.service vas-internal-review-listen.service || true
  else
    echo "deploy warn: units not installed; skip restart (use --no-restart or install deploy/*.service first)" >&2
  fi
fi

echo "deploy ok"
echo "snapshot=$SNAP"
echo "patch=$NEW_TGZ"
echo "dest=$DEST"
echo "secrets/live_poll untouched"
