#!/bin/bash
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
OUT="$DEST/_runs/live_poll"
mkdir -p "$DEST/logs" "$OUT"
cp -a "$DEST/.env" /tmp/irc.env.bak.20260917-human-sop-dm
tar -xzf /tmp/irc-20260917-human-sop-dm.tgz -C "$DEST"
cp -a /tmp/irc.env.bak.20260917-human-sop-dm "$DEST/.env"
test -f "$DEST/lib/human-sop-alert.ts"
grep -q isHumanSopAlreadyFilled "$DEST/lib/oms-draft-write.ts"
grep -q notifyOwnerHumanSopFilled "$DEST/scripts/poll-and-assess.ts"
grep -q handleWriteGuardReject "$DEST/scripts/listen-card-actions.ts"
grep -q human_sop_filled_dm_only "$DEST/scripts/send-pending-clarifications.ts"
python3 - <<'PY'
import json
from pathlib import Path
p = Path("/home/winit/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
data = json.loads(p.read_text(encoding="utf-8"))
changed = False
for rec in data.get("cases") or []:
    if rec.get("vascNo") != "VASC000000370947":
        continue
    rec["failureType"] = "human_sop_filled"
    rec["reviewRemark"] = "人工 SOP 已填：不建群话题，只私聊金萤（存量单标记，不再群补发）"
    changed = True
    break
if changed:
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("marked_370947=human_sop_filled")
else:
    print("marked_370947=missing")
PY
cd "$DEST"
npx tsx scripts/test-oms-draft-write.ts --local-only
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
echo "=== listen tail ==="
tail -n 15 "$DEST/logs/listen.log"
echo "=== env keys ==="
grep -E '^(FEISHU_TEST_CHAT_ID|OMS_WRITE_ENABLED|BREAKER_ALERT_USER_ID|FEISHU_APP_ID|LISTEN_IM)=' "$DEST/.env" || true
