# coding: utf-8
"""Export OMS va execute files for the 20260909 cache window (previously skipped).

Output: Nonsta_Valueadded_Combined/_runs/20260911_attachment_stats/_oms_files/
"""
from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path
import urllib.request

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT = ROOT / "_runs" / "20260911_attachment_stats" / "_oms_files"
OUT.mkdir(parents=True, exist_ok=True)
LOG = OUT / "_export_log.txt"
MCP_JSON = Path(r"C:\Users\ying.jin\.cursor\mcp.json")
DATE_FROM = "2026-04-21 00:00:00"
DATE_TO = "2026-09-04 00:00:00"
ORDER_FILTER = (
    "o.vas_type='NON_STANDARD_VASC' AND o.is_delete='N' "
    f"AND o.order_date >= '{DATE_FROM}' AND o.order_date < '{DATE_TO}'"
)


def load_auth():
    cfg = json.loads(MCP_JSON.read_text(encoding="utf-8"))
    w = cfg["mcpServers"]["winit-data"]
    return w["url"], w["headers"]["Authorization"]


def mcp_dbhub(sql: str, timeout: int = 300, retries: int = 8) -> str:
    url, auth = load_auth()
    last_err = ""
    for attempt in range(1, retries + 1):
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
        try:
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
            if "invalid connection" in text.lower() or text.startswith("Query error"):
                last_err = text[:300]
                log(f"retry {attempt}/{retries}: {last_err}")
                time.sleep(min(2 * attempt, 10))
                continue
            return text
        except Exception as exc:
            last_err = str(exc)
            log(f"retry {attempt}/{retries}: {last_err}")
            time.sleep(min(2 * attempt, 10))
    raise RuntimeError(last_err or "dbhub failed")


def parse_md_table(md: str) -> list[dict]:
    stripped = md.strip()
    if not stripped or stripped.lower().startswith("0 row"):
        return []
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


def export_sql(name: str, base_sql: str, page_size: int = 50) -> int:
    out_csv = OUT / f"{name}.csv"
    offset = 0
    total = 0
    resume = out_csv.exists() and out_csv.stat().st_size > 80
    mode = "a" if resume else "w"
    existing_fields = None
    if resume:
        with out_csv.open("r", encoding="utf-8-sig", newline="") as rf:
            reader = csv.DictReader(rf)
            existing_fields = reader.fieldnames
            total = sum(1 for _ in reader)
        offset = total
        log(f"resume {name} existing={total} offset={offset}")
    writer = None
    with out_csv.open(mode, encoding="utf-8-sig", newline="") as f:
        while True:
            sql = f"{base_sql} LIMIT {page_size} OFFSET {offset}"
            text = mcp_dbhub(sql)
            rows = parse_md_table(text)
            if not rows:
                break
            if writer is None:
                fields = existing_fields or list(rows[0].keys())
                writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
                if not resume:
                    writer.writeheader()
            for r in rows:
                writer.writerow(r)
            total += len(rows)
            log(f"{name}: +{len(rows)} total={total} offset={offset}")
            if len(rows) < page_size:
                break
            offset += page_size
            time.sleep(0.05)
    meta = {
        "name": name,
        "rows": total,
        "path": str(out_csv),
        "dateFrom": DATE_FROM,
        "dateToExclusive": DATE_TO,
        "source": "oms.oms_va_execute_file",
        "note": "20260909 cache 明确 skipped files；本表补抓 SUBMIT/FINISH 真实上传文件",
    }
    (OUT / f"{name}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"DONE {meta}")
    return total


def main() -> None:
    LOG.write_text("export files start\n", encoding="utf-8") if not (OUT / "files.csv").exists() else None
    if (OUT / "files.csv").exists():
        log("continue existing files.csv")
    export_sql(
        "files",
        f"""
SELECT f.id AS file_id, f.order_no, f.va_atom_id, f.attr_id, f.file_name,
       LEFT(IFNULL(f.url,''), 500) AS url, f.type, f.file_type, f.created,
       atr.attribute_name, atr.attribute_key, atr.INPUT_NODE AS input_node,
       atr.service_code, atr.service_sequence
FROM oms.oms_va_execute_file f
INNER JOIN oms.oms_va_order o ON f.order_no=o.order_no
LEFT JOIN oms.oms_va_atom_attr atr ON atr.id=f.attr_id
WHERE {ORDER_FILTER} AND f.is_delete='N'
ORDER BY f.order_no, f.id
""",
        page_size=50,
    )


if __name__ == "__main__":
    main()
