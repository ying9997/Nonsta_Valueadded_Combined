#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
mkdir -p "$DEST/logs" "$OUT"
cp -a /tmp/irc-wi-putaway/wi-numbers.ts "$DEST/lib/wi-numbers.ts"
cp -a /tmp/irc-wi-putaway/oms-draft-write.ts "$DEST/lib/oms-draft-write.ts"
cp -a /tmp/irc-wi-putaway/generate-text.ts "$DEST/lib/generate-text.ts"
cp -a /tmp/irc-wi-putaway/sop-generate.md "$DEST/prompts/sop-generate.md"
echo "=== markers ==="
grep -c pickPutawayWiNos "$DEST/lib/wi-numbers.ts"
grep -c shouldReplaceNweon "$DEST/lib/oms-draft-write.ts"
grep -c "只填仓库扫描上架" "$DEST/lib/generate-text.ts"
echo "=== restart ==="
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 8
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 12
echo "=== tmux ==="
tmux ls
echo "=== poll start ==="
grep poll_start "$DEST/logs/poll.log" | tail -n 2
echo "=== listen ==="
tail -n 12 "$DEST/logs/listen.log"
