# coding: utf-8
from pathlib import Path
import subprocess
import sys

ENV_PATH = Path(r"D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\.env")


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def main() -> int:
    env = load_env(ENV_PATH)
    app_id = env.get("FEISHU_APP_ID")
    secret = env.get("FEISHU_APP_SECRET")
    if not app_id or not secret:
        print("missing FEISHU_APP_ID / FEISHU_APP_SECRET", file=sys.stderr)
        return 1
    proc = subprocess.run(
        [
            "lark-cli",
            "config",
            "init",
            "--app-id",
            app_id,
            "--app-secret-stdin",
            "--brand",
            "feishu",
            "--force-init",
        ],
        input=secret + "\n",
        text=True,
        capture_output=True,
    )
    print("rc", proc.returncode)
    if proc.stdout:
        print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
