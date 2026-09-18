#!/bin/bash
# 用指定代码包覆盖 40 上的 IRC 代码，不改 .env / live_poll / secrets。
# 用法：bash rollback-from-snapshot.sh /home/winit/.agents/backups/internal-review-copilot/irc-code-20260918_current.tgz
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
BAK=/home/winit/.agents/backups/internal-review-copilot
OUT="$DEST/_runs/live_poll"
SNAP="${1:-}"
if [ -z "$SNAP" ] || [ ! -f "$SNAP" ]; then
  echo "usage: bash rollback-from-snapshot.sh <irc-code-XXXX.tgz>"
  echo "available:"
  ls -lh "$BAK"/irc-code-*.tgz 2>/dev/null || true
  exit 1
fi
mkdir -p "$BAK" "$DEST/logs" "$OUT"
BEFORE="$BAK/irc-code-before-rollback-$(date +%Y%m%d_%H%M%S).tgz"
cd "$DEST"
tar --exclude='.env' --exclude='node_modules' --exclude='_runs/live_poll' --exclude='logs' \
  -czf "$BEFORE" lib scripts knowledge prompts docs config README.md package.json .env.example 2>/dev/null || true
echo "saved current to $BEFORE"
cp -a "$DEST/.env" /tmp/irc.env.bak.rollback
tar -xzf "$SNAP" -C "$DEST"
cp -a /tmp/irc.env.bak.rollback "$DEST/.env"
cd "$DEST"
npx tsx scripts/test-t1-sku-relabel-check.ts >/tmp/irc-rollback-test.log 2>&1 || \
  npx tsx scripts/test-feishu-card.ts >/tmp/irc-rollback-test.log 2>&1 || true
tail -n 20 /tmp/irc-rollback-test.log || true
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 8
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 12
tmux ls
echo "rolled back from $SNAP"
echo "env untouched; live_poll untouched"
