#!/usr/bin/env python3
"""Bootstrap a tool's Coze packaging from an exported workflow zip."""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared" / "coze_pack"))

from patch_workflow import bootstrap_tool_from_export, find_workflow_yaml_in_zip_dir

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def extract_zip(zip_path: Path) -> Path:
    out_dir = PROJECT_ROOT / ".coze-reference" / zip_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(out_dir)
    return out_dir


def parse_draft_suffix(zip_path: Path) -> str:
    match = re.search(r"-draft-(\d+)\.zip$", zip_path.name, re.IGNORECASE)
    return match.group(1) if match else "0001"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap tools/<tool>/coze from a Coze workflow export zip"
    )
    parser.add_argument("--tool", required=True, help="tool folder name under tools/")
    parser.add_argument("--zip", type=Path, help="exported Coze workflow zip")
    parser.add_argument("--yaml", type=Path, help="workflow yaml instead of zip")
    parser.add_argument("--draft-suffix", help="override draft suffix, e.g. 3851")
    args = parser.parse_args()

    if not args.zip and not args.yaml:
        parser.error("one of --zip or --yaml is required")

    if args.zip:
        extracted = extract_zip(args.zip.resolve())
        workflow_yaml = find_workflow_yaml_in_zip_dir(extracted)
        draft_suffix = args.draft_suffix or parse_draft_suffix(args.zip.resolve())
    else:
        workflow_yaml = args.yaml.resolve()
        draft_suffix = args.draft_suffix or "0001"

    spec_path = bootstrap_tool_from_export(
        args.tool,
        workflow_yaml=workflow_yaml,
        draft_suffix=draft_suffix,
    )
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    print(f"template: tools/{args.tool}/coze/workflow.template.yaml")
    print(f"spec: {spec_path}")
    print(json.dumps(spec, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
