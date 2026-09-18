import json, os
p = os.path.expanduser("~/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
d = json.load(open(p, encoding="utf-8"))
meta = d.get("_meta") or {}
print("canaryPromoted", meta.get("canaryPromoted"))
print("canaryMode", meta.get("canaryMode"))
print("canaryCount", meta.get("canaryCount"))
print("canaryOrderNos", ",".join(meta.get("canaryOrderNos") or []))
print("replayed", ",".join(meta.get("canaryReplayedOrderNos") or []))
found = False
for c in d.get("cases") or []:
    if c.get("vascNo") == "VASC000000342198":
        found = True
        print("status", c.get("status"))
        print("failureType", c.get("failureType"))
        print("llmError", (c.get("llmError") or "")[:160])
        print("customer", c.get("customer"))
        title = ((c.get("lastCard") or {}).get("header") or {}).get("title") or {}
        print("lastCard_title", title.get("content"))
        break
if not found:
    print("342198 not in 40 store")
