#!/bin/bash
# 用某次 snapshot 盖回 40 代码。回滚前会再打一份「回滚前」包。不改 secrets / live_poll。
#
#   bash scripts/40-rollback.sh
#   bash scripts/40-rollback.sh /home/winit/agent-governance/canonical/backups/vas-internal-review/irc-code-XXXX.tgz
set -euo pipefail
DEST="${IRC_DEST:-/workspace/projects/value-service/vas-internal-review}"
BAK="${IRC_BAK:-/home/winit/agent-governance/canonical/backups/vas-internal-review}"
OUTDIR="$DEST/_runs/live_poll"
HERE="$(cd "$(dirname "$0")" && pwd)"
SNAP="${1:-}"

if [ -z "$SNAP" ]; then
  SNAP="$(ls -1t "$BAK"/irc-code-*.tgz 2>/dev/null | head -n 1 || true)"
fi
if [ -z "$SNAP" ] || [ ! -f "$SNAP" ]; then
  echo "usage: bash $0 [irc-code-XXXX.tgz]" >&2
  ls -lh "$BAK"/irc-code-*.tgz 2>/dev/null || true
  exit 1
fi

BEFORE="$("$HERE/40-snapshot-code.sh" "before-rollback-$(date +%Y%m%d_%H%M%S)")"
echo "saved current to $BEFORE" >&2
mkdir -p "$DEST/logs" "$OUTDIR"
if [ -f "$DEST/.env" ]; then
  cp -a "$DEST/.env" /tmp/irc.env.bak.rollback
else
  rm -f /tmp/irc.env.bak.rollback
fi
tar -xzf "$SNAP" -C "$DEST"
if [ -f /tmp/irc.env.bak.rollback ]; then
  cp -a /tmp/irc.env.bak.rollback "$DEST/.env"
fi
chmod +x "$DEST/run-poll.sh" "$DEST/run-listen.sh" 2>/dev/null || true

if systemctl --user cat vas-internal-review-poll.service >/dev/null 2>&1; then
  systemctl --user restart vas-internal-review-poll.service || true
  systemctl --user restart vas-internal-review-listen.service || true
  sleep 3
  systemctl --user --no-pager --full status vas-internal-review-poll.service vas-internal-review-listen.service || true
else
  echo "rollback warn: units not installed; code restored only" >&2
fi
echo "rolled back from $SNAP"
echo "dest=$DEST"
echo "secrets/live_poll untouched"
