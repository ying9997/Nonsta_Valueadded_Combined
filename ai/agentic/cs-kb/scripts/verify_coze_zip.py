#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path


def verify_zip(zip_path: Path) -> dict[str, bool]:
    with zipfile.ZipFile(zip_path) as archive:
        yaml_name = next(name for name in archive.namelist() if name.endswith(".yaml"))
        yaml_text = archive.read(yaml_name).decode("utf-8")

    return {
        "has_init_param": "title: init_param" in yaml_text,
        "no_REDACTED": "__REDACTED__" not in yaml_text,
        "no_params_lark": "params.lark_app_id" not in yaml_text,
        "has_hardcoded_lark": "const lark_app_id = '" in yaml_text,
        "batch_or_code": ("batchEnable: true" in yaml_text) or ("title: get_records" in yaml_text),
    }


def main() -> None:
    targets = [Path(p) for p in sys.argv[1:]] if len(sys.argv) > 1 else []
    if not targets:
        root = Path(__file__).resolve().parents[1] / "dist" / "coze"
        targets = sorted(root.glob("Workflow-*.zip"))

    failed = False
    for zip_path in targets:
        checks = verify_zip(zip_path)
        print(f"{zip_path.name}: {json.dumps(checks, ensure_ascii=False)}")
        if not all(checks.values()):
            failed = True
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
