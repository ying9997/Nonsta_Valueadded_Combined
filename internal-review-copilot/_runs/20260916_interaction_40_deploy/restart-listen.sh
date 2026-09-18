#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 90
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 25
echo "=== tmux ==="
tmux ls
echo "=== listen last 30 ==="
tail -n 30 "$DEST/logs/listen.log"
