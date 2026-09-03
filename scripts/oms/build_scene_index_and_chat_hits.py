# -*- coding: utf-8 -*-
"""Scheme 1: F-001/A/B window index (VASC/EB/WI) + reverse chat lookup. No EB expand, no gold."""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT = ROOT / "_runs" / "20260902_scene_index_f001_ab"
WIN_LO = "2026-04-21"
WIN_HI = "2026-08-31"
UDESK = ROOT / "workspace" / "data" / "raw" / "data_udesk_log_database_增值.csv"
FEISHU = ROOT / "workspace" / "data" / "raw" / "飞书群聊_非标增值讨论_20260421-20260801.xlsx"
VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)

POOLS = [
    {
        "alias": "F-001",
        "code": "20250407004",
        "name": "【入库】尺重/标签辨识后换标上架",
        "summary": ROOT / "_runs" / "20260901_oms_facts" / "orders_summary.json",
        "atoms": ROOT / "_runs" / "20260901_oms_facts" / "va_atoms.json",
    },
    {
        "alias": "A",
        "code": "20250407008",
        "name": "【入库】包裹类异常换商品标签上架",
        "summary": ROOT / "_runs" / "20260902_oms_facts_a" / "orders_summary.json",
        "atoms": ROOT / "_runs" / "20260902_oms_facts_a" / "va_atoms.json",
    },
    {
        "alias": "B",
        "code": "20250522001",
        "name": "【入库】指定商品拍照暂存",
        "summary": ROOT / "_runs" / "20260902_oms_facts_b" / "orders_summary.json",
        "atoms": ROOT / "_runs" / "20260902_oms_facts_b" / "va_atoms.json",
    },
]


def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def sop_len_by_order(atom_path: Path) -> dict[str, int]:
    if not atom_path.exists():
        return {}
    out: dict[str, int] = {}
    for a in json.loads(atom_path.read_text(encoding="utf-8")):
        no = a.get("orderNo")
        if not no:
            continue
        n = len(str(a.get("sop") or "").strip())
        if n > out.get(no, 0):
            out[no] = n
    return out


def load_window_orders() -> list[dict]:
    rows = []
    for pool in POOLS:
        sop_lens = sop_len_by_order(pool["atoms"])
        for r in json.loads(pool["summary"].read_text(encoding="utf-8")):
            iso = r.get("createdIso") or ""
            day = iso[:10]
            if not day or not (WIN_LO <= day <= WIN_HI):
                continue
            ebs_off = [str(x).upper() for x in (r.get("ebsOfficial") or []) if x]
            ebs_all = [str(x).upper() for x in (r.get("ebsAll") or []) if x]
            wis = [str(x).upper() for x in (r.get("wis") or []) if x]
            rows.append(
                {
                    "alias": pool["alias"],
                    "sceneOverviewCode": pool["code"],
                    "sceneOverviewName": pool["name"],
                    "orderNo": r.get("orderNo"),
                    "status": r.get("status"),
                    "statusDesc": r.get("statusDesc"),
                    "createdIso": iso,
                    "warehouseCode": r.get("warehouseCode"),
                    "isAuditThrough": r.get("isAuditThrough"),
                    "cancelReason": r.get("cancelReason"),
                    "failReason": r.get("failReason"),
                    "ebsOfficial": sorted(set(ebs_off)),
                    "ebsAll": sorted(set(ebs_all)),
                    "wis": sorted(set(wis)),
                    "sopChars": sop_lens.get(r.get("orderNo") or "", 0),
                    "errors": r.get("errors") or [],
                }
            )
    return rows


class UF:
    def __init__(self, items: list[str]):
        self.p = {x: x for x in items}

    def find(self, x: str) -> str:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[rb] = ra


def group_by_eb(orders: list[dict]) -> list[dict]:
    keys = [o["orderNo"] for o in orders]
    uf = UF(keys)
    eb_to = defaultdict(list)
    for o in orders:
        for eb in o["ebsOfficial"] or o["ebsAll"]:
            eb_to[eb].append(o["orderNo"])
    for nos in eb_to.values():
        for a, b in zip(nos, nos[1:]):
            uf.union(a, b)
    buckets = defaultdict(list)
    by_no = {o["orderNo"]: o for o in orders}
    for no in keys:
        buckets[uf.find(no)].append(by_no[no])
    groups = []
    for i, members in enumerate(sorted(buckets.values(), key=lambda xs: min(x["orderNo"] for x in xs)), 1):
        aliases = sorted({m["alias"] for m in members})
        ebs = sorted({e for m in members for e in (m["ebsOfficial"] or m["ebsAll"])})
        wis = sorted({w for m in members for w in m["wis"]})
        statuses = sorted({m["statusDesc"] or "" for m in members})
        groups.append(
            {
                "groupId": f"g{i:03d}",
                "aliases": aliases,
                "primaryAlias": aliases[0] if len(aliases) == 1 else "MIXED",
                "memberCount": len(members),
                "orderNos": [m["orderNo"] for m in members],
                "statusDescs": statuses,
                "hasPassAndFail": bool(
                    {"已完成"} & set(statuses) and ({"已取消", "异常终止"} & set(statuses))
                ),
                "ebs": ebs,
                "wis": wis,
                "maxSopChars": max(m["sopChars"] for m in members),
                "members": members,
            }
        )
    return groups


