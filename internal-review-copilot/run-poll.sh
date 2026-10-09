#!/usr/bin/env bash
# 40 常驻：OMS 待审核轮询 + 评估/发卡片。密钥只从 EnvironmentFile / IRC_ENV_FILE 读。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
mkdir -p logs _runs/live_poll
OUTDIR="${IRC_OUTDIR:-$ROOT/_runs/live_poll}"
INTERVAL="${IRC_POLL_INTERVAL:-600}"
exec npx tsx scripts/poll-and-assess.ts --interval "$INTERVAL" --card --out "$OUTDIR"
