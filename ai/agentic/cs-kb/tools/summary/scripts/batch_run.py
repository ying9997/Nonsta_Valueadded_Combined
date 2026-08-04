import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "shared"))

from batch_run_base import run_batch_cli

# WORKFLOW_ID = "7591815477089812518"

WORKFLOW_ID = "7651588032478462015"

if __name__ == "__main__":
    run_batch_cli(WORKFLOW_ID, tool_name="summary", empty_message="no data")
