#!/usr/bin/env python3
"""Compare experts_recaller-draft.yaml embedded code/prompts with nodes/*.ts and prompts/*.md."""

from __future__ import annotations

import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "experts_recaller/coze_workflow/workflow/experts_recaller-draft.yaml"
NODES_DIR = ROOT / "experts_recaller/nodes"
PROMPTS_DIR = ROOT / "experts_recaller/prompts"

TITLE_TO_TS: dict[str, str] = {
    "get-expert-registry": "get-expert-registry.ts",
    "resolve-next-queue-job": "resolve-next-queue-job.ts",
    "build-expert-invoke-baseline": "build-expert-invoke-baseline.ts",
    "merge-queue-input-params": "merge-queue-input-params.ts",
    "merge-handoff-for-summary": "merge-handoff-for-summary.ts",
    "pre-end-loop": "pre-end-loop.ts",
    "post-expert-output": "post-expert-output.ts",
    "post-planner-replan": "post-planner-replan.ts",
    "post-continue": "post-continue.ts",
    "post-abort": "post-abort.ts",
    "call-expert": "call-expert.ts",
    "check-planner-output": "check-planner-output.ts",
    "finalize-queue-handoff": "finalize-queue-handoff.ts",
    "release-id": "release-id.ts",
    "finalize-planner-skip": "finalize-planner-skip.ts",
}

TITLE_TO_PROMPT: dict[str, str] = {
    "queue-planner": "queue-planner-initial.md",
    "queue-next-job-prepare": "queue-next-job-prepare.md",
    "llm-judge": "queue-llm-judge.md",
    "queue-planner-replan": "queue-planner-replan.md",
    "queue-user-facing-summary": "queue-user-facing-summary.md",
}


def normalize_code(s: str) -> str:
    lines = [ln.rstrip() for ln in s.replace("\r\n", "\n").split("\n")]
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


def normalize_indent(s: str) -> str:
    """Compare TS bodies ignoring uniform leading indent (YAML embed uses extra padding)."""
    lines = normalize_code(s).split("\n")
    nonempty = [ln for ln in lines if ln.strip()]
    if not nonempty:
        return ""
    indent = min(len(ln) - len(ln.lstrip(" ")) for ln in nonempty)
    return "\n".join(ln[indent:] if ln.strip() else "" for ln in lines)


def dedent_yaml_code(code: str) -> str:
    raw_lines = code.split("\n")
    dedented: list[str] = []
    for ln in raw_lines:
        if ln.startswith("                "):
            dedented.append(ln[16:])
        elif ln.startswith("            "):
            dedented.append(ln[12:])
        else:
            dedented.append(ln)
    return normalize_code("\n".join(dedented))


def extract_code_nodes(yaml_text: str) -> dict[str, dict[str, str]]:
    nodes: dict[str, dict[str, str]] = {}
    pattern = re.compile(
        r'- id: "(\d+)"\n(?:          |      )type: code\n(?:          |      )title: ([^\n]+)\n'
        r".*?\n(?:          |      )parameters:\n(?:            |        )code: \|(?:\d+-)?\n"
        r"(.*?)\n(?:            |        )language: \d+\n",
        re.DOTALL,
    )
    for m in pattern.finditer(yaml_text):
        nid, title, code = m.group(1), m.group(2).strip(), m.group(3)
        nodes[title] = {"id": nid, "code": dedent_yaml_code(code)}
    return nodes


