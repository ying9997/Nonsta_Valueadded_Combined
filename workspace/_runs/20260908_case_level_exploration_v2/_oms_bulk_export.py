# coding: utf-8
"""Bulk export OMS facts for case-level exploration v2 via winit-data MCP."""
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
    # result may be string markdown or nested
    result = obj.get("result", obj)
    if isinstance(result, dict) and "content" in result:
        texts = []
        for c in result["content"]:
            if isinstance(c, dict) and c.get("type") == "text":
                texts.append(c.get("text") or "")
        text = "\n".join(texts)
    elif isinstance(result, str):
        text = result
    else:
        text = json.dumps(result, ensure_ascii=False)
    # unwrap {"result": "...markdown..."}
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


def export_sql(name: str, base_sql: str, page_size: int = 50, expected: int | None = None):
    """Gateway hard-caps ~50 rows/query; page with OFFSET until short page."""
    out_csv = CACHE / f"{name}.csv"
    offset = 0
    total = 0
    writer = None
    with out_csv.open("w", encoding="utf-8-sig", newline="") as f:
        while True:
            sql = f"{base_sql} LIMIT {page_size} OFFSET {offset}"
            text = mcp_dbhub(sql)
            rows = parse_md_table(text)
            if not rows:
                break
            if writer is None:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), extrasaction="ignore")
                writer.writeheader()
            for r in rows:
                writer.writerow(r)
            total += len(rows)
            if total % 500 == 0 or len(rows) < page_size:
                print(f"{name}: +{len(rows)} total={total} offset={offset}", flush=True)
            if expected is not None and total >= expected:
                break
            if len(rows) < page_size:
                break
            offset += page_size
            time.sleep(0.02)
    meta = {"name": name, "rows": total, "path": str(out_csv)}
    (CACHE / f"{name}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print("DONE", meta, flush=True)
    return total


ORDER_FILTER = (
    "o.vas_type='NON_STANDARD_VASC' AND o.is_delete='N' "
    "AND o.order_date >= '2026-04-21 00:00:00' AND o.order_date < '2026-08-01 00:00:00'"
)


def main():
    # Gateway returns max ~50 rows/call; page with OFFSET.
    export_sql(
        "orders",
        """
SELECT order_no, order_date, product_code, product_name, va_source,
       warehouse_code, warehouse_name, customer_code, customer_name,
       status, IS_AUDIT_THROUGH AS is_audit_through, actual_audit_time
FROM oms.oms_va_order
WHERE vas_type='NON_STANDARD_VASC' AND is_delete='N'
  AND order_date >= '2026-04-21 00:00:00' AND order_date < '2026-08-01 00:00:00'
ORDER BY order_no
""",
        page_size=50,
        expected=3962,
    )

    export_sql(
        "atoms",
        f"""
SELECT a.id AS atom_id, a.order_no, a.service_code, a.service_name, a.service_sequence,
       a.SCENE_OVERVIEW_CODE AS scene_overview_code, a.SCENE_OVERVIEW_NAME AS scene_overview_name,
       a.sop, a.vas_des, a.status AS atom_status
FROM oms.oms_va_atom a
INNER JOIN oms.oms_va_order o ON a.order_no=o.order_no
WHERE {ORDER_FILTER} AND a.is_delete='N'
ORDER BY a.order_no, a.id
""",
        page_size=50,
        expected=3991,
    )

    export_sql(
        "traces",
        f"""
SELECT t.order_no, t.event_code, t.event_content, t.supplement_desc, t.old_status, t.new_status, t.trace_time
FROM oms.oms_va_order_trace t
INNER JOIN oms.oms_va_order o ON t.order_no=o.order_no
WHERE {ORDER_FILTER} AND t.is_delete='N'
ORDER BY t.order_no, t.trace_time, t.id
""",
        page_size=50,
        expected=18729,
    )

    export_sql(
        "files",
        f"""
SELECT f.order_no, f.va_atom_id, f.attr_id, f.file_name, f.url, f.type, f.file_type, f.created,
       atr.attribute_name, atr.attribute_key, atr.INPUT_NODE AS input_node,
       atr.service_code, atr.service_sequence
FROM oms.oms_va_execute_file f
INNER JOIN oms.oms_va_order o ON f.order_no=o.order_no
LEFT JOIN oms.oms_va_atom_attr atr ON atr.id=f.attr_id
WHERE {ORDER_FILTER} AND f.is_delete='N'
ORDER BY f.order_no, f.id
""",
        page_size=50,
        expected=9380,
    )

    export_sql(
        "attrs_submit",
        f"""
SELECT atr.id AS attr_id, atr.order_no, atr.va_atom_id, atr.service_code, atr.service_sequence,
       atr.attribute_name, atr.attribute_key,
       LEFT(REPLACE(REPLACE(REPLACE(IFNULL(atr.attribute_value,''), '|', '/'), CHAR(10), ' '), CHAR(13), ' '), 4000) AS attribute_value,
       atr.INPUT_NODE AS input_node
FROM oms.oms_va_atom_attr atr
INNER JOIN oms.oms_va_order o ON atr.order_no=o.order_no
WHERE {ORDER_FILTER} AND atr.is_delete='N' AND atr.INPUT_NODE='SUBMIT'
ORDER BY atr.order_no, atr.id
""",
        page_size=50,
        expected=43006,
    )


if __name__ == "__main__":
    main()
