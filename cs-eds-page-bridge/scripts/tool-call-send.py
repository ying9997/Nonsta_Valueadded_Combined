# coding: utf-8
"""本地复刻扣子 cobra_agent_http.tool_call_send。

签名对齐现网插件（不是按字段字母 sort 再漏 token）：
  token + action + app_key + data + format + platform + sign_method + timestamp + version + token
data 的 JSON：sort_keys=True、separators=(',', ':')、ensure_ascii=False（中文不转 \\u）。
toolCall.id = base64(userId + conversationId + timestamp + function_name)，不要拼整段 dict。
arguments 必须是字符串。
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ARGUMENTS_FILE = ROOT / "fixtures" / "sidecar-sop-card-a2ui.arguments.txt"

ACTION = "v1.toolCall"
CLIENT_ID = "40c5d18a8f38c5b28e"
FORMAT = "json"
PLATFORM = "coze"
SIGN_METHOD = "md5"
VERSION = "1.0"
LANGUAGE = "zh_CN"
SERVICE_URL = "https://cobra-agent.winit.com/service"


def arguments_as_string(arguments: object) -> str:
    if isinstance(arguments, str):
        return arguments
    return json.dumps(arguments, ensure_ascii=False, separators=(",", ":"))


def construct_request_tool_call(user_id, conversation_id, timestamp, function_list):
    tool_calls = []
    for function in function_list:
        id_raw = f"{user_id}{conversation_id}{timestamp}{function['function_name']}"
        id_encoded = base64.b64encode(id_raw.encode("utf-8")).decode("utf-8")
        tool_calls.append(
            {
                "id": id_encoded,
                "name": function["function_name"],
                "arguments": function["arguments"],
            }
        )
    return tool_calls


def dumps_sign_data(data: dict) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def build_sign_content(
    token: str,
    action: str,
    app_key: str,
    data_json_str: str,
    format_: str,
    platform: str,
    sign_method: str,
    timestamp: int,
    version: str,
) -> str:
    return (
        token
        + "action"
        + action
        + "app_key"
        + app_key
        + "data"
        + data_json_str
        + "format"
        + format_
        + "platform"
        + platform
        + "sign_method"
        + sign_method
        + "timestamp"
        + str(timestamp)
        + "version"
        + version
        + token
    )


def build_body(
    *,
    username: str,
    user_id: str,
    conversation_id: str,
    function_name: str,
    arguments: str,
    timestamp: int,
    token: str,
    client_id: str = CLIENT_ID,
) -> dict:
    arguments = arguments_as_string(arguments)
    data = {
        "conversationId": conversation_id,
        "toolCall": construct_request_tool_call(
            user_id=user_id,
            conversation_id=conversation_id,
            timestamp=timestamp,
            function_list=[{"function_name": function_name, "arguments": arguments}],
        ),
        "userId": user_id,
        "username": username,
    }
    data_json_str = dumps_sign_data(data)
    sign_content = build_sign_content(
        token,
        ACTION,
        username,
        data_json_str,
        FORMAT,
        PLATFORM,
        SIGN_METHOD,
        timestamp,
        VERSION,
    )
    sign_data = hashlib.md5(sign_content.encode("utf-8")).hexdigest().upper()
    return {
        "action": ACTION,
        "app_key": username,
        "client_id": client_id,
        "client_sign": sign_data,
        "data": data,
        "format": FORMAT,
        "language": LANGUAGE,
        "platform": PLATFORM,
        "sign": sign_data,
        "sign_method": SIGN_METHOD,
        "timestamp": timestamp,
        "version": VERSION,
        "_meta": {
            "data_json_str": data_json_str,
            "sign_content": sign_content,
            "id_raw": f"{user_id}{conversation_id}{timestamp}{function_name}",
        },
    }


def post_body(payload: dict, url: str = SERVICE_URL) -> dict:
    body = {k: v for k, v in payload.items() if not k.startswith("_")}
    raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=raw,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    ctx = ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        text = err.read().decode("utf-8", errors="replace")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"http": err.code, "raw": text}


def load_arguments(path: Path) -> str:
    text = path.read_text(encoding="utf-8").strip()
    if text.startswith("{"):
        obj = json.loads(text)
        if isinstance(obj, dict) and "arguments" in obj:
            return arguments_as_string(obj["arguments"])
    return text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="对照扣子插件发 tool_call_send")
    parser.add_argument("--conversation-id", required=True)
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--function-name", default="renderA2UI")
    parser.add_argument("--arguments-file", type=Path, default=DEFAULT_ARGUMENTS_FILE)
    parser.add_argument("--timestamp", type=int, default=0, help="0=当前毫秒")
    parser.add_argument("--dry-run", action="store_true", help="只打印签名结构，不发网")
    parser.add_argument("--send", action="store_true", help="POST 到 cobra-agent")
    args = parser.parse_args(argv)

    token = os.environ.get("COBRA_TOOL_CALL_TOKEN", "").strip()
    if args.send and not token:
        print("发网需要环境变量 COBRA_TOOL_CALL_TOKEN（用扣子插件里的 token，不要写进仓库）", file=sys.stderr)
        return 2
    if not token:
        token = "DRY_RUN_TOKEN"

    timestamp = args.timestamp or int(datetime.now().timestamp() * 1000)
    arguments = load_arguments(args.arguments_file)
    payload = build_body(
        username=args.username,
        user_id=args.user_id,
        conversation_id=args.conversation_id,
        function_name=args.function_name,
        arguments=arguments,
        timestamp=timestamp,
        token=token,
    )
    meta = payload.pop("_meta")
    print(
        json.dumps(
            {
                "function_name": args.function_name,
                "arguments_chars": len(arguments),
                "id_raw": meta["id_raw"],
                "data_json_has_unicode_escape": "\\u" in meta["data_json_str"],
                "sign_starts_with_token": meta["sign_content"].startswith(token),
                "sign_ends_with_token": meta["sign_content"].endswith(token),
                "sign_field_order": "action,app_key,data,format,platform,sign_method,timestamp,version",
                "sign": payload["sign"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    if args.send and not args.dry_run:
        result = post_body(payload)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
