#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
mkdir -p "$DEST/logs" "$OUT"
cp -a "$DEST/.env" /tmp/irc.env.bak.20260916-interaction
tar -xzf /tmp/irc-20260916-interaction.tgz -C "$DEST"
cp -a /tmp/irc.env.bak.20260916-interaction "$DEST/.env"
python3 /tmp/reset-canary.py
echo "=== env keys ==="
grep -E '^(FEISHU_TEST_CHAT_ID|OMS_WRITE_ENABLED|OMS_WRITE_ALLOWLIST|RAG_ENABLED|MAX_PER_POLL|MAX_PER_HOUR|CANARY_MODE|CANARY_CHAT_ID|CANARY_LIMIT|BREAKER_ALERT_USER_ID|FEISHU_APP_ID)=' "$DEST/.env"
echo "=== markers ==="
grep -c DEFAULT_UNBLOCK_WAREHOUSE_ACTIONS "$DEST/lib/oms-draft-write.ts"
grep -c warehouseActions "$DEST/lib/auto-oms-write.ts"
grep -c sop_written_notice "$DEST/scripts/poll-and-assess.ts"
test -s "$DEST/.env" && echo env_restored=yes
echo "=== start tmux ==="
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 10
echo "=== tmux ==="
tmux ls
echo "=== poll tail ==="
tail -n 30 "$DEST/logs/poll.log"
echo "=== listen tail ==="
tail -n 20 "$DEST/logs/listen.log"
