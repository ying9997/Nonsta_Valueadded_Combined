#!/usr/bin/env python3
"""Patch only rate-limit / OMS write keys. Do not print secrets."""
from pathlib import Path

p = Path("/home/winit/.agents/services/internal-review-copilot/.env")
text = p.read_text(encoding="utf-8")
updates = {
    "OMS_WRITE_ENABLED": "1",
    "OMS_WRITE_ALLOWLIST": "*",
    "CANARY_MODE": "1",
    "CANARY_CHAT_ID": "oc_80b07f38ed6833df3787a97a496f1097",
    "CANARY_LIMIT": "2",
    "MAX_PER_POLL": "2",
    "MAX_PER_HOUR": "10",
}
lines = text.splitlines()
seen = set()
out = []
for line in lines:
    stripped = line.strip()
    if stripped and not stripped.startswith("#") and "=" in stripped:
        key = stripped.split("=", 1)[0].strip()
        if key in updates:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
            continue
    out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print("patched", ",".join(sorted(updates)))
