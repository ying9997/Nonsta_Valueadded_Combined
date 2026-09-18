import os
print("=== canary promote in poll.log ===")
os.system("grep -n 'canary_promote' /home/winit/.agents/services/internal-review-copilot/logs/poll.log | tail -n 30")
print("=== poll.log around first limit ===")
os.system("grep -n 'canary_limit_reached\\|canary_promote_card_sent\\|canary_count 5' /home/winit/.agents/services/internal-review-copilot/logs/poll.log | tail -n 40")
