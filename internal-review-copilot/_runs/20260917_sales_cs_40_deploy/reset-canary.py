#!/usr/bin/env python3
"""Reset canary so LIMIT=2 starts at 0 in the test group."""
import json
from pathlib import Path

p = Path("/home/winit/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
d = json.loads(p.read_text(encoding="utf-8"))
meta = d.get("_meta") or {}
before = {
    "canaryCount": meta.get("canaryCount"),
    "canaryMode": meta.get("canaryMode"),
    "canaryPromoted": meta.get("canaryPromoted"),
    "canaryLimitNotified": meta.get("canaryLimitNotified"),
    "canaryOrderNos": meta.get("canaryOrderNos"),
}
meta.update(
    {
        "canaryCount": 0,
        "canaryMode": "1",
        "canaryLimitNotified": False,
        "canaryOrderNos": [],
        "canaryReplayedOrderNos": [],
        "canaryPromoted": False,
    }
)
d["_meta"] = meta
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("before", json.dumps(before, ensure_ascii=False))
print(
    "after",
    json.dumps(
        {
            k: meta.get(k)
            for k in ["canaryCount", "canaryMode", "canaryPromoted", "canaryLimitNotified", "canaryOrderNos"]
        },
        ensure_ascii=False,
    ),
)
