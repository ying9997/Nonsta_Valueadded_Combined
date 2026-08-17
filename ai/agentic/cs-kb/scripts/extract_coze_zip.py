#!/usr/bin/env python3
"""Extract a Coze workflow export zip to .coze-reference/."""
from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path", type=Path)
    args = parser.parse_args()

    zip_path = args.zip_path.resolve()
    out_dir = PROJECT_ROOT / ".coze-reference" / zip_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(out_dir)

    yaml_files = list(out_dir.rglob("*.yaml"))
    print(f"extracted to {out_dir}")
    for path in yaml_files:
        print(f"  yaml: {path}")


if __name__ == "__main__":
    main()
