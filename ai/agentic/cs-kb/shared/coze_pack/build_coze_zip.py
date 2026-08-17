#!/usr/bin/env python3
"""
coze.cn workflow import zip packer.

ZIP layout (verified against official exports):
    Workflow-<name>-draft-<suffix>/
    ├── MANIFEST.yml
    └── workflow/<name>-draft.yaml
"""
from __future__ import annotations

import io
import re
import struct
import zipfile
from pathlib import Path

_NAME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


class _NoSeekWriter:
    def __init__(self, file_obj):
        self._f = file_obj

    def write(self, data: bytes) -> int:
        return self._f.write(data)

    def flush(self) -> None:
        return self._f.flush()


def _patch_bytes(data: bytes) -> bytes:
    buf = bytearray(data)
    offset = 0
    while True:
        idx = buf.find(b"PK\x03\x04", offset)
        if idx == -1:
            break
        struct.pack_into("<HH", buf, idx + 10, 0, 0)
        fnlen = struct.unpack_from("<H", buf, idx + 26)[0]
        exlen = struct.unpack_from("<H", buf, idx + 28)[0]
        offset = idx + 30 + fnlen + exlen

    offset = 0
    while True:
        idx = buf.find(b"PK\x01\x02", offset)
        if idx == -1:
            break
        struct.pack_into("<H", buf, idx + 4, 20)
        struct.pack_into("<HH", buf, idx + 12, 0, 0)
        struct.pack_into("<I", buf, idx + 38, 0)
        fnlen = struct.unpack_from("<H", buf, idx + 28)[0]
        exlen = struct.unpack_from("<H", buf, idx + 30)[0]
        cmlen = struct.unpack_from("<H", buf, idx + 32)[0]
        offset = idx + 46 + fnlen + exlen + cmlen
    return bytes(buf)


def _raw_pack(root_name: str, files: list[tuple[str, str]], out_path: str) -> None:
    bio = io.BytesIO()
    wrapper = _NoSeekWriter(bio)
    epoch = (1980, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(wrapper, "w", zipfile.ZIP_DEFLATED) as archive:
        for rel_path, content in files:
            info = zipfile.ZipInfo(f"{root_name}/{rel_path}", date_time=epoch)
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)
    patched = _patch_bytes(bio.getvalue())
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_bytes(patched)


def pack_workflow(
    *,
    name: str,
    workflow_id: str,
    workflow_yaml_body: str,
    desc: str = "",
    out_path: str,
    draft_suffix: str = "0001",
    icon: str = "plugin_icon/workflow.png",
) -> None:
    if not _NAME_RE.match(name):
        raise ValueError(f"invalid workflow name: {name!r}")
    if not workflow_id.isdigit() or not (15 <= len(workflow_id) <= 20):
        raise ValueError(f"invalid workflow_id: {workflow_id!r}")
    if f"name: {name}" not in workflow_yaml_body:
        raise ValueError(f"workflow yaml must contain `name: {name}`")

    root = f"Workflow-{name}-draft-{draft_suffix}"
    yaml_filename = f"{name}-draft.yaml"
    manifest = (
        "type: Workflow\n"
        "version: 1.0.0\n"
        "main:\n"
        f"    id: {workflow_id}\n"
        f"    name: {name}\n"
        f"    desc: {desc}\n"
        f"    icon: {icon}\n"
        '    version: ""\n'
        "    flowMode: 0\n"
        '    commitId: ""\n'
        "sub: []\n"
    )
    _raw_pack(
        root,
        [
            ("MANIFEST.yml", manifest),
            (f"workflow/{yaml_filename}", workflow_yaml_body),
        ],
        out_path,
    )
