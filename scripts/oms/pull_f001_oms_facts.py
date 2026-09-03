# -*- coding: utf-8 -*-
"""Pull live OMS facts for F-001 using current pageQuery / getVasList / getEventOrder fields.

Does not overwrite workspace/data/raw/全量_增值单接口口径事实补齐.xlsx.
No status filter (keeps CD / ES / in-progress).
"""
from __future__ import annotations

import json
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    _new_session,
    _rows,
    get_event_orders,
    get_vas_list,
    oms_post,
    refresh_oms_csrf,
)

SCENE = "【入库】尺重/标签辨识后换标上架"
SCENE_CODE = "20250407004"
ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT_DIR = ROOT / "_runs" / "20260901_oms_facts"


def ms_to_iso(ms):
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def page_all(session):
    start = 0
    length = 50
    all_rows = []
    total = None
    while True:
        data = oms_post(
            session,
            {
                "api": "oms.VaOrderService_pageQuery",
                "draw": "1",
                "start": str(start),
                "length": str(length),
                "where[sceneOverviewCode]": SCENE_CODE,
            },
        )
        info = data.get("info")
        rows = _rows(info)
        if isinstance(info, dict):
            total = info.get("totalElements") or info.get("recordsTotal") or total
        all_rows.extend(rows)
        print(f"page start={start} got={len(rows)} accumulated={len(all_rows)} total={total}", flush=True)
        if not rows:
            break
        start += length
        if total is not None and start >= int(total):
            break
        if start > 5000:
            break
        time.sleep(0.2)
    by = {}
    for r in all_rows:
        by[r.get("orderNo")] = r
    return list(by.values()), total


def flatten_header(row: dict) -> dict:
    wh = row.get("warehouse") or {}
    cust = row.get("customer") or {}
    prod = row.get("product") or {}
    out = dict(row)
    out["warehouseCode"] = wh.get("warehouseCode") if isinstance(wh, dict) else None
    out["warehouseName"] = wh.get("warehouseName") if isinstance(wh, dict) else None
    out["customerCode"] = cust.get("customerCode") if isinstance(cust, dict) else None
    out["customerName"] = cust.get("customerName") if isinstance(cust, dict) else None
    out["productCode"] = prod.get("productCode") if isinstance(prod, dict) else None
    out["productName"] = prod.get("productName") if isinstance(prod, dict) else None
    out["createdIso"] = ms_to_iso(row.get("created"))
    return out


def pull_one(session, header: dict) -> dict:
    vasc = header.get("orderNo")
    atoms = []
    events = []
    errors = []
    try:
        atoms = get_vas_list(session, vasc)
    except Exception as exc:
        errors.append(f"getVasList: {exc}")
        time.sleep(0.4)
    for atom in atoms:
        code = atom.get("serviceCode") or ""
        seq = str(atom.get("serviceSequence") or "1")
        if not code:
            continue
        try:
            evs = get_event_orders(session, vasc, code, seq)
        except Exception as exc:
            errors.append(f"getEventOrder {code}/{seq}: {exc}")
            evs = []
            time.sleep(0.3)
        for ev in evs:
            ev = dict(ev)
            ev["_orderNo"] = vasc
            ev["_serviceCode"] = code
            ev["_serviceSequence"] = seq
            events.append(ev)
        time.sleep(0.08)
    return {
        "orderNo": vasc,
        "listHeader": flatten_header(header),
        "atoms": atoms,
        "events": events,
        "errors": errors,
    }


