# -*- coding: utf-8 -*-
"""Expand F-001 pool: related VASCs via WI, keep those sharing official EB (empty-scene old orders).

OMS related API does not accept EB; WI is the retrieval key. EB overlap is the keep rule.
"""
from __future__ import annotations

import json
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    _new_session,
    get_event_orders,
    get_related_orders,
    get_vas_list,
    page_query,
    refresh_oms_csrf,
)

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
SRC = ROOT / "_runs" / "20260901_oms_facts"
OUT = ROOT / "_runs" / "20260901_oms_eb_expand"
SCENE = "【入库】尺重/标签辨识后换标上架"


def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def uniq(xs):
    seen = []
    for x in xs:
        if x and x not in seen:
            seen.append(x)
    return seen


def pull_extra(session, vasc: str) -> dict:
    header = {}
    try:
        rows = page_query(session, orderNo=vasc)
        header = rows[0] if rows else {}
    except Exception as exc:
        header = {"_headerError": str(exc)}
    atoms, events, errors = [], [], []
    try:
        atoms = get_vas_list(session, vasc)
    except Exception as exc:
        errors.append(f"getVasList: {exc}")
        time.sleep(0.4)
    for atom in atoms[:3]:
        code = atom.get("serviceCode") or ""
        seq = str(atom.get("serviceSequence") or "1")
        if not code:
            continue
        try:
            evs = get_event_orders(session, vasc, code, seq)
        except Exception as exc:
            errors.append(f"getEventOrder: {exc}")
            evs = []
            time.sleep(0.3)
        for ev in evs:
            ev = dict(ev)
            ev["_orderNo"] = vasc
            events.append(ev)
        time.sleep(0.06)
    scenes = uniq([(a.get("sceneOverviewName") or "").strip() for a in atoms])
    ebs = uniq([e.get("eventNo") for e in events if e.get("eventNo")])
    wh = header.get("warehouse") or {}
    return {
        "orderNo": vasc,
        "status": header.get("status"),
        "statusDesc": header.get("statusDesc"),
        "isAuditThrough": header.get("isAuditThrough"),
        "warehouseCode": wh.get("warehouseCode") if isinstance(wh, dict) else None,
        "scenes": scenes,
        "emptyScene": not any(scenes),
        "exactF001": SCENE in scenes,
        "ebsOfficial": ebs,
        "sop": next((a.get("sop") or "" for a in atoms if a.get("sop")), ""),
        "serviceName": next((a.get("serviceName") for a in atoms if a.get("serviceName")), ""),
        "atomStatus": next((a.get("statusDesc") for a in atoms if a.get("statusDesc")), ""),
        "errors": errors,
        "header": header,
        "atoms": atoms,
        "events": events,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    seeds = json.loads((SRC / "orders_summary.json").read_text(encoding="utf-8"))
    seed_nos = {r["orderNo"] for r in seeds}
    seed_ebs = set()
    wi_to_seeds = defaultdict(list)
    for r in seeds:
        for eb in r.get("ebsOfficial") or []:
            seed_ebs.add(eb)
        for wi in r.get("wis") or []:
            wi_to_seeds[wi].append(r["orderNo"])

    session = _new_session()
    refresh_oms_csrf(session)

    related_raw = []
    extra_nos = set()
    items = list(wi_to_seeds.items())
    print(f"unique WI {len(items)} seedEBs {len(seed_ebs)}", flush=True)
    for i, (wi, vascs) in enumerate(items, 1):
        seed = vascs[0]
        try:
            rows = get_related_orders(session, seed, wi)
        except Exception as exc:
            print(f"related fail {seed} {wi}: {exc}", flush=True)
            rows = []
            time.sleep(0.4)
        nos = uniq([r.get("orderNo") for r in rows if isinstance(r, dict)])
        related_raw.append({"wi": wi, "seed": seed, "related": nos})
        for n in nos:
            if n and n not in seed_nos:
                extra_nos.add(n)
        if i % 20 == 0:
            print(f"related [{i}/{len(items)}] extra={len(extra_nos)}", flush=True)
        time.sleep(0.12)

    write_json(OUT / "related_by_wi.json", related_raw)
    extras = sorted(extra_nos)
    write_json(OUT / "extra_vasc_nos.json", extras)
    print("extra VASCs", len(extras), flush=True)

    ck = OUT / "extras_checkpoint.json"
    done = {}
    if ck.exists():
        done = {r["orderNo"]: r for r in json.loads(ck.read_text(encoding="utf-8"))}

    details = []
    for i, vasc in enumerate(extras, 1):
        if vasc in done:
            details.append(done[vasc])
            continue
        item = pull_extra(session, vasc)
        shared = [eb for eb in item.get("ebsOfficial") or [] if eb in seed_ebs]
        item["sharedSeedEbs"] = shared
        item["keepAsEbExpand"] = bool(shared) or item.get("emptyScene")
        details.append(item)
        done[vasc] = item
        if i % 8 == 0 or item.get("errors"):
            write_json(ck, list(done.values()))
            print(
                f"detail [{i}/{len(extras)}] {vasc} st={item.get('statusDesc')} empty={item.get('emptyScene')} shared={len(shared)}",
                flush=True,
            )
        time.sleep(0.12)
    write_json(ck, list(done.values()))
    write_json(OUT / "extras_details.json", details)

    keep = [d for d in details if d.get("sharedSeedEbs") or d.get("emptyScene")]
    shared = [d for d in details if d.get("sharedSeedEbs")]
    empty = [d for d in details if d.get("emptyScene")]
    empty_cd = [d for d in empty if d.get("status") == "CD"]
    shared_cd = [d for d in shared if d.get("status") == "CD"]

    # EB groups: seed + extra sharing same EB
    eb_to_extra = defaultdict(list)
    for d in shared:
        for eb in d["sharedSeedEbs"]:
            eb_to_extra[eb].append(d["orderNo"])
    seed_by_eb = defaultdict(list)
    for r in seeds:
        for eb in r.get("ebsOfficial") or []:
            seed_by_eb[eb].append({"orderNo": r["orderNo"], "status": r["status"], "statusDesc": r["statusDesc"]})

    contrast = []
    for eb, extras_on_eb in eb_to_extra.items():
        seeds_on = seed_by_eb.get(eb) or []
        extra_rows = [d for d in shared if d["orderNo"] in extras_on_eb]
        contrast.append(
            {
                "eb": eb,
                "seedOrders": seeds_on,
                "extraOrders": [
                    {
                        "orderNo": d["orderNo"],
                        "status": d.get("status"),
                        "statusDesc": d.get("statusDesc"),
                        "emptyScene": d.get("emptyScene"),
                        "scenes": d.get("scenes"),
                        "isAuditThrough": d.get("isAuditThrough"),
                        "sopHead": (d.get("sop") or "").replace("\r\n", " ")[:180],
                    }
                    for d in extra_rows
                ],
            }
        )

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "method": "get_related_orders(seedVasc, WI) then keep extras that share official eventNo with F-001 seeds, or have empty sceneOverviewName",
        "seedCount": len(seeds),
        "uniqueWi": len(wi_to_seeds),
        "extraCount": len(extras),
        "sharedEbCount": len(shared),
        "emptySceneCount": len(empty),
        "emptySceneCancelled": len(empty_cd),
        "sharedEbCancelled": len(shared_cd),
        "ebContrastGroups": len(contrast),
        "note": "Related API cannot query by EB; WI is retrieval, EB overlap is the business keep rule.",
    }
    write_json(OUT / "summary.json", summary)
    write_json(OUT / "eb_contrast_groups.json", contrast)
    write_json(
        OUT / "keep_empty_or_shared.json",
        [
            {
                "orderNo": d["orderNo"],
                "status": d.get("status"),
                "statusDesc": d.get("statusDesc"),
                "emptyScene": d.get("emptyScene"),
                "exactF001": d.get("exactF001"),
                "scenes": d.get("scenes"),
                "sharedSeedEbs": d.get("sharedSeedEbs"),
                "isAuditThrough": d.get("isAuditThrough"),
                "warehouseCode": d.get("warehouseCode"),
                "sopHead": (d.get("sop") or "").replace("\r\n", " ")[:200],
            }
            for d in keep
        ],
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    print("wrote", OUT, flush=True)


if __name__ == "__main__":
    main()
