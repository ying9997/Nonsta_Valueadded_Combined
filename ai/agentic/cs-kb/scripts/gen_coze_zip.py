#!/usr/bin/env python3
"""Generate Coze workflow import ZIP from local src/prompt and a golden template."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared" / "coze_pack"))

from patch_workflow import discover_tools, generate_coze_zip


def main() -> None:
    available = discover_tools()
    parser = argparse.ArgumentParser(description="Generate Coze workflow import ZIP packages")
    parser.add_argument(
        "tool",
        nargs="?",
        choices=available if available else None,
        help="tool name to package",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="generate ZIP for every tool with tools/<tool>/coze/spec.json",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="list tools ready for packaging",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="output directory (default: dist/coze)",
    )
    args = parser.parse_args()

    if args.list:
        if not available:
            print("no tools bootstrapped yet")
            return
        for tool in available:
            print(tool)
        return

    if not available:
        print(
            "no tools ready. bootstrap first, e.g.\n"
            "  python scripts/bootstrap_coze_tool.py --tool summary --zip path/to/export.zip",
            file=sys.stderr,
        )
        raise SystemExit(1)

    if not args.all and not args.tool:
        parser.error("specify a tool or use --all")

    targets = available if args.all else [args.tool]
    for tool in targets:
        out_path = generate_coze_zip(tool, out_dir=args.out_dir)
        print(f"generated: {out_path}")


if __name__ == "__main__":
    main()
