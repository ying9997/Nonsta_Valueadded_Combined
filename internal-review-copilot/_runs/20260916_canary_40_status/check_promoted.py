import json, os

p = os.path.expanduser("~/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
d = json.load(open(p, encoding="utf-8"))
meta = d.get("_meta") or {}
print("canaryPromoted", meta.get("canaryPromoted"))
print("canaryMode", meta.get("canaryMode"))
print("canaryCount", meta.get("canaryCount"))
print("replayed", ",".join(meta.get("canaryReplayedOrderNos") or []))
print("orderNos", ",".join(meta.get("canaryOrderNos") or []))
by = {c.get("vascNo"): c for c in d.get("cases") or []}
keys = [
    "status",
    "omsWriteStatus",
    "omsWrittenAt",
    "writeStatus",
    "lastOmsWrite",
    "feishuTopicId",
]
for no in meta.get("canaryOrderNos") or []:
    c = by.get(no) or {}
    extra = {k: c.get(k) for k in keys if c.get(k) not in (None, "")}
    print(no, extra or {"status": c.get("status")})
print("370335_keys", sorted((by.get("VASC000000370335") or {}).keys()))
