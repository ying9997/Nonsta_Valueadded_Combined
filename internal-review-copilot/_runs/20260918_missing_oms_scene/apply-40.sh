#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
tar -xzf /tmp/irc-missing-oms.tgz -C "$DEST"
test -f "$DEST/lib/missing-oms-scene.ts"
grep -q resolveSceneOverviewCode "$DEST/lib/oms-draft-write.ts"
grep -q missingOmsScene "$DEST/lib/feishu-card.ts"
cd "$DEST"
npx tsx scripts/test-oms-draft-write.ts --local-only
npx tsx scripts/test-feishu-card.ts
echo "=== cookie ==="
python3 /home/winit/AI_EXPERT/TOM/共享认证/auto_login.py || true
echo "=== rewrite missing oms scene orders ==="
npx tsx scripts/rewrite-missing-oms-scene-orders.ts || echo "rewrite_finished_with_errors"
echo "=== start tmux ==="
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 8
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 16
echo "=== tmux ==="
tmux ls
echo "=== poll_start ==="
grep poll_start "$DEST/logs/poll.log" | tail -n 2
