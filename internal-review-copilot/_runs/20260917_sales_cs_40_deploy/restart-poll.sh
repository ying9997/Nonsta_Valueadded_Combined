#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
echo "=== keys ==="
grep -E '^(FEISHU_TEST_CHAT_ID|CANARY_CHAT_ID|CANARY_MODE|FEISHU_APP_ID)=' "$DEST/.env"
tmux kill-session -t irc-poll 2>/dev/null || true
sleep 3
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
sleep 14
echo "=== tmux ==="
tmux ls
echo "=== poll_start ==="
grep poll_start "$DEST/logs/poll.log" | tail -n 3
echo "=== poll tail ==="
tail -n 25 "$DEST/logs/poll.log"