def unescape_yaml_double_quoted(s: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == "\\" and i + 1 < len(s):
            nxt = s[i + 1]
            if nxt == "n":
                out.append("\n")
                i += 2
                continue
            if nxt == '"':
                out.append('"')
                i += 2
                continue
            if nxt == "\\":
                out.append("\\")
                i += 2
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def extract_block_scalar(yaml_text: str, start: int) -> str:
    """Parse YAML block scalar after `value: |` / `|-` / `|+`."""
    line_end = yaml_text.find("\n", start)
    header = yaml_text[start:line_end]
    m = re.match(r"\|\s*(-|\+)?\s*$", header.strip())
    if not m:
        return header.strip()
    chomp = m.group(1)
    content_start = line_end + 1
    lines: list[str] = []
    indent: int | None = None
    pos = content_start
    while pos < len(yaml_text):
        nl = yaml_text.find("\n", pos)
        if nl < 0:
            line = yaml_text[pos:]
            nl = len(yaml_text)
        else:
            line = yaml_text[pos:nl]
        if not line.strip():
            if lines:
                lines.append("")
            pos = nl + 1
            continue
        leading = len(line) - len(line.lstrip(" "))
        if indent is None:
            indent = leading
        if leading < indent:
            break
        lines.append(line[indent:])
        pos = nl + 1
    text = "\n".join(lines)
    if chomp == "-":
        text = text.rstrip("\n")
    return text


def extract_llm_nodes(yaml_text: str) -> dict[str, dict[str, str]]:
    nodes: dict[str, dict[str, str]] = {}
    pattern = re.compile(
        r'- id: "(\d+)"\n(?:          |      )type: llm\n(?:          |      )title: ([^\n]+)\n'
        r".*?- name: systemPrompt\n(?:              |            )input:\n"
        r"(?:                |            )type: string\n(?:                |            )value: ",
        re.DOTALL,
    )
    for m in pattern.finditer(yaml_text):
        nid, title = m.group(1), m.group(2).strip()
        start = m.end()
        first = yaml_text[start : start + 1]
        if first == '"':
            end = start + 1
            buf: list[str] = []
            while end < len(yaml_text):
                ch = yaml_text[end]
                if ch == "\\" and end + 1 < len(yaml_text):
                    buf.append(ch)
                    buf.append(yaml_text[end + 1])
                    end += 2
                    continue
                if ch == '"':
                    break
                buf.append(ch)
                end += 1
            prompt = unescape_yaml_double_quoted("".join(buf))
        elif first == "|":
            prompt = extract_block_scalar(yaml_text, start)
        else:
            line_end = yaml_text.find("\n", start)
            prompt = yaml_text[start:line_end].strip()
        nodes[title] = {"id": nid, "prompt": normalize_code(prompt)}
    return nodes


def first_diff(a: str, b: str) -> tuple[int, str, str] | None:
    a_lines = a.splitlines()
    b_lines = b.splitlines()
    for i, (x, y) in enumerate(zip(a_lines, b_lines)):
        if x != y:
            return i + 1, x, y
    if len(a_lines) != len(b_lines):
        shorter = min(len(a_lines), len(b_lines))
        if len(a_lines) > len(b_lines):
            return shorter + 1, a_lines[shorter], "<EOF>"
        return shorter + 1, "<EOF>", b_lines[shorter]
    return None


def main() -> int:
    text = YAML_PATH.read_text(encoding="utf-8")
    code_nodes = extract_code_nodes(text)
    llm_nodes = extract_llm_nodes(text)
    exit_code = 0

    print("=== CODE NODES IN YAML ===")
    for t in sorted(code_nodes):
        print(f"  {code_nodes[t]['id']}: {t}")

    print("\n=== LLM NODES IN YAML ===")
    for t in sorted(llm_nodes):
        print(f"  {llm_nodes[t]['id']}: {t}")

    print("\n=== nodes/*.ts WITHOUT MATCHING YAML CODE NODE ===")
    for f in sorted(NODES_DIR.glob("*.ts")):
        if f.stem not in code_nodes:
            print(f"  {f.name}")

    print("\n=== YAML CODE NODES WITHOUT nodes/*.ts ===")
    ts_stems = {f.stem for f in NODES_DIR.glob("*.ts")}
    for title in sorted(code_nodes):
        if title not in ts_stems:
            print(f"  {title} (id={code_nodes[title]['id']})")

    print("\n=== CODE: nodes/*.ts vs YAML ===")
    checked: set[str] = set()
    for title, fn in sorted(TITLE_TO_TS.items()):
        checked.add(title)
        fp = NODES_DIR / fn
        if title not in code_nodes:
            print(f"[MISSING IN YAML] {title} <- {fn}")
            exit_code = 1
            continue
        src = normalize_code(fp.read_text(encoding="utf-8"))
        yaml_code = code_nodes[title]["code"]
        same = src == yaml_code or normalize_indent(src) == normalize_indent(yaml_code)
        if same:
            note = ""
            if src != yaml_code:
                note = " (indent-only)"
            print(f"[OK] {title} ({code_nodes[title]['id']}){note}")
        else:
            exit_code = 1
            diff = first_diff(normalize_indent(src), normalize_indent(yaml_code))
            print(
                f"[DIFF] {title} (id={code_nodes[title]['id']}) "
                f"src={len(src.splitlines())}L yaml={len(yaml_code.splitlines())}L"
            )
            if diff:
                ln, a, b = diff
                print(f"       first diff @ line {ln}:")
                print(f"         SRC:  {a[:140]}")
                print(f"         YAML: {b[:140]}")

    for title in sorted(code_nodes):
        if title in checked:
            continue
        fp = NODES_DIR / f"{title}.ts"
        if not fp.exists():
            continue
        src = normalize_code(fp.read_text(encoding="utf-8"))
        yaml_code = code_nodes[title]["code"]
        if src != yaml_code and normalize_indent(src) != normalize_indent(yaml_code):
            exit_code = 1
            print(f"[DIFF] {title} (id={code_nodes[title]['id']}) — ts exists but not in TITLE_TO_TS map")

    print("\n=== PROMPTS: prompts/*.md vs YAML systemPrompt ===")
    for title, fn in sorted(TITLE_TO_PROMPT.items()):
        fp = PROMPTS_DIR / fn
        if title not in llm_nodes:
            print(f"[MISSING IN YAML] {title} <- {fn}")
            exit_code = 1
            continue
        src = normalize_code(fp.read_text(encoding="utf-8"))
        yaml_p = llm_nodes[title]["prompt"]
        if src == yaml_p:
            print(f"[OK] {title} <- {fn} ({llm_nodes[title]['id']})")
        else:
            exit_code = 1
            diff = first_diff(src, yaml_p)
            print(f"[DIFF] {title} <- {fn} (id={llm_nodes[title]['id']})")
            if diff:
                ln, a, b = diff
                print(f"       first diff @ line {ln}:")
                print(f"         MD:   {a[:140]}")
                print(f"         YAML: {b[:140]}")

    print("\n=== SYNC SCRIPT COVERAGE (sync-recaller-draft-yaml.py SYNC_NODES) ===")
    sync_nodes = {
        "163200": "get-expert-registry.ts",
        "161590": "release-id.ts",
        "163202": "check-planner-output.ts",
        "107495": "resolve-next-queue-job.ts",
        "1987671": "build-expert-invoke-baseline.ts",
        "1987672": "merge-queue-input-params.ts",
        "114323": "call-expert.ts",
        "179414": "post-expert-output.ts",
        "107478": "post-planner-replan.ts",
        "198168": "post-continue.ts",
        "1979070": "post-abort.ts",
        "103460": "pre-end-loop.ts",
        "198835": "finalize-queue-handoff.ts",
        "199001": "finalize-planner-skip.ts",
        "199002": "merge-handoff-for-summary.ts",
    }
    for nid, fn in sorted(sync_nodes.items(), key=lambda x: x[1]):
        title = fn.replace(".ts", "")
        in_map = title in TITLE_TO_TS
        in_yaml = title in code_nodes
        print(f"  {fn}: sync={nid} yaml_id={code_nodes.get(title, {}).get('id', '?')} in_TITLE_TO_TS={in_map}")

    not_in_sync = [
        t for t in TITLE_TO_TS
        if t in code_nodes and code_nodes[t]["id"] not in sync_nodes
    ]
    if not_in_sync:
        print("  Not covered by sync script (manual sync needed):")
        for t in not_in_sync:
            print(f"    - {t} (id={code_nodes[t]['id']})")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
