#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
cp /tmp/irc-wi-putaway/generate-text.ts "$DEST/lib/generate-text.ts"
cp /tmp/irc-wi-putaway/oms-draft-write.ts "$DEST/lib/oms-draft-write.ts"
echo "env_import=$(grep -c 'from \"./env.ts\"' "$DEST/lib/generate-text.ts")"
echo "dup_code=$(grep -c 02040901587 "$DEST/lib/oms-draft-write.ts")"
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 3
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 6
tmux ls
