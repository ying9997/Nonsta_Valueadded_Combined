#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
python3 - <<'PY'
import json
from pathlib import Path
p = Path("/home/winit/.agents/services/internal-review-copilot/knowledge/scenario-cards/instock_ownership_transfer.json")
c = json.loads(p.read_text(encoding="utf-8"))
assert c["status"] == "supported", c["status"]
assert c["omsSceneCode"] == "【In-warehouse】Transfer of ownership of goods", c.get("omsSceneCode")
print("card_ok", c["sceneKey"], c["status"])
PY
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
echo "=== poll tail ==="
tail -n 12 "$DEST/logs/poll.log"
echo "=== listen tail ==="
tail -n 8 "$DEST/logs/listen.log"
