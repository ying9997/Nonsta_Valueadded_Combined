from pathlib import Path

p = Path("/home/winit/.agents/services/internal-review-copilot/.env")
old = "FEISHU_TEST_CHAT_ID=oc_867cf8749520eaa910938681d51f6e41"
new = "FEISHU_TEST_CHAT_ID=oc_6566160ccb2def51937469fe8144efdb"
text = p.read_text(encoding="utf-8")
if old not in text:
    raise SystemExit("expected old FEISHU_TEST_CHAT_ID not found")
p.write_text(text.replace(old, new, 1), encoding="utf-8")
print("FEISHU_TEST_CHAT_ID=oc_6566160ccb2def51937469fe8144efdb")
