#!/bin/bash
set -euo pipefail
tmux kill-session -t irc-poll 2>/dev/null && echo "killed irc-poll" || echo "irc-poll already gone"
tmux kill-session -t irc-listen 2>/dev/null && echo "killed irc-listen" || echo "irc-listen already gone"
lark-cli --profile zengzhi-consult event stop --all --force --json || true
sleep 1
echo "=== tmux ==="
tmux ls 2>/dev/null || echo no_tmux
echo "=== process ==="
ps -ef | grep -E 'poll-and-assess|listen-card-actions' | grep -v grep || echo none
echo "=== event ==="
lark-cli --profile zengzhi-consult event status --json || true
