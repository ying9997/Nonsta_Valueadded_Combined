#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
mkdir -p "$DEST/logs" "$OUT" "$DEST/_runs/20260917_clarification_exception"
echo "=== cookie ==="
python3 /home/winit/AI_EXPERT/TOM/共享认证/auto_login.py || true
echo "=== stop poll ==="
tmux kill-session -t irc-poll 2>/dev/null || true
sleep 3
echo "=== catchup ==="
cd "$DEST"
npx tsx scripts/send-pending-clarifications.ts --store _runs/live_poll/case-store.json --out _runs/live_poll
echo "=== restart poll ==="
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
sleep 8
tmux ls
echo "=== report ==="
tail -n 40 "$DEST/_runs/20260917_clarification_exception/result.md" || true
echo "=== poll_start ==="
grep poll_start "$DEST/logs/poll.log" | tail -n 2
