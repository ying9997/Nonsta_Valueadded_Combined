import json
from pathlib import Path

p = Path("/home/winit/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
d = json.loads(p.read_text(encoding="utf-8"))
meta = d.get("_meta") or {}
print("meta", json.dumps({
    k: meta.get(k)
    for k in ["canaryCount", "canaryMode", "canaryPromoted", "canaryOrderNos", "canaryReplayedOrderNos"]
}, ensure_ascii=False))
cases = d.get("cases") or []
print("cases", len(cases))
rows = []
for rec in cases:
    if not isinstance(rec, dict):
        continue
    rows.append({
        "vascNo": rec.get("vascNo"),
        "status": rec.get("status"),
        "omsAuditStatus": rec.get("omsAuditStatus"),
        "omsWriteAttempts": rec.get("omsWriteAttempts"),
        "updatedAt": rec.get("updatedAt"),
        "feishuTopicId": rec.get("feishuTopicId"),
        "salesRep": rec.get("salesRep"),
        "csRep": rec.get("csRep"),
        "customer": rec.get("customer"),
    })
rows.sort(key=lambda x: str(x.get("updatedAt") or ""), reverse=True)
print("latest")
print(json.dumps(rows[:8], ensure_ascii=False, indent=2))
written = [r for r in rows if r.get("status") in ("written_back", "needs_attachment") or (r.get("omsWriteAttempts") or 0) > 0]
print("write-ish", json.dumps(written[-5:], ensure_ascii=False, indent=2))
