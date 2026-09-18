#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
mkdir -p "$DEST/logs" "$OUT"
cp -a "$DEST/.env" /tmp/irc.env.bak.20260917-t1-sku
tar -xzf /tmp/irc-20260917-t1-sku.tgz -C "$DEST"
cp -a /tmp/irc.env.bak.20260917-t1-sku "$DEST/.env"
grep -q t1-sku-relabel-check "$DEST/lib/run-pipeline.ts"
grep -q normalizeMerchandiseCode "$DEST/lib/t1-sku-relabel-check.ts"
cd "$DEST"
npx tsx scripts/test-t1-sku-relabel-check.ts
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
echo "=== env keys ==="
grep -E '^(FEISHU_TEST_CHAT_ID|OMS_WRITE_ENABLED|FEISHU_APP_ID|LISTEN_IM)=' "$DEST/.env" || true
echo "=== listen tail ==="
tail -n 8 "$DEST/logs/listen.log"