def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = _new_session()
    refresh_oms_csrf(session)

    list_rows, total = page_all(session)
    print("unique list orders", len(list_rows), "reported total", total, flush=True)
    write_json(OUT_DIR / "pagequery_raw.json", {"sceneOverviewCode": SCENE_CODE, "total": total, "rows": list_rows})

    details = []
    checkpoint = OUT_DIR / "details_checkpoint.json"
    done = {}
    if checkpoint.exists():
        done = {r["orderNo"]: r for r in json.loads(checkpoint.read_text(encoding="utf-8"))}
        print("resume from checkpoint", len(done), flush=True)

    for i, row in enumerate(list_rows, 1):
        vasc = row.get("orderNo")
        if vasc in done:
            details.append(done[vasc])
            continue
        item = pull_one(session, row)
        details.append(item)
        done[vasc] = item
        if i % 10 == 0 or item["errors"]:
            write_json(checkpoint, list(done.values()))
            print(
                f"[{i}/{len(list_rows)}] {vasc} atoms={len(item['atoms'])} events={len(item['events'])} err={item['errors']}",
                flush=True,
            )
        time.sleep(0.12)

    write_json(checkpoint, list(done.values()))

    summary_rows = []
    atom_rows = []
    event_rows = []
    for item in details:
        h = item["listHeader"]
        ebs = []
        wis = []
        for ev in item["events"]:
            if ev.get("eventNo"):
                ebs.append(ev["eventNo"])
            bo = ev.get("businessOrder") or {}
            if isinstance(bo, dict) and bo.get("businessNo"):
                if str(bo["businessNo"]).upper().startswith("WI"):
                    wis.append(bo["businessNo"])
                if str(bo["businessNo"]).upper().startswith("EB"):
                    ebs.append(bo["businessNo"])
        for atom in item["atoms"]:
            blob = " ".join(
                str(atom.get(k) or "")
                for k in ("sop", "requirementDescription", "requirementBackground", "vasDes")
            )
            ebs.extend(re.findall(r"EB\d{6,}", blob, flags=re.I))
            wis.extend(re.findall(r"WI\d{6,}", blob, flags=re.I))
        ebs = sorted({x.upper() for x in ebs if x})
        wis = sorted({x.upper() for x in wis if x})
        scenes = sorted({(a.get("sceneOverviewName") or "").strip() for a in item["atoms"] if a.get("sceneOverviewName")})
        summary_rows.append(
            {
                "orderNo": item["orderNo"],
                "status": h.get("status"),
                "statusDesc": h.get("statusDesc"),
                "createdIso": h.get("createdIso"),
                "warehouseCode": h.get("warehouseCode"),
                "customerCode": h.get("customerCode"),
                "productCode": h.get("productCode"),
                "isAuditThrough": h.get("isAuditThrough"),
                "sceneOverviewName": SCENE if SCENE in scenes else (scenes[0] if scenes else ""),
                "scenes": scenes,
                "ebsOfficial": [e.get("eventNo") for e in item["events"] if e.get("eventNo")],
                "ebsAll": ebs,
                "wis": wis,
                "atomCount": len(item["atoms"]),
                "eventCount": len(item["events"]),
                "errors": item["errors"],
            }
        )
        for atom in item["atoms"]:
            atom_rows.append({"orderNo": item["orderNo"], **atom})
        event_rows.extend(item["events"])

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sceneOverviewName": SCENE,
        "sceneOverviewCode": SCENE_CODE,
        "filter": "where[sceneOverviewCode]=20250407004; no status filter",
        "sourceApis": [
            "oms.VaOrderService_pageQuery",
            "oms.VaOrderService_getVasList",
            "oms.VaOrderService_getEventOrder4VaAtom",
        ],
        "listCount": len(list_rows),
        "detailCount": len(details),
        "statusDesc": Counter(str(r.get("statusDesc") or "") for r in summary_rows).most_common(),
        "withOfficialEb": sum(1 for r in summary_rows if r["ebsOfficial"]),
        "withAnyEb": sum(1 for r in summary_rows if r["ebsAll"]),
        "errorOrders": sum(1 for r in summary_rows if r["errors"]),
    }
    write_json(OUT_DIR / "summary.json", payload)
    write_json(OUT_DIR / "orders_summary.json", summary_rows)
    write_json(OUT_DIR / "va_atoms.json", atom_rows)
    write_json(OUT_DIR / "events.json", event_rows)
    write_json(OUT_DIR / "details.json", details)

    lines = [
        "# F-001 OMS 接口事实重拉",
        "",
        f"- 生成：{payload['generatedAt']}",
        f"- 场景：{SCENE} / {SCENE_CODE}",
        "- 过滤：仅 sceneOverviewCode；**未剔除**取消/异常终止",
        "- 未覆盖旧表 `workspace/data/raw/全量_增值单接口口径事实补齐.xlsx`",
        f"- pageQuery 条数：{payload['listCount']}",
        f"- 状态：{payload['statusDesc']}",
        f"- 有官方 eventNo：{payload['withOfficialEb']}",
        f"- 有任一 EB（官方+正文）：{payload['withAnyEb']}",
        f"- 拉数失败单：{payload['errorOrders']}",
        "",
        "字段来自当前 OMS 导出接口：pageQuery 行 + getVasList 原子 + getEventOrder4VaAtom。",
    ]
    (OUT_DIR / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2), flush=True)
    print("wrote", OUT_DIR, flush=True)


if __name__ == "__main__":
    main()
