from pathlib import Path

p = Path("/home/winit/.agents/services/internal-review-copilot/.env")
text = p.read_text(encoding="utf-8")
updates = {
    "CANARY_MODE": "1",
    "CANARY_CHAT_ID": "oc_80b07f38ed6833df3787a97a496f1097",
    "CANARY_LIMIT": "5",
    "BREAKER_ALERT_USER_ID": "ou_d09d7409a63201462177f4d8a8b1ac7b",
    "MAX_PER_HOUR": "3",
    "MAX_PER_POLL": "2",
}
keys = set()
out = []
for line in text.splitlines():
    stripped = line.strip()
    if stripped and not stripped.startswith("#") and "=" in stripped:
        k = stripped.split("=", 1)[0]
        if k in updates:
            out.append(f"{k}={updates[k]}")
            keys.add(k)
            continue
    out.append(line)
if keys != set(updates):
    out.append("")
    out.append("# canary / breaker patched 20260916")
    for k, v in updates.items():
        if k not in keys:
            out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print("patched", ",".join(sorted(updates)))