def index_udesk(orders: list[dict]) -> tuple[dict, list[dict]]:
    vasc_set = {o["orderNo"].upper() for o in orders}
    eb_to = defaultdict(set)
    wi_to = defaultdict(set)
    for o in orders:
        for eb in o["ebsOfficial"] or o["ebsAll"]:
            eb_to[eb].add(o["orderNo"])
        for wi in o["wis"]:
            wi_to[wi].add(o["orderNo"])
    sessions = []
    if not UDESK.exists():
        return {}, sessions
    with UDESK.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        text = (r.get("messages") or "") + "\n" + (r.get("主题") or "") + "\n" + (r.get("场景分类") or "")
        found_v = {x.upper() for x in VASC_RE.findall(text)}
        found_e = {x.upper() for x in EB_RE.findall(text)}
        found_w = {x.upper() for x in WI_RE.findall(text)}
        hits = []
        for v in found_v & vasc_set:
            hits.append({"kind": "vasc", "value": v, "orderNo": v})
        for e in found_e:
            for no in eb_to.get(e, ()):
                hits.append({"kind": "eb", "value": e, "orderNo": no})
        for w in found_w:
            for no in wi_to.get(w, ()):
                hits.append({"kind": "wi", "value": w, "orderNo": no})
        if not hits:
            continue
        kinds = sorted({h["kind"] for h in hits})
        vascs = sorted({h["orderNo"] for h in hits})
        sessions.append(
            {
                "source": "udesk",
                "conversationId": r.get("对话ID") or "",
                "date": r.get("对话开始时间") or r.get("date") or "",
                "customerMsgCount": r.get("对话客户消息数") or "",
                "agentMsgCount": r.get("客服消息数") or "",
                "matchKinds": kinds,
                "matchedOrderNos": vascs,
                "matchedKeys": sorted({(h["kind"], h["value"]) for h in hits}),
            }
        )
    by_order: dict[str, list[dict]] = defaultdict(list)
    for s in sessions:
        slim = {k: s[k] for k in ("source", "conversationId", "date", "customerMsgCount", "matchKinds")}
        for no in s["matchedOrderNos"]:
            by_order[no].append(slim)
    return by_order, sessions


def index_feishu(orders: list[dict]) -> tuple[dict, list[dict], str]:
    if not FEISHU.exists():
        return {}, [], "missing"
    try:
        import pandas as pd
    except ImportError:
        return {}, [], "pandas_missing"
    vasc_set = {o["orderNo"].upper() for o in orders}
    eb_to = defaultdict(set)
    wi_to = defaultdict(set)
    for o in orders:
        for eb in o["ebsOfficial"] or o["ebsAll"]:
            eb_to[eb].add(o["orderNo"])
        for wi in o["wis"]:
            wi_to[wi].add(o["orderNo"])
    xl = pd.ExcelFile(FEISHU)
    sheet = "讨论明细" if "讨论明细" in xl.sheet_names else xl.sheet_names[0]
    df = xl.parse(sheet, dtype=str).fillna("")
    text_cols = [c for c in df.columns if df[c].dtype == object]
    sessions = []
    for i, row in df.iterrows():
        blob = " ".join(str(row.get(c, "")) for c in text_cols)
        found_v = {x.upper() for x in VASC_RE.findall(blob)}
        found_e = {x.upper() for x in EB_RE.findall(blob)}
        found_w = {x.upper() for x in WI_RE.findall(blob)}
        hits = []
        for v in found_v & vasc_set:
            hits.append(("vasc", v, v))
        for e in found_e:
            for no in eb_to.get(e, ()):
                hits.append(("eb", e, no))
        for w in found_w:
            for no in wi_to.get(w, ()):
                hits.append(("wi", w, no))
        if not hits:
            continue
        sessions.append(
            {
                "source": "feishu",
                "sheet": sheet,
                "row": int(i),
                "date": str(row.get("日期") or ""),
                "matchKinds": sorted({h[0] for h in hits}),
                "matchedOrderNos": sorted({h[2] for h in hits}),
            }
        )
    by_order: dict[str, list[dict]] = defaultdict(list)
    for s in sessions:
        slim = {k: s[k] for k in ("source", "date", "matchKinds", "row")}
        for no in s["matchedOrderNos"]:
            by_order[no].append(slim)
    return by_order, sessions, "ok"


