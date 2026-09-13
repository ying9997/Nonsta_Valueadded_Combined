# coding: utf-8
"""Export OMS NON_STANDARD_VASC cache aligned to three-chat latest date (to 2026-09-03)."""
from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path

import urllib.request

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_inbound_scene_probe")
CACHE = OUT / "_oms_cache"
CACHE.mkdir(parents=True, exist_ok=True)
LOG = CACHE / "_export_log.txt"
MCP_JSON = Path(r"C:\Users\ying.jin\.cursor\mcp.json")

# Chat: 日期/开始 max=2026-07-31, but 结束时间 & 对话消息 max=2026-09-03
DATE_FROM = "2026-04-21 00:00:00"
DATE_TO = "2026-09-04 00:00:00"  # right-open, inclusive of 2026-09-03

ORDER_FILTER = (
    "o.vas_type='NON_STANDARD_VASC' AND o.is_delete='N' "
    f"AND o.order_date >= '{DATE_FROM}' AND o.order_date < '{DATE_TO}'"
)


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
        texts = []
        for c in result["content"]:
            if isinstance(c, dict) and c.get("type") == "text":
                texts.append(c.get("text") or "")
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


def log(msg: str) -> None:
    print(msg, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(msg + "\n")


def export_sql(name: str, base_sql: str, page_size: int = 50, expected: int | None = None):
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
                log(f"{name}: +{len(rows)} total={total} offset={offset}")
            if expected is not None and total >= expected:
                break
            if len(rows) < page_size:
                break
            offset += page_size
            time.sleep(0.02)
    meta = {
        "name": name,
        "rows": total,
        "path": str(out_csv),
        "dateFrom": DATE_FROM,
        "dateToExclusive": DATE_TO,
        "alignedTo": "three_chat 结束时间/对话消息 max 2026-09-03",
    }
    (CACHE / f"{name}.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(f"DONE {meta}")
    return total


def main():
    LOG.write_text(
        f"export start aligned window [{DATE_FROM}, {DATE_TO})\n", encoding="utf-8"
    )
    export_sql(
        "orders",
        f"""
SELECT order_no, order_date, product_code, product_name, va_source,
       warehouse_code, warehouse_name, customer_code, customer_name,
       status, IS_AUDIT_THROUGH AS is_audit_through, actual_audit_time
FROM oms.oms_va_order
WHERE vas_type='NON_STANDARD_VASC' AND is_delete='N'
  AND order_date >= '{DATE_FROM}' AND order_date < '{DATE_TO}'
ORDER BY order_no
""",
        expected=5112,
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
        expected=5145,
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
        expected=24088,
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
        expected=55250,
    )
    summary = {
        "window": {"from": DATE_FROM, "toExclusive": DATE_TO},
        "chatAlign": {
            "threadDateMax": "2026-07-31",
            "threadEndMax": "2026-09-03",
            "messageDateMax": "2026-09-03",
            "reason": "OMS order_date aligned to chat 结束时间/对话消息 latest day",
        },
        "skipped": ["files"],
        "cacheDir": str(CACHE),
    }
    (OUT / "oms-cache-window.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log("ALL DONE")


if __name__ == "__main__":
    main()
