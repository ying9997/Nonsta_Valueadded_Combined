#!/bin/bash
set -euo pipefail
DEST="$HOME/.agents/services/internal-review-copilot"
OLD="$DEST/_runs/live_poll"
NEW="$HOME/.agents/services/_runs/live_poll"
python3 - <<'PY'
import json, os
old_p = os.path.expanduser("~/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
new_p = os.path.expanduser("~/.agents/services/_runs/live_poll/case-store.json")
old = json.load(open(old_p, encoding="utf-8"))
new = json.load(open(new_p, encoding="utf-8"))
by = {c["vascNo"]: c for c in old.get("cases", [])}
for c in new.get("cases", []):
    by[c["vascNo"]] = c
old["cases"] = sorted(by.values(), key=lambda x: x["vascNo"])
old["updatedAt"] = new.get("updatedAt") or old.get("updatedAt")
json.dump(old, open(old_p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("merged_cases", len(old["cases"]))

def load_details(p):
    if not os.path.exists(p):
        return []
    raw = json.load(open(p, encoding="utf-8"))
    return raw if isinstance(raw, list) else raw.get("details") or []

old_d_p = os.path.expanduser("~/.agents/services/internal-review-copilot/_runs/live_poll/details.json")
new_d_p = os.path.expanduser("~/.agents/services/_runs/live_poll/details.json")
old_d = load_details(old_d_p)
new_d = load_details(new_d_p)
byd = {d.get("orderNo"): d for d in old_d if d.get("orderNo")}
for d in new_d:
    if d.get("orderNo"):
        byd[d["orderNo"]] = d
merged = list(byd.values())
json.dump(merged, open(old_d_p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("merged_details", len(merged))
PY

mkdir -p "$DEST/logs"
cd "$DEST"
OUT="$DEST/_runs/live_poll"
tmux kill-session -t irc-poll 2>/dev/null || true
tmux kill-session -t irc-listen 2>/dev/null || true
tmux new-session -d -s irc-poll "cd '$DEST'; npx tsx scripts/poll-and-assess.ts --interval 600 --card --out '$OUT' 2>&1 | tee -a logs/poll.log"
tmux new-session -d -s irc-listen "cd '$DEST'; npx tsx scripts/listen-card-actions.ts --store '$OUT/case-store.json' --input '$OUT/details.json' --out '$OUT' 2>&1 | tee -a logs/listen.log"
sleep 4
tmux ls
echo '=== listen head ==='
tail -n 20 "$DEST/logs/listen.log" || true
echo '=== poll head ==='
tail -n 15 "$DEST/logs/poll.log" || true
echo '=== cards ==='
ls "$DEST/knowledge/scenario-cards/"*.json | wc -l
