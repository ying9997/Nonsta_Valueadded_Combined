# coding: utf-8
"""Bulk-export OMS NON_STANDARD_VASC facts via winit-data MCP HTTP.

Token is read from local Cursor mcp.json only; never written to outputs.
"""
from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path

import urllib.request

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2")
CACHE = OUT / "_oms_cache"
CACHE.mkdir(parents=True, exist_ok=True)
MCP_JSON = Path(r"C:\Users\ying.jin\.cursor\mcp.json")

DATE_FROM = "2026-04-21 00:00:00"
DATE_TO = "2026-08-01 00:00:00"


def load_mcp():
    cfg = json.loads(MCP_JSON.read_text(encoding="utf-8"))
    w = cfg["mcpServers"]["winit-data"]
    return w["url"], w["headers"]["Authorization"]


def mcp_call(url: str, auth: str, tool: str, arguments: dict, timeout: int = 180):
    # Streamable HTTP MCP: initialize session then tools/call
    # Fallback: many gateways accept direct JSON-RPC POST
    payload = {
        "jsonrpc": "2.0",
        "id": int(time.time() * 1000) % 100000000,
        "method": "tools/call",
        "params": {"name": tool, "arguments": arguments},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": auth,
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        ctype = resp.headers.get("Content-Type", "")
    return raw, ctype


def parse_tool_result(raw: str):
    # Handle SSE or plain JSON
    text = raw.strip()
    if text.startswith("event:") or "data:" in text[:200]:
        datas = []
        for line in text.splitlines():
            if line.startswith("data:"):
                datas.append(line[5:].strip())
        # take last non-empty data JSON
        for d in reversed(datas):
            if not d or d == "[DONE]":
                continue
            try:
                obj = json.loads(d)
                break
            except Exception:
                continue
        else:
            raise RuntimeError(f"SSE parse failed head={text[:300]!r}")
    else:
        obj = json.loads(text)

    # JSON-RPC result
    if isinstance(obj, dict) and "result" in obj:
        result = obj["result"]
    else:
        result = obj

    # MCP tool result content
    if isinstance(result, dict) and "content" in result:
        parts = []
        for c in result["content"]:
            if isinstance(c, dict) and c.get("type") == "text":
                parts.append(c.get("text") or "")
            elif isinstance(c, str):
                parts.append(c)
        return "\n".join(parts)
    if isinstance(result, str):
        return result
    return json.dumps(result, ensure_ascii=False)


def parse_markdown_table(md: str) -> list[dict]:
    lines = [ln.strip() for ln in md.splitlines() if ln.strip().startswith("|")]
    if len(lines) < 2:
        # maybe error
        raise RuntimeError(f"no markdown table: {md[:500]}")
    headers = [h.strip() for h in lines[0].strip("|").split("|")]
    rows = []
    for ln in lines[1:]:
        if re.match(r"^\|\s*-+", ln):
            continue
        cols = [c.strip() for c in ln.strip("|").split("|")]
        if len(cols) != len(headers):
            # pad/truncate
            if len(cols) < len(headers):
                cols += [""] * (len(headers) - len(cols))
            else:
                cols = cols[: len(headers)]
        rows.append(dict(zip(headers, cols)))
    # drop trailing "N rows" noise already filtered
    return rows


def export_paged(name: str, sql_template: str, page_size: int = 400):
    url, auth = load_mcp()
    out_csv = CACHE / f"{name}.csv"
    offset = 0
    total = 0
    wrote_header = out_csv.exists() and out_csv.stat().st_size > 0
    # resume support: if exists, skip by counting lines? simpler: always rewrite
    wrote_header = False
    with out_csv.open("w", encoding="utf-8-sig", newline="") as f:
        writer = None
        while True:
            sql = sql_template.format(limit=page_size, offset=offset)
            raw, ctype = mcp_call(
                url,
                auth,
                "dbhub_query",
                {"database": "oms", "sql": sql},
            )
            text = parse_tool_result(raw)
            if "error" in text.lower() and "select" not in text.lower()[:50]:
                # still try parse
                pass
            try:
                rows = parse_markdown_table(text)
            except Exception as e:
                # save raw for debug
                (CACHE / f"{name}_err_{offset}.txt").write_text(text[:5000], encoding="utf-8")
                raise RuntimeError(f"{name} offset={offset} parse fail: {e}; ctype={ctype}") from e
            # filter empty / count line
            if rows and list(rows[0].keys()) == ["cnt"]:
                pass
            if not rows:
                break
            if writer is None:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                wrote_header = True
            for r in rows:
                # skip footer-like
                if set(r.keys()) == {"cnt"}:
                    continue
                writer.writerow(r)
            total += len(rows)
            print(f"{name}: offset={offset} got={len(rows)} total={total}")
            if len(rows) < page_size:
                break
            offset += page_size
            time.sleep(0.15)
    print(f"DONE {name} -> {out_csv} rows~{total}")
    return out_csv, total


def main():
    # probe protocol first
    url, auth = load_mcp()
    raw, ctype = mcp_call(
        url,
        auth,
        "dbhub_query",
        {
            "database": "oms",
            "sql": "SELECT COUNT(*) AS cnt FROM oms.oms_va_order WHERE vas_type='NON_STANDARD_VASC' AND is_delete='N' AND order_date>='2026-04-21 00:00:00' AND order_date<'2026-08-01 00:00:00'",
        },
    )
    text = parse_tool_result(raw)
    (CACHE / "_probe_count.txt").write_text(text, encoding="utf-8")
    print("probe ctype", ctype)
    print("probe text head", text[:300])
    rows = parse_markdown_table(text)
    print("probe rows", rows)


if __name__ == "__main__":
    main()
