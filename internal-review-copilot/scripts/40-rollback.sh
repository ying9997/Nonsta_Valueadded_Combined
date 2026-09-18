#!/bin/bash
# 用某次 snapshot 盖回 40 代码。回滚前会再打一份「回滚前」包。不改 .env / live_poll。
#
#   bash scripts/40-rollback.sh
#   bash scripts/40-rollback.sh /home/winit/.agents/backups/internal-review-copilot/irc-code-20260918_current.tgz
set -euo pipefail
DEST="${IRC_DEST:-/home/winit/.agents/services/internal-review-copilot}"
BAK="${IRC_BAK:-/home/winit/.agents/backups/internal-review-copilot}"
OUTDIR="$DEST/_runs/live_poll"
HERE="$(cd "$(dirname "$0")" && pwd)"
SNAP="${1:-}"

if [ -z "$SNAP" ]; then
  SNAP="$(ls -1t "$BAK"/irc-code-*.tgz 2>/dev/null | head -n 1 || true)"
fi
if [ -z "$SNAP" ] || [ ! -f "$SNAP" ]; then
  echo "usage: bash $0 [irc-code-XXXX.tgz]" >&2
  ls -lh "$BAK"/irc-code-*.tgz 2>/dev/null || true
  exit 1
fi

BEFORE="$("$HERE/40-snapshot-code.sh" "before-rollback-$(date +%Y%m%d_%H%M%S)")"
echo "saved current to $BEFORE" >&2
mkdir -p "$DEST/logs" "$OUTDIR"
cp -a "$DEST/.env" /tmp/irc.env.bak.rollback
tar -xzf "$SNAP" -C "$DEST"
cp -a /tmp/irc.env.bak.rollback "$DEST/.env"

tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 8
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUTDIR 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUTDIR/case-store.json --input $OUTDIR/details.json --out $OUTDIR 2>&1 | tee -a logs/listen.log"
sleep 12
tmux ls || true
echo "rolled back from $SNAP"
echo "env/live_poll untouched"
