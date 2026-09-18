#!/bin/bash
set -euo pipefail
DEST="$HOME/.agents/services/internal-review-copilot"
cd /home/winit/AI_EXPERT/TOM/共享认证
python3 auto_login.py
stat -c '%y' playwright_cookies.json
cd "$DEST"
mkdir -p logs _runs/live_poll
echo "=== once start ==="
OMS_WRITE_ENABLED=1 npx tsx scripts/poll-and-assess.ts --once --card --out _runs/live_poll
echo "=== once done ==="
