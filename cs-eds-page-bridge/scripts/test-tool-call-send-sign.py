# coding: utf-8
"""锁住 tool_call_send 签名原文：字段顺序、中文不转义、id 不含 arguments。"""
from __future__ import annotations

import base64
import importlib.util
import json
from pathlib import Path

_MOD_PATH = Path(__file__).resolve().parent / "tool-call-send.py"
_SPEC = importlib.util.spec_from_file_location("tool_call_send", _MOD_PATH)
_MOD = importlib.util.module_from_spec(_SPEC)
assert _SPEC.loader is not None
_SPEC.loader.exec_module(_MOD)
arguments_as_string = _MOD.arguments_as_string
build_body = _MOD.build_body
build_sign_content = _MOD.build_sign_content
dumps_sign_data = _MOD.dumps_sign_data
load_arguments = _MOD.load_arguments

ROOT = Path(__file__).resolve().parents[1]
SOP_ARGS = ROOT / "fixtures" / "sidecar-sop-card-a2ui.arguments.txt"
TOKEN = "UNIT_TOKEN"


def fail(msg: str) -> None:
    raise SystemExit("FAIL " + msg)


def main() -> None:
    sop = load_arguments(SOP_ARGS)
    if "操作 SOP" not in sop:
        fail("SOP arguments 没读到标题")
    if not isinstance(sop, str):
        fail("arguments 必须是字符串")

    body = build_body(
        username="ying.jin@winit.com",
        user_id="265302",
        conversation_id="7611163851929894966",
        function_name="renderA2UI",
        arguments=sop,
        timestamp=1726900000000,
        token=TOKEN,
    )
    meta = body["_meta"]
    data_json = meta["data_json_str"]
    sign_content = meta["sign_content"]
    data = json.loads(data_json)

    expected_prefix = (
        TOKEN
        + "actionv1.toolCall"
        + "app_keyying.jin@winit.com"
        + "data"
        + data_json
        + "formatjson"
        + "platformcoze"
        + "sign_methodmd5"
        + "timestamp1726900000000"
        + "version1.0"
        + TOKEN
    )
    if sign_content != expected_prefix:
        fail("签名原文拼接与插件不一致")
    if sign_content != build_sign_content(
        TOKEN,
        "v1.toolCall",
        "ying.jin@winit.com",
        data_json,
        "json",
        "coze",
        "md5",
        1726900000000,
        "1.0",
    ):
        fail("build_sign_content 对不上")

    if "\\u" in data_json:
        fail("data JSON 把中文转成了 \\u，应对齐 ensure_ascii=False")
    if "操作 SOP — 良品转不良品上架" not in data_json:
        fail("签名 data 里没有 SOP 标题原文")

    keys = list(json.loads(dumps_sign_data({"b": 1, "a": 2})).keys())
    if keys != ["a", "b"]:
        fail("data 未按 sort_keys")

    tool = data["toolCall"][0]
    if sorted(tool.keys()) != ["arguments", "id", "name"]:
        fail("toolCall 字段不是 arguments/id/name")
    if not isinstance(tool["arguments"], str):
        fail("toolCall.arguments 必须保持字符串")
    if sop != tool["arguments"]:
        fail("arguments 被改写了")

    id_raw = "26530276111638519298949661726900000000renderA2UI"
    expect_id = base64.b64encode(id_raw.encode("utf-8")).decode("utf-8")
    if tool["id"] != expect_id:
        fail("id 必须只用 userId+conversationId+timestamp+function_name")
    if sop[:20] in base64.b64decode(tool["id"]).decode("utf-8"):
        fail("id 里拼进了 arguments / dict repr")

    obj_args = json.loads(sop)
    if arguments_as_string(obj_args) != json.dumps(obj_args, ensure_ascii=False, separators=(",", ":")):
        fail("对象 arguments 转字符串不对")

    print("PASS tool_call_send sign")
    print("  签名字段顺序 token+action+app_key+data+format+platform+sign_method+timestamp+version+token")
    print("  中文不转义、id 不含 arguments、SOP 卡 arguments 为字符串")


if __name__ == "__main__":
    main()
