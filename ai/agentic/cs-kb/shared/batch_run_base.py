import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests
from cozepy import COZE_CN_BASE_URL, Coze, TokenAuth

from batch_ui import BatchUI, UIMode, parse_ui_mode

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def load_env_file() -> None:
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def get_coze_api_token() -> str:
    token = os.environ.get("COZE_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "COZE_API_TOKEN is required. Copy .env.example to .env or export the variable."
        )
    return token


def wait_for_workflow(
    workflow_id: str,
    execute_id: str,
    headers: dict,
    *,
    ui: BatchUI | None = None,
    poll_interval: float = 5.0,
) -> tuple[str, dict]:
    output = {"len": 0}
    execute_status = "Running"

    while True:
        if ui is not None:
            ui.sleep_until_next_poll(execute_id, poll_interval)
        else:
            time.sleep(poll_interval)

        response = requests.get(
            f"https://api.coze.cn/v1/workflows/{workflow_id}/run_histories/{execute_id}",
            headers=headers,
            timeout=60,
        )
        result = response.json()
        if result["code"] != 0:
            logid = result.get("detail", {}).get("logid")
            if ui is not None:
                ui.error("获取执行状态失败: " + result["msg"], logid=logid)
            else:
                print("get execute status error: " + result["msg"])
                print("logid: " + logid)
            execute_status = "Fail"
            break

        data = result["data"][0]
        execute_status = data["execute_status"]

        if execute_status == "Running":
            continue
        if execute_status == "Success":
            parsed_output = json.loads(data["output"])
            output = json.loads(parsed_output["Output"])
            break

        output = {"len": 0}
        break

    return execute_status, output


def run_batch_loop(
    workflow_id: str,
    *,
    tool_name: str = "batch",
    ui_mode: str | UIMode = UIMode.PRETTY,
    continue_on_fail: bool = False,
    empty_message: str = "no data",
    poll_interval: float = 5.0,
) -> None:
    load_env_file()
    coze_api_token = get_coze_api_token()
    coze = Coze(auth=TokenAuth(token=coze_api_token), base_url=COZE_CN_BASE_URL)
    headers = {
        "Authorization": f"Bearer {coze_api_token}",
        "Content-Type": "application/json",
    }

    ui = BatchUI(tool_name, workflow_id, parse_ui_mode(ui_mode))
    ui.start()
    finish_reason = empty_message

    try:
        while True:
            workflow = coze.workflows.runs.create(
                workflow_id=workflow_id,
                is_async=True,
                parameters={"debug_mode": False},
            )

            execute_id = workflow.execute_id
            ui.begin_round(execute_id)

            try:
                execute_status, output = wait_for_workflow(
                    workflow_id,
                    execute_id,
                    headers,
                    ui=ui,
                    poll_interval=poll_interval,
                )
            finally:
                ui.end_round()

            if execute_status == "Fail":
                ui.record_round(execute_id, status="fail")
                finish_reason = "workflow failed"
                if continue_on_fail:
                    continue
                break

            data_len = output.get("len", 0)
            if data_len == 0:
                ui.record_round(execute_id, status="empty", data_len=0)
                finish_reason = empty_message
                break

            ui.record_round(execute_id, status="success", data_len=data_len)
    finally:
        ui.finish(finish_reason)


def build_arg_parser(tool_name: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=f"Run {tool_name} Coze batch loop")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--pretty",
        action="store_const",
        const=UIMode.PRETTY,
        dest="ui_mode",
        help="分阶段输出与轮次表格（默认）",
    )
    mode.add_argument(
        "--fancy",
        action="store_const",
        const=UIMode.FANCY,
        dest="ui_mode",
        help="Live 仪表盘 + 滚动批次日志",
    )
    mode.add_argument(
        "--quiet",
        action="store_const",
        const=UIMode.QUIET,
        dest="ui_mode",
        help="仅输出最终统计",
    )
    parser.set_defaults(ui_mode=UIMode.PRETTY)
    parser.add_argument(
        "--continue-on-fail",
        action="store_true",
        help="workflow 失败时继续下一轮",
    )
    return parser


def run_batch_cli(
    workflow_id: str,
    tool_name: str,
    *,
    continue_on_fail: bool = False,
    empty_message: str = "no data",
) -> None:
    parser = build_arg_parser(tool_name)
    args = parser.parse_args()
    run_batch_loop(
        workflow_id,
        tool_name=tool_name,
        ui_mode=args.ui_mode,
        continue_on_fail=args.continue_on_fail or continue_on_fail,
        empty_message=empty_message,
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python batch_run_base.py <workflow_id> [--pretty|--fancy|--quiet]")
        sys.exit(1)
    run_batch_cli(sys.argv[1], tool_name="batch")
