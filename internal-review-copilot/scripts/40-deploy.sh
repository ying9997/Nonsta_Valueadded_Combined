#!/bin/bash
# 固定动作：先 snapshot，再解新包。snapshot 失败则不解包。
# 解包后冒烟失败则自动盖回刚才的 snapshot。
# 不改 .env / live_poll / secrets。
#
#   bash scripts/40-deploy.sh /tmp/irc-patch.tgz
#   bash scripts/40-deploy.sh /tmp/irc-patch.tgz --no-restart
set -euo pipefail
DEST="${IRC_DEST:-/home/winit/.agents/services/internal-review-copilot}"
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
cp -a "$DEST/.env" /tmp/irc.env.bak.deploy
if ! tar -xzf "$NEW_TGZ" -C "$DEST"; then
  rollback_extract
  exit 1
fi
restore_env

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
  tmux kill-session -t irc-poll 2>/dev/null || true
  tmux kill-session -t irc-listen 2>/dev/null || true
  pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
  sleep 8
  tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUTDIR 2>&1 | tee -a logs/poll.log"
  tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUTDIR/case-store.json --input $OUTDIR/details.json --out $OUTDIR 2>&1 | tee -a logs/listen.log"
  sleep 12
  tmux ls || true
fi

echo "deploy ok"
echo "snapshot=$SNAP"
echo "patch=$NEW_TGZ"
echo "env/live_poll untouched"
