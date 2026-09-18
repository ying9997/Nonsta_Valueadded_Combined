#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
mkdir -p "$DEST/logs" "$OUT"
cp -a "$DEST/.env" /tmp/irc.env.bak.20260917-sales-cs
tar -xzf /tmp/irc-20260917-sales-cs.tgz -C "$DEST"
cp -a /tmp/irc.env.bak.20260917-sales-cs "$DEST/.env"
python3 /tmp/patch-40-env-sales-cs.py
python3 /tmp/reset-canary-sales-cs.py
echo "=== env keys ==="
grep -E '^(FEISHU_TEST_CHAT_ID|OMS_WRITE_ENABLED|OMS_WRITE_ALLOWLIST|RAG_ENABLED|MAX_PER_POLL|MAX_PER_HOUR|CANARY_MODE|CANARY_CHAT_ID|CANARY_LIMIT|BREAKER_ALERT_USER_ID|FEISHU_APP_ID|LISTEN_IM)=' "$DEST/.env" || true
echo "=== markers ==="
test -f "$DEST/lib/sales-cs-lookup.ts" && echo sales_cs_lookup=yes
test -f "$DEST/config/exception-group-roster.json" && echo roster=yes
grep -c resolvePersonnelFromDetailLive "$DEST/lib/personnel.ts"
python3 - <<'PY'
import json
from pathlib import Path
p = json.loads(Path("/home/winit/.agents/services/internal-review-copilot/config/personnel.json").read_text(encoding="utf-8"))
sales = (p.get("default") or {}).get("销售") or {}
print("personnel_sales_name", sales.get("name"))
print("personnel_sales_openid", sales.get("openId"))
PY
test -s "$DEST/.env" && echo env_restored=yes
echo "=== cookie ==="
python3 /home/winit/AI_EXPERT/TOM/共享认证/auto_login.py || true
echo "=== start tmux ==="
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
pkill -f 'lark-cli --profile zengzhi-consult event consume' 2>/dev/null || true
sleep 8
tmux new-session -d -s irc-poll "cd $DEST && npx tsx scripts/poll-and-assess.ts --interval 600 --card --out $OUT 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd $DEST && npx tsx scripts/listen-card-actions.ts --store $OUT/case-store.json --input $OUT/details.json --out $OUT 2>&1 | tee -a logs/listen.log"
sleep 18
echo "=== tmux ==="
tmux ls
echo "=== poll_start ==="
grep poll_start "$DEST/logs/poll.log" | tail -n 2
echo "=== poll tail ==="
tail -n 40 "$DEST/logs/poll.log"
echo "=== listen tail ==="
tail -n 20 "$DEST/logs/listen.log"
