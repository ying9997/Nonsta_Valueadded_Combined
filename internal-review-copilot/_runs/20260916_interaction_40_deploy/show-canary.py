#!/usr/bin/env python3
import json
from pathlib import Path

base = Path("/home/winit/.agents/services/internal-review-copilot/_runs/live_poll")
d = json.loads((base / "case-store.json").read_text(encoding="utf-8"))
m = d.get("_meta") or {}
print("meta", json.dumps({k: m.get(k) for k in ["canaryCount", "canaryMode", "canaryPromoted", "canaryLimitNotified", "canaryOrderNos"]}, ensure_ascii=False))
h = base / "hourly-count.json"
print("hourly", h.read_text(encoding="utf-8")[:800] if h.exists() else "missing")
