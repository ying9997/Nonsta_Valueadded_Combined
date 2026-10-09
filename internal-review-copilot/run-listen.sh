#!/usr/bin/env bash
# 40 常驻：飞书卡片按钮 / 话题收帖。密钥只从 EnvironmentFile / IRC_ENV_FILE 读。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
mkdir -p logs _runs/live_poll
OUTDIR="${IRC_OUTDIR:-$ROOT/_runs/live_poll}"
STORE="${IRC_CASE_STORE:-$OUTDIR/case-store.json}"
INPUT="${IRC_DETAILS_INPUT:-$OUTDIR/details.json}"
exec npx tsx scripts/listen-card-actions.ts --store "$STORE" --input "$INPUT" --out "$OUTDIR"
