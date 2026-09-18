#!/usr/bin/env python3
import json
p = "/home/winit/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json"
d = json.load(open(p, encoding="utf-8"))
for c in d.get("cases", []):
    print(
        c.get("vascNo"),
        c.get("status"),
        c.get("feishuThreadId") or "-",
        c.get("feishuMessageId") or "-",
        c.get("clarificationSentAt") or "",
    )