def layer_of(udesk_n: int, feishu_n: int) -> str:
    if udesk_n and feishu_n:
        return "both"
    if udesk_n:
        return "udesk"
    if feishu_n:
        return "feishu"
    return "none"


def pick_groups(groups: list[dict], alias: str, limit: int = 10) -> list[dict]:
    rank = {"both": 0, "udesk": 1, "feishu": 2, "none": 3}
    cand = [g for g in groups if alias in g["aliases"] or g["primaryAlias"] == alias]
    cand.sort(
        key=lambda g: (
            rank.get(g["chatLayer"], 9),
            0 if g["hasPassAndFail"] else 1,
            0 if g["maxSopChars"] >= 40 else 1,
            -g["memberCount"],
            g["orderNos"][0],
        )
    )
    return cand[:limit]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    orders = load_window_orders()
    groups = group_by_eb(orders)
    udesk_by, udesk_sessions = index_udesk(orders)
    feishu_by, feishu_sessions, feishu_status = index_feishu(orders)

    for o in orders:
        o["udeskHits"] = udesk_by.get(o["orderNo"], [])
        o["feishuHits"] = feishu_by.get(o["orderNo"], [])
        o["chatLayer"] = layer_of(len(o["udeskHits"]), len(o["feishuHits"]))

    for g in groups:
        u = sum(len(m.get("udeskHits") or udesk_by.get(m["orderNo"], [])) for m in g["members"])
        f = sum(len(m.get("feishuHits") or feishu_by.get(m["orderNo"], [])) for m in g["members"])
        # attach hits onto members for group file
        for m in g["members"]:
            m["udeskHits"] = udesk_by.get(m["orderNo"], [])
            m["feishuHits"] = feishu_by.get(m["orderNo"], [])
        g["udeskSessionCount"] = len({h.get("conversationId") for m in g["members"] for h in m["udeskHits"] if h.get("conversationId")})
        g["feishuHitCount"] = f
        g["chatLayer"] = layer_of(u, f)

    picked = {p["alias"]: pick_groups(groups, p["alias"], 10) for p in POOLS}

    def count_alias(alias: str) -> dict:
        os_ = [o for o in orders if o["alias"] == alias]
        gs = [g for g in groups if alias in g["aliases"]]
        layers = defaultdict(int)
        for g in gs:
            layers[g["chatLayer"]] += 1
        return {
            "orders": len(os_),
            "groups": len(gs),
            "status": sorted({(o["statusDesc"], sum(1 for x in os_ if x["statusDesc"] == o["statusDesc"])) for o in os_}),
            "statusDesc": {s: sum(1 for o in os_ if o["statusDesc"] == s) for s in sorted({o["statusDesc"] or "" for o in os_})},
            "withOfficialEb": sum(1 for o in os_ if o["ebsOfficial"]),
            "withWi": sum(1 for o in os_ if o["wis"]),
            "withSop40": sum(1 for o in os_ if o["sopChars"] >= 40),
            "chatLayers": dict(layers),
            "picked": len(picked[alias]),
            "pickedLayers": {k: sum(1 for g in picked[alias] if g["chatLayer"] == k) for k in ("both", "udesk", "feishu", "none")},
        }

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scheme": "1_index_then_stratify",
        "window": {"lo": WIN_LO, "hi": WIN_HI, "field": "createdIso", "note": "pageQuery date where is invalid; filtered locally"},
        "sources": {
            "f001": " _runs/20260901_oms_facts/",
            "a": "_runs/20260902_oms_facts_a/",
            "b": "_runs/20260902_oms_facts_b/",
            "udesk": str(UDESK),
            "feishu": str(FEISHU),
            "feishuStatus": feishu_status,
        },
        "totals": {
            "orders": len(orders),
            "groups": len(groups),
            "udeskSessions": len(udesk_sessions),
            "feishuThreads": len(feishu_sessions),
        },
        "byAlias": {p["alias"]: count_alias(p["alias"]) for p in POOLS},
        "notDone": [
            "no EB/WI sibling expand (scheme 2)",
            "no gold / candidates.jsonl",
            "no CASEBOOK",
            "no SOP §2.5/§2.7 pass",
        ],
    }

    index_rows = [
        {
            "alias": o["alias"],
            "orderNo": o["orderNo"],
            "statusDesc": o["statusDesc"],
            "createdIso": o["createdIso"],
            "warehouseCode": o["warehouseCode"],
            "ebsOfficial": ";".join(o["ebsOfficial"]),
            "ebsAll": ";".join(o["ebsAll"]),
            "wis": ";".join(o["wis"]),
            "sopChars": o["sopChars"],
            "chatLayer": o["chatLayer"],
            "udeskSessions": len({h.get("conversationId") for h in o["udeskHits"] if h.get("conversationId")}),
            "feishuHits": len(o["feishuHits"]),
        }
        for o in sorted(orders, key=lambda x: (x["alias"], x["createdIso"] or "", x["orderNo"]))
    ]

    write_json(OUT / "summary.json", summary)
    write_json(OUT / "orders_index.json", orders)
    write_json(OUT / "groups.json", groups)
    write_json(OUT / "udesk_hits.json", udesk_sessions)
    write_json(OUT / "feishu_hits.json", feishu_sessions)
    write_json(
        OUT / "picked_groups.json",
        {k: [{kk: g[kk] for kk in g if kk != "members"} | {"orderNos": g["orderNos"]} for g in vs] for k, vs in picked.items()},
    )

    csv_path = OUT / "orders_index.csv"
    if index_rows:
        with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(index_rows[0].keys()))
            w.writeheader()
            w.writerows(index_rows)

    # markdown report without customer names / emails / message text
    lines = [
        "# 方案 1：F-001 / A / B 关联索引 + 会话分层",
        "",
        f"- 生成：{summary['generatedAt']}",
        f"- 时间窗：创建日 {WIN_LO} ~ {WIN_HI}（本地截，不是 pageQuery 日期）",
        "- 成组：共享官方 EB（无官方 EB 时用正文 EB）；**未**按 WI 扩断号",
        "- 会话：只用本索引里的 VASC / EB / WI 反查，不用场景口语关键词",
        f"- 飞书源：{feishu_status}",
        "- 本目录不是 gold",
        "",
        "## 规模",
        "",
        "| 场景 | 窗内单 | EB组 | 有官方EB | 有WI | SOP≥40字 | 双会话组 | 仅Udesk | 仅飞书 | 无会话 | 已抽 |",
        "|------|--------|------|----------|------|-----------|----------|---------|--------|--------|------|",
    ]
    for alias in ("F-001", "A", "B"):
        s = summary["byAlias"][alias]
        cl = s["chatLayers"]
        pl = s["pickedLayers"]
        lines.append(
            f"| {alias} | {s['orders']} | {s['groups']} | {s['withOfficialEb']} | {s['withWi']} | {s['withSop40']} | "
            f"{cl.get('both', 0)} | {cl.get('udesk', 0)} | {cl.get('feishu', 0)} | {cl.get('none', 0)} | {s['picked']} |"
        )
    lines += [
        "",
        f"- Udesk 命中会话：{len(udesk_sessions)}",
        f"- 飞书命中线程：{len(feishu_sessions)}（源文件状态：{feishu_status}）",
        "",
        "## 每场景抽出（最多 10 组）",
        "",
    ]
    for alias in ("F-001", "A", "B"):
        lines += [f"### {alias}", "", "| 组 | 层 | 单号 | 状态 | EB | WI | SOP字 |", "|----|----|------|------|----|----|--------|"]
        for g in picked[alias]:
            lines.append(
                f"| {g['groupId']} | {g['chatLayer']} | {' / '.join(g['orderNos'])} | "
                f"{'/'.join(g['statusDescs'])} | {len(g['ebs'])} | {len(g['wis'])} | {g['maxSopChars']} |"
            )
        have_chat = sum(1 for g in picked[alias] if g["chatLayer"] != "none")
        if have_chat < 10:
            lines.append("")
            lines.append(f"降级：有会话组 {have_chat}/10，其余用无会话事实组补齐。")
        lines.append("")
    lines += [
        "## 文件",
        "",
        "| 文件 | 内容 |",
        "|------|------|",
        "| `orders_index.csv` | 窗内每张单：VASC / 状态 / EB / WI / 会话层 |",
        "| `orders_index.json` | 同上，含取消原因字段（无客户名） |",
        "| `groups.json` | EB 成组 |",
        "| `udesk_hits.json` | 反查命中（仅对话ID/日期/匹配键，无正文） |",
        "| `picked_groups.json` | 每场景最多 10 组 |",
        "",
        "未做：EB 扩断号、§2.5/§2.7 核 SOP、CASEBOOK、candidates.jsonl。",
    ]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(summary["byAlias"], ensure_ascii=False, indent=2), flush=True)
    print("feishu", feishu_status, "udesk_sessions", len(udesk_sessions), "wrote", OUT, flush=True)


if __name__ == "__main__":
    main()
