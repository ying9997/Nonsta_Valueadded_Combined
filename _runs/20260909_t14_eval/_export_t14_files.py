# coding: utf-8
"""Export execute files for T1-T4 scene orders into t14 eval cache."""
from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path
import urllib.request

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_t14_eval\_oms_files")
OUT.mkdir(parents=True, exist_ok=True)
MCP_JSON = Path(r"C:\Users\ying.jin\.cursor\mcp.json")
CODES = ("20250430", "20250522001", "202506120001", "20250407004")
DATE_FROM = "2026-04-21 00:00:00"
DATE_TO = "2026-09-04 00:00:00"


def load_auth():
    cfg = json.loads(MCP_JSON.read_text(encoding="utf-8"))
    w = cfg["mcpServers"]["winit-data"]
    return w["url"], w["headers"]["Authorization"]


def mcp_dbhub(sql: str, timeout: int = 300) -> str:
    url, auth = load_auth()
    payload = {
        "jsonrpc": "2.0",
        "id": int(time.time() * 1000) % 1_000_000_000,
        "method": "tools/call",
        "params": {"name": "dbhub_query", "arguments": {"database": "oms", "sql": sql}},
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
    obj = json.loads(raw)
    result = obj.get("result", obj)
    if isinstance(result, dict) and "content" in result:
        texts = [c.get("text") or "" for c in result["content"] if isinstance(c, dict) and c.get("type") == "text"]
        text = "\n".join(texts)
    elif isinstance(result, str):
        text = result
    else:
        text = json.dumps(result, ensure_ascii=False)
    if text.strip().startswith("{"):
        try:
            inner = json.loads(text)
            if isinstance(inner, dict) and "result" in inner and isinstance(inner["result"], str):
                text = inner["result"]
            elif isinstance(inner, dict) and "error" in inner:
                raise RuntimeError(str(inner["error"]))
        except json.JSONDecodeError:
            pass
    return text


def parse_md_table(md: str) -> list[dict]:
    lines = [ln.strip() for ln in md.splitlines() if ln.strip().startswith("|")]
    if len(lines) < 2:
        raise RuntimeError(f"no table: {md[:800]}")
    headers = [h.strip() for h in lines[0].strip("|").split("|")]
    rows = []
    for ln in lines[1:]:
        if re.match(r"^\|\s*-+", ln):
            continue
        cols = [c.strip() for c in ln.strip("|").split("|")]
        if len(cols) < len(headers):
            cols += [""] * (len(headers) - len(cols))
        elif len(cols) > len(headers):
            cols = cols[: len(headers)]
        rows.append(dict(zip(headers, cols)))
    return rows


def main():
    code_list = ",".join(f"'{c}'" for c in CODES)
    base_sql = f"""
SELECT DISTINCT f.order_no, f.va_atom_id, f.attr_id, f.file_name, f.url, f.type, f.file_type, f.created,
       atr.attribute_name, atr.attribute_key, atr.INPUT_NODE AS input_node,
       atr.service_code, atr.service_sequence
FROM oms.oms_va_execute_file f
INNER JOIN oms.oms_va_order o ON f.order_no=o.order_no
INNER JOIN oms.oms_va_atom a ON a.order_no=o.order_no AND a.is_delete='N'
LEFT JOIN oms.oms_va_atom_attr atr ON atr.id=f.attr_id
WHERE o.vas_type='NON_STANDARD_VASC' AND o.is_delete='N' AND f.is_delete='N'
  AND o.order_date >= '{DATE_FROM}' AND o.order_date < '{DATE_TO}'
  AND a.SCENE_OVERVIEW_CODE IN ({code_list})
ORDER BY f.order_no, f.id
"""
    out_csv = OUT / "files.csv"
    offset = 0
    page = 50
    total = 0
    writer = None
    with out_csv.open("w", encoding="utf-8-sig", newline="") as f:
        while True:
            sql = f"{base_sql} LIMIT {page} OFFSET {offset}"
            rows = parse_md_table(mcp_dbhub(sql))
            if not rows:
                break
            if writer is None:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), extrasaction="ignore")
                writer.writeheader()
            for r in rows:
                writer.writerow(r)
            total += len(rows)
            print(f"files +{len(rows)} total={total} offset={offset}", flush=True)
            if len(rows) < page:
                break
            offset += page
            time.sleep(0.02)
    (OUT / "files.meta.json").write_text(
        json.dumps({"rows": total, "path": str(out_csv), "codes": list(CODES)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("DONE", total)


if __name__ == "__main__":
    main()
