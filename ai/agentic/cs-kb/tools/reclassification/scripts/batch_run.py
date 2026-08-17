import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "shared"))

from batch_run_base import run_batch_cli

WORKFLOW_ID = "7592903692534398991"

if __name__ == "__main__":
    run_batch_cli(WORKFLOW_ID, tool_name="reclassification", empty_message="no data")
