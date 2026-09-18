#!/bin/bash
# 把 40 上当前 internal-review-copilot 代码打成可回滚包（不含 .env / Cookie / live_poll）。
set -euo pipefail
DEST=/home/winit/.agents/services/internal-review-copilot
BAK=/home/winit/.agents/backups/internal-review-copilot
STAMP="${1:-20260918_current}"
mkdir -p "$BAK"
cd "$DEST"
INCLUDE="lib scripts knowledge prompts docs config README.md package.json"
[ -f .env.example ] && INCLUDE="$INCLUDE .env.example"
[ -f tsconfig.json ] && INCLUDE="$INCLUDE tsconfig.json"
[ -d eval ] && INCLUDE="$INCLUDE eval"
# shellcheck disable=SC2086
tar --exclude='.env' --exclude='node_modules' --exclude='_runs' --exclude='logs' \
  -czf "$BAK/irc-code-${STAMP}.tgz" $INCLUDE
cp -a /tmp/irc-20260917-t1-sku.tgz "$BAK/" 2>/dev/null || true
cp -a /tmp/irc-20260917-no-reviewer-at.tgz "$BAK/" 2>/dev/null || true
cp -a /tmp/irc-20260917-human-sop-dm.tgz "$BAK/" 2>/dev/null || true
cp -a /tmp/irc-missing-oms.tgz "$BAK/" 2>/dev/null || true
cp -a /tmp/irc-20260917-sales-cs.tgz "$BAK/" 2>/dev/null || true
ls -lh "$BAK"
echo "SNAPSHOT=$BAK/irc-code-${STAMP}.tgz"
