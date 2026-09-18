#!/bin/bash
set -euo pipefail
DEST="$HOME/.agents/services/internal-review-copilot"
cp -a "$DEST/.env" /tmp/irc.env.bak.20260915
tar -xzf /tmp/irc-20260915.tgz -C "$DEST"
cp -a /tmp/irc.env.bak.20260915 "$DEST/.env"
echo "=== env restored ==="
grep -E "FEISHU_TEST_CHAT_ID|OMS_WRITE_ENABLED|OMS_WRITE_ALLOWLIST|RAG_ENABLED|SCENE_LLM_VERSION|MAX_PER_POLL|MAX_PER_HOUR|FEISHU_APP_ID" "$DEST/.env"
echo "=== cards ==="
ls "$DEST/knowledge/scenario-cards/"*.json | wc -l
test -f "$DEST/docs/tool-contracts.md" && echo "tool-contracts=yes"
echo "withRetry=$(grep -c withRetry "$DEST/lib/feishu-bot.ts")"
echo "circuit=$(grep -c consecutiveFailures "$DEST/lib/oms-tom-client.ts")"
echo "llmRetry=$(grep -c _isRetry "$DEST/lib/llm-client.ts")"
echo "pipelineCatch=$(grep -c unexpected_error "$DEST/lib/run-pipeline.ts")"
echo "sceneWrong=$(grep -c handleSceneWrong "$DEST/scripts/listen-card-actions.ts")"
if test -f "$DEST/.feishu-user-token.json"; then echo "ERROR user token leaked"; exit 1; else echo "no_user_token"; fi
cd "$DEST"
npm install --omit=dev
echo "extract_ok"
