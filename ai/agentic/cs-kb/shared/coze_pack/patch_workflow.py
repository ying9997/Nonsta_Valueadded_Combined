from __future__ import annotations

import json
import os
import re
from pathlib import Path

from build_coze_zip import pack_workflow

PROJECT_ROOT = Path(__file__).resolve().parents[2]

CODE_NODE_DEFAULTS = {
    "init_param": "src/init_param.ts",
    "get_records": "src/get_records.ts",
}


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


def discover_tools() -> list[str]:
    tools_root = PROJECT_ROOT / "tools"
    if not tools_root.exists():
        return []
    ready = []
    for tool_dir in sorted(tools_root.iterdir()):
        if tool_dir.is_dir() and (tool_dir / "coze" / "spec.json").exists():
            ready.append(tool_dir.name)
    return ready


def escape_yaml_double_quoted(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def transform_init_param_for_coze(
    source: str,
    app_id: str,
    secret: str,
    *,
    include_start_time: bool,
) -> str:
    result = re.sub(
        r"async function main\(\{params\}: Args\): Promise<Output> \{.*?"
        r"const tenant_access_token = await get_tenant_access_token",
        (
            "async function main({params}: Args): Promise<Output> {\n"
            f"    const lark_app_id = '{app_id}';\n"
            f"    const lark_app_secret = '{secret}';\n\n"
            "    const tenant_access_token = await get_tenant_access_token"
        ),
        source,
        count=1,
        flags=re.DOTALL,
    )
    if result == source:
        result = re.sub(
            r"const lark_app_id = '[^']*';",
            f"const lark_app_id = '{app_id}';",
            result,
            count=1,
        )
        result = re.sub(
            r"const lark_app_secret = '[^']*';",
            f"const lark_app_secret = '{secret}';",
            result,
            count=1,
        )

    if not include_start_time:
        result = re.sub(r"\n    const start_time = new Date\(\)\.toISOString\(\);\n", "\n", result)
        result = re.sub(r'\n        "start_time": start_time,\n', "\n", result)
    return result


def patch_code_node(yaml_text: str, node_title: str, new_code: str) -> str:
    escaped = escape_yaml_double_quoted(new_code)
    lines = yaml_text.split("\n")
    output: list[str] = []
    index = 0
    in_target_node = False

    while index < len(lines):
        line = lines[index]
        if line.startswith("    - id:"):
            in_target_node = False
        if line.strip() == f"title: {node_title}":
            in_target_node = True
        if in_target_node and line.startswith("        code: "):
            output.append(f'        code: "{escaped}"')
            index += 1
            continue
        output.append(line)
        index += 1
    return "\n".join(output)


def _format_block_scalar(prompt_text: str, value_indent: str, block_style: str) -> list[str]:
    content_indent = value_indent + "    "
    lines = [f"{value_indent}value: {block_style}"]
    for line in prompt_text.split("\n"):
        lines.append(f"{content_indent}{line}" if line else content_indent)
    return lines


def patch_llm_system_prompt(yaml_text: str, node_title: str, prompt_text: str) -> str:
    lines = yaml_text.split("\n")
    output: list[str] = []
    index = 0
    in_target_node = False
    pending_system_prompt = False

    while index < len(lines):
        line = lines[index]
        if line.startswith("    - id:"):
            in_target_node = False
            pending_system_prompt = False
        if line.strip() == f"title: {node_title}":
            in_target_node = True
        if in_target_node and line.strip() == "- name: systemPrompt":
            pending_system_prompt = True
            output.append(line)
            index += 1
            continue
        if pending_system_prompt and line.strip().startswith("value:"):
            value_indent = line[: len(line) - len(line.lstrip())]
            stripped = line.strip()
            if stripped.startswith('value: "') or stripped == 'value: ""':
                output.append(f'{value_indent}value: "{escape_yaml_double_quoted(prompt_text)}"')
                pending_system_prompt = False
                index += 1
                continue
            block_match = re.match(r"value:\s*(\|-|\|)\s*$", stripped)
            if block_match:
                output.extend(
                    _format_block_scalar(prompt_text, value_indent, block_match.group(1))
                )
                pending_system_prompt = False
                index += 1
                while index < len(lines):
                    next_line = lines[index]
                    if re.match(r"\s+- name:", next_line):
                        break
                    index += 1
                continue
        output.append(line)
        index += 1
    return "\n".join(output)


def sanitize_workflow_yaml(text: str) -> str:
    text = re.sub(
        r"const lark_app_id = '[^']*';",
        "const lark_app_id = '__REDACTED__';",
        text,
        count=1,
    )
    text = re.sub(
        r"const lark_app_secret = '[^']*';",
        "const lark_app_secret = '__REDACTED__';",
        text,
        count=1,
    )
    return text


def parse_workflow_nodes(yaml_text: str) -> list[dict[str, str]]:
    nodes: list[dict[str, str]] = []
    for block in re.split(r"\n    - id: \"", yaml_text)[1:]:
        node_id = block.split('"', 1)[0]
        type_match = re.search(r"\n      type: (\w+)", block)
        title_match = re.search(r"\n      title: (.+)", block)
        if not type_match or not title_match:
            continue
        nodes.append(
            {
                "id": node_id,
                "type": type_match.group(1),
                "title": title_match.group(1).strip(),
            }
        )
    return nodes


def parse_workflow_header(yaml_text: str) -> dict[str, str]:
    header: dict[str, str] = {}
    for key in ("name", "id", "description"):
        match = re.search(rf"^{key}: (.+)$", yaml_text, re.MULTILINE)
        if match:
            value = match.group(1).strip().strip('"')
            header[key] = value
    return header


def resolve_code_source(tool_dir: Path, node_title: str) -> str | None:
    if node_title in CODE_NODE_DEFAULTS:
        rel = CODE_NODE_DEFAULTS[node_title]
        return rel if (tool_dir / rel).exists() else None
    if node_title == "update_records":
        matches = sorted((tool_dir / "src").glob("update_*.ts"))
        if len(matches) == 1:
            return f"src/{matches[0].name}"
    direct = tool_dir / "src" / f"{node_title}.ts"
    if direct.exists():
        return f"src/{node_title}.ts"
    return None


def resolve_prompt_file(tool_dir: Path, node_title: str, yaml_text: str) -> str | None:
    prompt_dir = tool_dir / "prompt"
    if not prompt_dir.exists():
        return None

    prompt_files = sorted(prompt_dir.glob("*.md"))
    if not prompt_files:
        return None

    exported_prompt = _extract_system_prompt_from_yaml(yaml_text, node_title)
    scored: list[tuple[int, Path]] = []
    title_key = node_title.lower().replace("gen_", "")
    for path in prompt_files:
        text = path.read_text(encoding="utf-8")
        score = 0
        if text.lstrip().startswith("# Role"):
            score += 10
        if title_key and title_key in path.stem.lower():
            score += 8
        if "classification" in node_title.lower() and "classification" in path.stem.lower():
            score += 6
        if exported_prompt:
            probe = text.strip()[:120]
            if probe and probe in exported_prompt:
                score += 20
            first_line = text.strip().splitlines()[0] if text.strip() else ""
            if first_line and first_line in exported_prompt:
                score += 15
        if "prompt" in path.stem.lower():
            score += 2
        scored.append((score, path))

    scored.sort(key=lambda item: (-item[0], -item[1].stat().st_size))
    best_score, best_path = scored[0]
    if best_score <= 0 and len(prompt_files) == 1:
        return f"prompt/{prompt_files[0].name}"
    if best_score <= 0:
        return None
    return f"prompt/{best_path.name}"


def _extract_system_prompt_from_yaml(yaml_text: str, node_title: str) -> str:
    lines = yaml_text.split("\n")
    in_node = False
    pending = False
    chunks: list[str] = []
    block_mode = False
    content_indent = 0

    for line in lines:
        if line.startswith("    - id:"):
            in_node = False
            pending = False
            block_mode = False
        if line.strip() == f"title: {node_title}":
            in_node = True
        if in_node and line.strip() == "- name: systemPrompt":
            pending = True
            continue
        if not pending:
            continue
        if line.strip().startswith("value:"):
            stripped = line.strip()
            if stripped.startswith('value: "'):
                raw = stripped[len('value: "') :]
                if raw.endswith('"'):
                    raw = raw[:-1]
                return (
                    raw.replace("\\\\", "\\")
                    .replace('\\"', '"')
                    .replace("\\n", "\n")
                )
            block_match = re.match(r"value:\s*(\|-|\|)\s*$", stripped)
            if block_match:
                block_mode = True
                content_indent = len(line) - len(line.lstrip()) + 4
            continue
        if block_mode:
            if re.match(r"\s+- name:", line):
                break
            if line.strip():
                chunks.append(line[content_indent:] if len(line) >= content_indent else line.strip())
            else:
                chunks.append("")
            continue
    return "\n".join(chunks).strip()


def infer_init_param_options(tool_dir: Path, yaml_text: str) -> dict:
    include_start_time = "start_time" in yaml_text and (tool_dir / "src" / "check_loop_time.ts").exists()
    return {
        "hardcode_lark_credentials": True,
        "include_start_time": include_start_time,
    }


def build_spec_from_export(tool_dir: Path, yaml_text: str, *, draft_suffix: str) -> dict:
    header = parse_workflow_header(yaml_text)
    nodes = parse_workflow_nodes(yaml_text)
    code_nodes: dict[str, str] = {}
    llm_nodes: dict[str, dict[str, str]] = {}
    unresolved: list[str] = []

    for node in nodes:
        if node["type"] == "code":
            rel = resolve_code_source(tool_dir, node["title"])
            if rel:
                code_nodes[node["title"]] = rel
            else:
                unresolved.append(f"code:{node['title']}")
        elif node["type"] == "llm":
            rel = resolve_prompt_file(tool_dir, node["title"], yaml_text)
            if rel:
                llm_nodes[node["title"]] = {"prompt_file": rel, "field": "systemPrompt"}
            else:
                unresolved.append(f"llm:{node['title']}")

    if unresolved:
        raise RuntimeError(
            f"unable to auto-map nodes for {tool_dir.name}: {', '.join(unresolved)}"
        )

    return {
        "name": header.get("name", tool_dir.name),
        "workflow_id": header.get("id", ""),
        "description": header.get("description", ""),
        "draft_suffix": draft_suffix,
        "init_param": infer_init_param_options(tool_dir, yaml_text),
        "code_nodes": code_nodes,
        "llm_nodes": llm_nodes,
    }


def bootstrap_tool_from_export(
    tool_name: str,
    *,
    workflow_yaml: Path,
    draft_suffix: str | None = None,
) -> Path:
    tool_dir = PROJECT_ROOT / "tools" / tool_name
    if not tool_dir.exists():
        raise FileNotFoundError(f"unknown tool directory: {tool_dir}")

    yaml_text = workflow_yaml.read_text(encoding="utf-8")
    if draft_suffix is None:
        match = re.search(r"-draft-(\d+)\.ya?ml$", workflow_yaml.name)
        draft_suffix = match.group(1) if match else "0001"

    coze_dir = tool_dir / "coze"
    coze_dir.mkdir(parents=True, exist_ok=True)
    template_path = coze_dir / "workflow.template.yaml"
    template_path.write_text(sanitize_workflow_yaml(yaml_text), encoding="utf-8")

    spec = build_spec_from_export(tool_dir, yaml_text, draft_suffix=draft_suffix)
    spec_path = coze_dir / "spec.json"
    spec_path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return spec_path


def find_workflow_yaml_in_zip_dir(extracted_dir: Path) -> Path:
    candidates = sorted(extracted_dir.rglob("*-draft.yaml"))
    if not candidates:
        candidates = sorted(extracted_dir.rglob("*.yaml"))
    if not candidates:
        raise FileNotFoundError(f"no workflow yaml under {extracted_dir}")
    return max(candidates, key=lambda path: path.stat().st_size)


def load_spec(tool_dir: Path) -> dict:
    spec_path = tool_dir / "coze" / "spec.json"
    if not spec_path.exists():
        raise FileNotFoundError(
            f"missing coze spec: {spec_path}. "
            f"Run: python scripts/bootstrap_coze_tool.py --tool {tool_dir.name} --zip <export.zip>"
        )
    return json.loads(spec_path.read_text(encoding="utf-8"))


def build_workflow_yaml(tool_dir: Path, spec: dict) -> str:
    template_path = tool_dir / "coze" / "workflow.template.yaml"
    if not template_path.exists():
        raise FileNotFoundError(f"missing workflow template: {template_path}")

    yaml_text = template_path.read_text(encoding="utf-8")
    init_param_cfg = spec.get("init_param", {})
    hardcode_lark = init_param_cfg.get("hardcode_lark_credentials", True)
    include_start_time = init_param_cfg.get("include_start_time", False)

    lark_app_id = os.environ.get("LARK_APP_ID", "").strip()
    lark_app_secret = os.environ.get("LARK_APP_SECRET", "").strip()
    if hardcode_lark and (not lark_app_id or not lark_app_secret):
        raise RuntimeError(
            "LARK_APP_ID and LARK_APP_SECRET are required in .env to inject Coze code nodes"
        )

    for node_title, rel_source in spec.get("code_nodes", {}).items():
        source_path = tool_dir / rel_source
        if not source_path.exists():
            raise FileNotFoundError(f"missing code source: {source_path}")
        code = source_path.read_text(encoding="utf-8")
        if node_title == "init_param" and hardcode_lark:
            code = transform_init_param_for_coze(
                code,
                lark_app_id,
                lark_app_secret,
                include_start_time=include_start_time,
            )
        yaml_text = patch_code_node(yaml_text, node_title, code)

    for node_title, llm_cfg in spec.get("llm_nodes", {}).items():
        prompt_path = tool_dir / llm_cfg["prompt_file"]
        if not prompt_path.exists():
            raise FileNotFoundError(f"missing prompt file: {prompt_path}")
        prompt_text = prompt_path.read_text(encoding="utf-8").strip()
        field = llm_cfg.get("field", "systemPrompt")
        if field != "systemPrompt":
            raise ValueError(f"unsupported llm field: {field}")
        yaml_text = patch_llm_system_prompt(yaml_text, node_title, prompt_text)

    return yaml_text


def generate_coze_zip(tool_name: str, *, out_dir: Path | None = None) -> Path:
    load_env_file()
    tool_dir = PROJECT_ROOT / "tools" / tool_name
    if not tool_dir.exists():
        raise FileNotFoundError(f"unknown tool: {tool_name}")

    spec = load_spec(tool_dir)
    workflow_yaml = build_workflow_yaml(tool_dir, spec)

    name = spec["name"]
    workflow_id = spec["workflow_id"]
    description = spec.get("description", "")
    draft_suffix = spec.get("draft_suffix", "0001")

    if out_dir is None:
        out_dir = PROJECT_ROOT / "dist" / "coze"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"Workflow-{name}-draft-{draft_suffix}.zip"

    pack_workflow(
        name=name,
        workflow_id=workflow_id,
        workflow_yaml_body=workflow_yaml,
        desc=description,
        out_path=str(out_path),
        draft_suffix=draft_suffix,
    )
    return out_path
