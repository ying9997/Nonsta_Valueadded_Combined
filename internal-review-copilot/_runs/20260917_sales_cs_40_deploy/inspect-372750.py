import json
from pathlib import Path

p = Path("/home/winit/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
d = json.loads(p.read_text(encoding="utf-8"))
meta = d.get("_meta") or {}
print(
    "canary",
    json.dumps(
        {k: meta.get(k) for k in ["canaryCount", "canaryMode", "canaryPromoted", "canaryOrderNos"]},
        ensure_ascii=False,
    ),
)
def walk(obj):
    if isinstance(obj, dict):
        if str(obj.get("vascNo") or obj.get("orderNo") or "") == "VASC000000372750":
            return obj
        if "VASC000000372750" in obj:
            hit = obj["VASC000000372750"]
            return hit if isinstance(hit, dict) else obj
        for value in obj.values():
            found = walk(value)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = walk(item)
            if found:
                return found
    return {}


c = walk(d)
print("found", bool(c), "keys", sorted(c.keys())[:40] if c else [])
for key in [
    "salesRep",
    "csRep",
    "status",
    "omsAuditStatus",
    "omsWriteAttempts",
    "feishuTopicId",
    "feishuMessageId",
    "notifyChannel",
    "customer",
    "missingFields",
    "processingMethod",
]:
    print(key, json.dumps(c.get(key), ensure_ascii=False))
card = c.get("lastCard")
text = json.dumps(card, ensure_ascii=False) if card is not None else ""
print("lastCard_len", len(text))
for needle in ["销售", "客服", "金萤", "ou_", "<at", "人员"]:
    print("hit", needle, text.count(needle))
print("lastCard_head", text[:2500])
