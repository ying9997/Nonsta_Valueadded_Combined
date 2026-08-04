#!/usr/bin/env python3
"""Sync experts_recaller nodes/*.ts and prompts/*.md into experts_recaller-draft.yaml."""

from __future__ import annotations

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "experts_recaller/coze_workflow/workflow/experts_recaller-draft.yaml"
NODES = ROOT / "experts_recaller/nodes"
PROMPTS = ROOT / "experts_recaller/prompts"

# Coze node id -> nodes/*.ts (source of truth)
SYNC_CODE_NODES: dict[str, str] = {
    "163200": "get-expert-registry.ts",
    "161590": "release-id.ts",
    "163202": "check-planner-output.ts",
    "107495": "resolve-next-queue-job.ts",
    "1987671": "build-expert-invoke-baseline.ts",
    "1987672": "merge-queue-input-params.ts",
    "114323": "call-expert.ts",
    "179414": "post-expert-output.ts",
    "195179": "post-expert-output.ts",  # placeholder — removed below
    "107478": "post-planner-replan.ts",
    "198168": "post-continue.ts",
    "1979070": "post-abort.ts",
    "103460": "pre-end-loop.ts",
    "198835": "finalize-queue-handoff.ts",
    "199001": "finalize-planner-skip.ts",
    "199002": "merge-handoff-for-summary.ts",
}
del SYNC_CODE_NODES["195179"]

# Coze node id -> prompts/*.md
SYNC_LLM_PROMPTS: dict[str, str] = {
    "163201": "queue-planner-initial.md",
    "163203": "queue-next-job-prepare.md",
    "195179": "queue-llm-judge.md",
    "1987670": "queue-planner-replan.md",
    "154470": "queue-user-facing-summary.md",
}


def indent_body(src: str, width: int) -> str:
    pad = " " * width
    lines = src.rstrip("\n").splitlines()
    out = [pad + line if line else pad.rstrip() for line in lines]
    return "\n".join(out) + "\n"


def find_node_marker(text: str, node_id: str) -> int:
    for prefix in ('        - id: "', '    - id: "'):
        marker = f'{prefix}{node_id}"'
        idx = text.find(marker)
        if idx >= 0:
            return idx
    raise SystemExit(f"missing node {node_id}")


def replace_code_block(text: str, node_id: str, src: str) -> str:
    idx = find_node_marker(text, node_id)
    m = re.search(
        r"\n(?P<indent>(?:            |        ))code: \|(?P<chomp>\d*-)?\n",
        text[idx : idx + 200000],
    )
    if not m:
        raise SystemExit(f"missing code block for {node_id}")
    indent = m.group("indent")
    chomp = m.group("chomp") or ""
    body_width = len(indent) + 4
    anchor = idx + m.start()
    start = idx + m.end()
    lang = re.search(rf"\n{re.escape(indent)}language: \d+\n", text[start : start + 900000])
    if not lang:
        raise SystemExit(f"missing language line for {node_id}")
    end = start + lang.start() + 1
    chomp_suffix = chomp if chomp.endswith("-") else (f"{chomp}-" if chomp else "")
    header = f"\n{indent}code: |{chomp_suffix}\n"
    return text[:anchor] + header + indent_body(src, body_width) + text[end:]


def yaml_escape_double_quoted(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)[1:-1]


def replace_llm_system_prompt(text: str, node_id: str, prompt: str) -> str:
    idx = find_node_marker(text, node_id)
    window = text[idx : idx + 150000]
    m = re.search(
        r"(?P<lead>\s*)- name: systemPrompt\n\s+input:\n\s+type: string\n\s+value: ",
        window,
    )
    if not m:
        raise SystemExit(f"missing systemPrompt for {node_id}")
    val_start = idx + m.end()
    rest = text[val_start : val_start + 500000]

    if rest.startswith('"'):
        end = 1
        while end < len(rest):
            ch = rest[end]
            if ch == "\\" and end + 1 < len(rest):
                end += 2
                continue
            if ch == '"':
                break
            end += 1
        escaped = yaml_escape_double_quoted(prompt.rstrip("\n") + "\n")
        return text[:val_start] + f'"{escaped}"' + text[val_start + end + 1 :]

    if rest.startswith("|"):
        header_end = rest.find("\n")
        header = rest[:header_end]
        content_start = val_start + header_end + 1
        scan = text[content_start : content_start + 200000]
        block_indent = 24
        for line in scan.split("\n"):
            if line.strip():
                block_indent = len(line) - len(line.lstrip(" "))
                break
        end_pos = content_start
        for line in text[content_start:].split("\n"):
            if not line.strip():
                end_pos += len(line) + 1
                continue
            leading = len(line) - len(line.lstrip(" "))
            if leading < block_indent and re.match(r"\s*- name:", line):
                break
            end_pos += len(line) + 1
        block = indent_body(prompt.rstrip("\n") + "\n", block_indent)
        return text[:val_start] + header + "\n" + block + text[end_pos:]

    raise SystemExit(f"unsupported systemPrompt value format for {node_id}")


def main() -> None:
    text = YAML_PATH.read_text(encoding="utf-8")

    for nid, fn in SYNC_CODE_NODES.items():
        src = (NODES / fn).read_text(encoding="utf-8")
        text = replace_code_block(text, nid, src)
        print(f"synced code {fn} -> {nid}")

    for nid, fn in SYNC_LLM_PROMPTS.items():
        prompt = (PROMPTS / fn).read_text(encoding="utf-8")
        text = replace_llm_system_prompt(text, nid, prompt)
        print(f"synced prompt {fn} -> {nid}")

    YAML_PATH.write_text(text, encoding="utf-8")
    print("updated", YAML_PATH)


if __name__ == "__main__":
    main()
