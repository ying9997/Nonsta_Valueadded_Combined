#!/usr/bin/env python3
"""Sanitize and copy a Coze workflow export into tools/<tool>/coze/workflow.template.yaml."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared" / "coze_pack"))

from patch_workflow import sanitize_workflow_yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_yaml", type=Path)
    parser.add_argument("tool", help="tool name under tools/, e.g. summary")
    args = parser.parse_args()

    text = args.source_yaml.read_text(encoding="utf-8")
    text = sanitize_workflow_yaml(text)
    out = PROJECT_ROOT / "tools" / args.tool / "coze" / "workflow.template.yaml"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"written {out}")


if __name__ == "__main__":
    main()
