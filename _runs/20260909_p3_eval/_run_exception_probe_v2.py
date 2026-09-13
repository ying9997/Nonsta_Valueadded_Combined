# coding: utf-8
"""v2: scene-code timeline + time-corrected mapping + clustering (doc only)."""
from __future__ import annotations

import csv
import json
import math
import re
import warnings
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
CACHE = ROOT / "_runs/20260909_inbound_scene_probe/_oms_cache"
OUT = ROOT / "_runs/20260909_p3_eval"
SCENE_MAP = ROOT / "_runs/20260902_oms_scene_code_map/scene_overview_code_map.json"
DETAIL_PATHS = [
    ROOT / "_runs/20260909_t14_eval/details.json",
    ROOT / "_runs/20260904_demo_cases/demo_all.details.json",
    ROOT / "_runs/20260901_oms_facts/details.json",
    ROOT / "_runs/20260902_oms_facts_a/details.json",
    ROOT / "_runs/20260902_oms_facts_b/details.json",
    ROOT / "_runs/20260908_3scene_build_v3/details.json",
    ROOT / "_runs/20260908_3scene_build_v2/details.json",
    ROOT / "_runs/20260908_3scene_build/details.json",
]

KEY_SCENES = {
    "20250407004",  # 尺重
    "20250430",  # 批量补贴包裹标签
    "20250407008",  # 包裹类异常换商品标签
    "20250522001",  # 指定商品拍照暂存
    "202506120001",  # 关联第三方
}


def pct(n: int, d: int) -> str:
    if not d:
        return "0%"
    return f"{100.0 * n / d:.1f}%"


def parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:19].replace("Z", ""), fmt.replace("Z", "").replace("T", " ") if "T" in fmt else fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def load_orders() -> dict[str, dict]:
    out = {}
    with (CACHE / "orders.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            out[r["order_no"]] = r
    return out


def load_atoms() -> list[dict]:
    with (CACHE / "atoms.csv").open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_attrs_by_order() -> dict[str, list[dict]]:
    by: dict[str, list[dict]] = defaultdict(list)
    with (CACHE / "attrs_submit.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            by[r["order_no"]].append(r)
    return by


def load_traces_by_order() -> dict[str, list[dict]]:
    by: dict[str, list[dict]] = defaultdict(list)
    p = CACHE / "traces.csv"
    if not p.exists():
        return by
    with p.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            by[r["order_no"]].append(r)
    return by


def is_inbound_name(name: str) -> bool:
    return "入库" in (name or "")


def load_scene_name_map(atoms: list[dict]) -> dict[str, str]:
    names: dict[str, str] = {}
    sm = json.loads(SCENE_MAP.read_text(encoding="utf-8"))
    for row in sm.get("rows") or []:
        code = str(row.get("sceneOverviewCode") or row.get("code") or "")
        name = row.get("sceneOverviewName") or row.get("name") or row.get("name_cn") or ""
        if code and name:
            names[code] = name
    for code, meta in (sm.get("knownAliases") or {}).items():
        if isinstance(meta, dict) and meta.get("name_cn"):
            names.setdefault(code, meta["name_cn"])
    for a in atoms:
        code = a.get("scene_overview_code") or ""
        name = a.get("scene_overview_name") or ""
        if code and name and name != "NULL":
            names[code] = name
    return names


def primary_atom(atoms_for_order: list[dict]) -> dict | None:
    inbound = [a for a in atoms_for_order if is_inbound_name(a.get("scene_overview_name") or "")]
    pool = inbound or atoms_for_order
    if not pool:
        return None
    return sorted(pool, key=lambda x: int(x.get("service_sequence") or 1))[0]


def build_timeline(orders: dict, atoms: list[dict], names: dict[str, str]) -> list[dict]:
    by_code: dict[str, list[tuple[datetime, str]]] = defaultdict(list)
    atoms_by_order: dict[str, list[dict]] = defaultdict(list)
    for a in atoms:
        atoms_by_order[a["order_no"]].append(a)

    for ono, alist in atoms_by_order.items():
        o = orders.get(ono) or {}
        dt = parse_dt(o.get("order_date"))
        if not dt:
            continue
        for a in alist:
            code = a.get("scene_overview_code") or ""
            name = a.get("scene_overview_name") or names.get(code) or ""
            if not code or code == "NULL" or not is_inbound_name(name):
                continue
            by_code[code].append((dt, ono))

    rows = []
    for code, items in by_code.items():
        items = sorted(items, key=lambda x: x[0])
        first = items[0][0]
        total = len({ono for _, ono in items})
        after = len({ono for d, ono in items if d >= first})  # == total by def
        rows.append(
            {
                "code": code,
                "name": names.get(code) or items[0] and next(
                    (a.get("scene_overview_name") for a in atoms if a.get("scene_overview_code") == code),
                    code,
                ),
                "first": first,
                "total": total,
                "after": after,
            }
        )
    # fix names
    for r in rows:
        if not r["name"] or r["name"] == r["code"]:
            for a in atoms:
                if a.get("scene_overview_code") == r["code"] and is_inbound_name(a.get("scene_overview_name") or ""):
                    r["name"] = a["scene_overview_name"]
                    break
    rows.sort(key=lambda x: (x["first"], -x["total"]))
    return rows


def load_event_orders() -> dict[str, dict]:
    """orderNo -> {eventNames, eventObjs, scene from atoms, events list}"""
    out: dict[str, dict] = {}
    for path in DETAIL_PATHS:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            continue
        for d in data:
            ono = d.get("orderNo") or ""
            evs = []
            for e in d.get("events") or []:
                en = (e.get("eventName") or "").strip()
                eo = (e.get("eventObj") or "").strip()
                if en or eo:
                    evs.append({"eventName": en, "eventObj": eo, "eventNo": e.get("eventNo") or ""})
            if not evs:
                continue
            atoms = d.get("atoms") or []
            scene = ""
            scode = ""
            if atoms:
                scene = (atoms[0].get("sceneOverviewName") or "").strip()
                scode = (atoms[0].get("sceneOverviewCode") or "").strip()
            # prefer keep richer record
            prev = out.get(ono)
            if prev and len(prev.get("events") or []) >= len(evs) and prev.get("scene"):
                continue
            out[ono] = {
                "orderNo": ono,
                "events": evs,
                "scene": scene,
                "sceneCode": scode,
                "source": str(path.relative_to(ROOT)),
            }
    return out


def top2(counter: Counter) -> tuple[str, int, str, int, int]:
    items = counter.most_common(2)
    total = sum(counter.values())
    if not items:
        return "—", 0, "—", 0, 0
    a, ca = items[0]
    b, cb = items[1] if len(items) > 1 else ("—", 0)
    return a, ca, b, cb, total


def task1(orders, atoms, names, event_orders, timeline) -> dict:
    first_by_code = {r["code"]: r["first"] for r in timeline}
    # join event orders with order_date + cache scene if missing
    atoms_by_order: dict[str, list[dict]] = defaultdict(list)
    for a in atoms:
        atoms_by_order[a["order_no"]].append(a)

    rows = []
    for ono, ev in event_orders.items():
        o = orders.get(ono) or {}
        dt = parse_dt(o.get("order_date"))
        scene = ev.get("scene") or ""
        scode = ev.get("sceneCode") or ""
        if not scene or not scode:
            pa = primary_atom(atoms_by_order.get(ono) or [])
            if pa:
                scene = scene or pa.get("scene_overview_name") or ""
                scode = scode or pa.get("scene_overview_code") or ""
        if not is_inbound_name(scene) and scode not in first_by_code:
            # still keep if we have scene name with 入库 from details
            if "入库" not in scene:
                continue
        for e in ev["events"]:
            rows.append(
                {
                    "orderNo": ono,
                    "order_date": dt,
                    "eventName": e["eventName"],
                    "eventObj": e["eventObj"],
                    "scene": scene,
                    "sceneCode": scode,
                    "scene_first": first_by_code.get(scode),
                }
            )

    # unique order-level for combo
    def aggregate(filter_fn):
        seen = set()
        combo = defaultdict(Counter)
        name_only = defaultdict(Counter)
        for r in rows:
            if not filter_fn(r):
                continue
            if not r["scene"]:
                continue
            k = (r["orderNo"], r["eventName"], r["eventObj"])
            if k in seen:
                continue
            seen.add(k)
            combo[(r["eventName"], r["eventObj"])][r["scene"]] += 1
            name_only[r["eventName"]][r["scene"]] += 1
        return combo, name_only

    all_combo, all_name = aggregate(lambda r: True)

    # After target scene available: only orders dated >= first(20250430) for T1-related validation
    # Also: "eligible after own scene birth" is tautology; use:
    # post_global = order_date >= max(first of KEY_SCENES that exist)
    key_firsts = [first_by_code[c] for c in KEY_SCENES if c in first_by_code]
    global_cut = max(key_firsts) if key_firsts else None

    post_t1_cut = first_by_code.get("20250430")
    post_f001_cut = first_by_code.get("20250407004")
    post_s25_cut = first_by_code.get("20250407008")

    post_t1_combo, post_t1_name = aggregate(
        lambda r: bool(r["order_date"] and post_t1_cut and r["order_date"] >= post_t1_cut)
    )
    post_global_combo, post_global_name = aggregate(
        lambda r: bool(r["order_date"] and global_cut and r["order_date"] >= global_cut)
    )
    # before T1 exists
    pre_t1_combo, pre_t1_name = aggregate(
        lambda r: bool(r["order_date"] and post_t1_cut and r["order_date"] < post_t1_cut)
    )

    return {
        "timeline": timeline,
        "first_by_code": {k: v.isoformat() for k, v in first_by_code.items()},
        "n_event_rows": len(rows),
        "n_event_orders": len({r["orderNo"] for r in rows}),
        "global_cut": global_cut.isoformat() if global_cut else None,
        "post_t1_cut": post_t1_cut.isoformat() if post_t1_cut else None,
        "post_f001_cut": post_f001_cut.isoformat() if post_f001_cut else None,
        "post_s25_cut": post_s25_cut.isoformat() if post_s25_cut else None,
        "all_combo": all_combo,
        "all_name": all_name,
        "post_t1_combo": post_t1_combo,
        "post_t1_name": post_t1_name,
        "pre_t1_combo": pre_t1_combo,
        "pre_t1_name": pre_t1_name,
        "post_global_combo": post_global_combo,
        "post_global_name": post_global_name,
        "rows": rows,
    }


def write_timeline_md(t1: dict, names: dict[str, str]) -> None:
    lines = []
    lines.append("# 场景码生效时间线 + 时间修正后的异常映射")
    lines.append("")
    lines.append("## 方法")
    lines.append("")
    lines.append("- **生效日期** = `_oms_cache` 中该 `scene_overview_code` 首次出现的增值单 `order_date`（仅统计场景名含「入库」的 atom）。")
    lines.append("- 异常映射样本 = 已有 details 中带 `eventName`/`eventObj` 的入库增值单（与上轮同源，非全量 cache）。")
    lines.append("- **时间修正**：分别统计「§2.33(20250430) 生效前/后」以及「关键场景码均已出现之后」的交叉表。")
    lines.append("")
    lines.append("## 入库场景码时间线")
    lines.append("")
    lines.append("| omsSceneCode | OMS 场景全名 | 首次出现日期 | 总单量 | 生效后单量 |")
    lines.append("|-------------|------------|-----------|-------:|--------:|")
    for r in t1["timeline"]:
        lines.append(
            f"| {r['code']} | {r['name']} | {r['first'].date().isoformat()} | {r['total']} | {r['after']} |"
        )
    lines.append("")
    lines.append("### 关键场景首次日期")
    lines.append("")
    for code in sorted(KEY_SCENES):
        d = t1["first_by_code"].get(code)
        lines.append(f"- `{code}` {names.get(code, '')}: **{d or '未在本窗口入库 atoms 中出现'}**")
    lines.append("")
    lines.append(f"- 关键场景全局截断（取 KEY_SCENES 首次日期的最大值）: **{t1['global_cut']}**")
    lines.append(f"- 异常映射样本订单数: **{t1['n_event_orders']}**（事件行 {t1['n_event_rows']}）")
    lines.append("")

    def table_combo(title: str, combo: dict) -> None:
        lines.append(f"## {title}")
        lines.append("")
        lines.append("| 异常名称 | 异常对象 | 增值单数 | 最常场景 | 占比 | 第二场景 | 占比 |")
        lines.append("|---------|---------|--------:|---------|------:|---------|------:|")
        for (name, obj), sc in sorted(combo.items(), key=lambda x: -sum(x[1].values())):
            a, ca, b, cb, total = top2(sc)
            lines.append(
                f"| {name} | {obj or '（空）'} | {total} | {a} | {pct(ca, total)} | {b} | {pct(cb, total)} |"
            )
        lines.append("")

    def table_name(title: str, name_map: dict) -> None:
        lines.append(f"## {title}")
        lines.append("")
        lines.append("| 异常名称 | 增值单数 | 最常场景 | 占比 | 第二场景 | 占比 |")
        lines.append("|---------|--------:|---------|------:|---------|------:|")
        for name, sc in sorted(name_map.items(), key=lambda x: -sum(x[1].values())):
            a, ca, b, cb, total = top2(sc)
            lines.append(f"| {name} | {total} | {a} | {pct(ca, total)} | {b} | {pct(cb, total)} |")
        lines.append("")

    table_name("全样本：异常名称→场景（对照上轮）", t1["all_name"])
    table_combo("全样本：异常名称×异常对象→场景", t1["all_combo"])
    table_name(f"§2.33 生效前（order_date < {t1['post_t1_cut']}）", t1["pre_t1_name"])
    table_combo(f"§2.33 生效前：名称×对象×场景", t1["pre_t1_combo"])
    table_name(f"§2.33 生效后（order_date ≥ {t1['post_t1_cut']}）", t1["post_t1_name"])
    table_combo(f"§2.33 生效后：名称×对象×场景", t1["post_t1_combo"])
    table_name(f"关键场景均生效后（≥ {t1['global_cut']}）", t1["post_global_name"])
    table_combo(f"关键场景均生效后：名称×对象×场景", t1["post_global_combo"])

    # business checks after T1
    lines.append("## 业务映射：时间修正前后对比")
    lines.append("")
    lines.append("| 映射 | 口径 | Top1 场景 | Top1% | n | 相对上轮变化 |")
    lines.append("|------|------|----------|------:|--:|------------|")

    def summarize(name_pred, combo_map, label):
        sc = Counter()
        for (n, o), c in combo_map.items():
            if name_pred(n):
                sc.update(c)
        a, ca, b, cb, total = top2(sc)
        return a, pct(ca, total), total, b, pct(cb, total)

    checks = [
        ("包裹条码批量异常→§2.33", lambda n: "包裹条码批量异常" in n),
        ("商品条码异常→§2.5", lambda n: "商品条码异常" in n),
        ("A+/100%A+→A+场景", lambda n: ("100%A+" in n) or ("A+包" in n) or ("A+包裹" in n)),
    ]
    for title, pred in checks:
        a0, p0, n0, *_ = summarize(pred, t1["all_combo"], "all")
        a1, p1, n1, *_ = summarize(pred, t1["post_t1_combo"], "post_t1")
        a2, p2, n2, *_ = summarize(pred, t1["post_global_combo"], "post_g")
        lines.append(f"| {title} | 全样本 | {a0} | {p0} | {n0} | — |")
        lines.append(f"| {title} | §2.33 生效后 | {a1} | {p1} | {n1} | vs 全样本 |")
        lines.append(f"| {title} | 关键场景均生效后 | {a2} | {p2} | {n2} | vs 全样本 |")
    lines.append("")
    lines.append("## 任务 1 小结")
    lines.append("")
    lines.append("1. 入库场景码在窗口内按首次 `order_date` 陆续出现；新场景码上线前订单无法选该码，会抬高旧兜底场景占比。")
    lines.append("2. 时间截断后若「批量异常→§2.33」仍未成为 Top1，则不能仅用「历史无码」解释上轮失败。")
    lines.append("3. 详见文末与 `scene-classification-insights.md` 的综合判断。")
    lines.append("")
    (OUT / "scene-code-timeline.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def extract_req_text(attrs: list[dict], atom: dict) -> str:
    parts = []
    for r in attrs:
        k = r.get("attribute_key") or ""
        n = r.get("attribute_name") or ""
        v = (r.get("attribute_value") or "").strip()
        if not v:
            continue
        if k in {"BEOR", "VAS_ATTR_REL_RD", "RD", "EVENT01"} or "需求" in n or "描述" in n:
            parts.append(v)
    if atom.get("vas_des"):
        parts.append(atom.get("vas_des") or "")
    if atom.get("sop"):
        parts.append(atom.get("sop") or "")
    return "\n".join(parts)


def count_docs(val: str) -> int:
    if not val:
        return 0
    parts = re.split(r"[,;\s/|]+", val.strip())
    return len([p for p in parts if p])


def build_feature_frame(
    orders: dict,
    atoms: list[dict],
    attrs_by: dict,
    traces_by: dict,
    event_orders: dict,
    names: dict,
) -> tuple[pd.DataFrame, list[str], np.ndarray, list[str]]:
    atoms_by_order: dict[str, list[dict]] = defaultdict(list)
    for a in atoms:
        atoms_by_order[a["order_no"]].append(a)

    # candidate orders: inbound primary atom
    records = []
    texts = []
    y_codes = []
    y_names = []
    order_nos = []

    # collect attr key universe on inbound
    attr_keys = Counter()
    for ono, alist in atoms_by_order.items():
        pa = primary_atom(alist)
        if not pa or not is_inbound_name(pa.get("scene_overview_name") or ""):
            continue
        for r in attrs_by.get(ono) or []:
            attr_keys[r.get("attribute_key") or ""] += 1
    # keep keys with enough support
    keep_keys = [k for k, c in attr_keys.most_common() if k and c >= 5]

    for ono, alist in atoms_by_order.items():
        pa = primary_atom(alist)
        if not pa:
            continue
        sname = pa.get("scene_overview_name") or ""
        scode = pa.get("scene_overview_code") or ""
        if not is_inbound_name(sname) or not scode or scode == "NULL":
            continue
        o = orders.get(ono) or {}
        attrs = attrs_by.get(ono) or []
        attr_map = {}
        for r in attrs:
            k = r.get("attribute_key") or ""
            v = (r.get("attribute_value") or "").strip()
            if k and (k not in attr_map or v):
                attr_map[k] = v

        ev = event_orders.get(ono)
        event_names = []
        event_objs = []
        if ev:
            event_names = sorted({e["eventName"] for e in ev["events"] if e["eventName"]})
            event_objs = sorted({e["eventObj"] for e in ev["events"] if e["eventObj"]})

        dt = parse_dt(o.get("order_date"))
        rec = {
            "order_no": ono,
            "scene_code": scode,
            "scene_name": sname,
            "has_events": 1 if ev else 0,
            "n_events": len(ev["events"]) if ev else 0,
            "n_atoms": len(alist),
            "n_attrs": len(attrs),
            "n_traces": len(traces_by.get(ono) or []),
            "service_code": pa.get("service_code") or "",
            "warehouse_code": o.get("warehouse_code") or "",
            "customer_code": o.get("customer_code") or "",
            "status": o.get("status") or "",
            "va_source": o.get("va_source") or "",
            "product_code": o.get("product_code") or "",
            "is_audit_through": 1 if (o.get("is_audit_through") or "") == "Y" else 0,
            "order_month": dt.strftime("%Y-%m") if dt else "",
            "order_doy": dt.timetuple().tm_yday if dt else -1,
            "aon_count": count_docs(attr_map.get("AON") or ""),
            "aooi_count": count_docs(attr_map.get("VAS_ATTR_REL_AOOI") or ""),
            "has_LF": 1 if attr_map.get("VAS_ATTR_REL_LF") else 0,
            "has_BEOR": 1 if attr_map.get("BEOR") else 0,
            "has_RD": 1 if (attr_map.get("VAS_ATTR_REL_RD") or attr_map.get("RD")) else 0,
            "has_PACKAGE_SERNO": 1 if attr_map.get("PACKAGE_SERNO") else 0,
            "has_MERCHANDISE_SERNO": 1 if attr_map.get("MERCHANDISE_SERNO") else 0,
            "req_len": len(extract_req_text(attrs, pa)),
            "eventName_primary": event_names[0] if event_names else "",
            "eventObj_primary": event_objs[0] if event_objs else "",
            "n_event_names": len(event_names),
            "n_event_objs": len(event_objs),
        }
        for k in keep_keys:
            rec[f"attr_present::{k}"] = 1 if attr_map.get(k) else 0
        # event name / obj one-hots later via pandas get_dummies on primary + multi
        for en in event_names:
            rec[f"eventName::{en}"] = 1
        for eo in event_objs:
            rec[f"eventObj::{eo}"] = 1

        records.append(rec)
        texts.append(extract_req_text(attrs, pa))
        y_codes.append(scode)
        y_names.append(sname)
        order_nos.append(ono)

    df = pd.DataFrame(records).fillna(0)
    # TF-IDF on requirement text
    tfidf = TfidfVectorizer(max_features=80, min_df=2, token_pattern=r"(?u)\b\w+\b")
    try:
        X_txt = tfidf.fit_transform(texts)
        txt_cols = [f"tfidf::{t}" for t in tfidf.get_feature_names_out()]
        txt_df = pd.DataFrame(X_txt.toarray(), columns=txt_cols)
    except ValueError:
        txt_df = pd.DataFrame()
        txt_cols = []

    cat_cols = [
        "service_code",
        "warehouse_code",
        "customer_code",
        "status",
        "va_source",
        "product_code",
        "order_month",
        "eventName_primary",
        "eventObj_primary",
    ]
    base = df.drop(columns=["order_no", "scene_code", "scene_name"], errors="ignore")
    # one-hot categoricals with rarity filter
    dummies_list = []
    for col in cat_cols:
        if col not in base.columns:
            continue
        vc = base[col].astype(str).value_counts()
        keep = set(vc[vc >= 3].index.tolist())
        s = base[col].astype(str).where(base[col].astype(str).isin(keep), other="__OTHER__")
        dummies_list.append(pd.get_dummies(s, prefix=col))
        base = base.drop(columns=[col])
    # drop raw string leftovers if any
    for c in list(base.columns):
        if base[c].dtype == object:
            base = base.drop(columns=[c])

    parts = [base.reset_index(drop=True)]
    if dummies_list:
        parts.append(pd.concat(dummies_list, axis=1).reset_index(drop=True))
    if len(txt_df):
        parts.append(txt_df.reset_index(drop=True))
    Xdf = pd.concat(parts, axis=1).fillna(0)
    # ensure numeric
    Xdf = Xdf.apply(pd.to_numeric, errors="coerce").fillna(0)
    feature_names = list(Xdf.columns)
    X = Xdf.to_numpy(dtype=float)
    return (
        pd.DataFrame(
            {
                "order_no": order_nos,
                "scene_code": y_codes,
                "scene_name": y_names,
            }
        ),
        feature_names,
        X,
        texts,
    )


def cluster_key_features(X, feature_names, labels, cluster_id, top_n=5):
    mask = labels == cluster_id
    if mask.sum() == 0:
        return []
    mean_in = X[mask].mean(axis=0)
    mean_out = X[~mask].mean(axis=0) if (~mask).any() else np.zeros_like(mean_in)
    diff = mean_in - mean_out
    idx = np.argsort(-np.abs(diff))[:top_n]
    out = []
    for i in idx:
        out.append(f"{feature_names[i]} (Δ={diff[i]:+.3f})")
    return out


def task2(meta_df, feature_names, X) -> dict:
    # drop rare scenes (<3) for supervised importance stability, but keep all for clustering
    y = meta_df["scene_code"].to_numpy()
    y_name = meta_df["scene_name"].to_numpy()
    counts = Counter(y)
    keep_mask = np.array([counts[c] >= 3 for c in y])
    X_s = X[keep_mask]
    y_s = y[keep_mask]
    name_s = y_name[keep_mask]

    scaler = StandardScaler(with_mean=True)
    Xs = scaler.fit_transform(X)

    # RF importance
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    rf.fit(X_s, y_s)
    importances = rf.feature_importances_
    top_idx = np.argsort(-importances)[:20]
    top20 = [
        {"rank": i + 1, "feature": feature_names[j], "importance": float(importances[j])}
        for i, j in enumerate(top_idx)
    ]

    # KMeans sweep
    km_results = []
    best = None
    for k in [5, 8, 10, 15]:
        if len(X) < k + 1:
            continue
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(Xs)
        try:
            sil = float(silhouette_score(Xs, labels))
        except Exception:
            sil = float("nan")
        km_results.append({"k": k, "silhouette": sil, "labels": labels})
        if best is None or (not math.isnan(sil) and sil > best["silhouette"]):
            best = {"k": k, "silhouette": sil, "labels": labels}

    # DBSCAN
    db = DBSCAN(eps=8.0, min_samples=5)
    db_labels = db.fit_predict(Xs)
    n_db = len(set(db_labels) - {-1})

    # cluster purity table for best k
    cluster_rows = []
    if best:
        labels = best["labels"]
        for cid in sorted(set(labels)):
            mask = labels == cid
            n = int(mask.sum())
            sc = Counter(y_name[mask])
            top_scene, top_n = sc.most_common(1)[0]
            purity = top_n / n if n else 0
            feats = cluster_key_features(X, feature_names, labels, cid, 5)
            cluster_rows.append(
                {
                    "cluster": int(cid),
                    "n": n,
                    "top_scene": top_scene,
                    "purity": purity,
                    "features": feats,
                    "scene_dist": sc.most_common(3),
                }
            )

    # t-SNE
    # reduce dims first if too wide
    X_emb_in = Xs
    if Xs.shape[1] > 50:
        svd = TruncatedSVD(n_components=50, random_state=42)
        X_emb_in = svd.fit_transform(Xs)
    perplexity = min(30, max(5, len(X) // 4))
    tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity, init="pca")
    xy = tsne.fit_transform(X_emb_in)

    # plot by scene (top scenes colored, rest gray)
    top_scenes = [s for s, _ in Counter(y_name).most_common(8)]
    color_map = plt.cm.tab10(np.linspace(0, 1, len(top_scenes)))
    scene_to_color = {s: color_map[i] for i, s in enumerate(top_scenes)}

    fig, ax = plt.subplots(figsize=(11, 8))
    for s in set(y_name):
        mask = y_name == s
        if s in scene_to_color:
            ax.scatter(xy[mask, 0], xy[mask, 1], s=18, alpha=0.75, label=s[:24], c=[scene_to_color[s]])
        else:
            ax.scatter(xy[mask, 0], xy[mask, 1], s=10, alpha=0.25, c="lightgray")
    ax.set_title("t-SNE of inbound VAS orders (colored by OMS scene)")
    ax.set_xlabel("t-SNE-1")
    ax.set_ylabel("t-SNE-2")
    ax.legend(fontsize=7, loc="best", frameon=True)
    fig.tight_layout()
    png_path = OUT / "clustering-tsne.png"
    fig.savefig(png_path, dpi=140)
    plt.close(fig)

    # separable scenes: mean silhouette-like — use RF OOB / train accuracy proxy
    train_acc = float(rf.score(X_s, y_s))
    # per-class recall proxy from predictions
    pred = rf.predict(X_s)
    per_scene = []
    for code in sorted(set(y_s)):
        m = y_s == code
        correct = (pred[m] == code).sum()
        n = m.sum()
        name = name_s[m][0]
        per_scene.append({"code": code, "name": name, "n": int(n), "train_recall": float(correct / n)})

    return {
        "n_samples": int(len(X)),
        "n_features": int(len(feature_names)),
        "n_scenes": int(len(set(y))),
        "n_scenes_rf": int(len(set(y_s))),
        "top20": top20,
        "km_results": [{"k": r["k"], "silhouette": r["silhouette"]} for r in km_results],
        "best_k": best["k"] if best else None,
        "best_silhouette": best["silhouette"] if best else None,
        "cluster_rows": cluster_rows,
        "dbscan_clusters": n_db,
        "dbscan_noise": int((db_labels == -1).sum()),
        "rf_train_acc": train_acc,
        "per_scene": sorted(per_scene, key=lambda x: -x["train_recall"]),
        "feature_names": feature_names,
        "png": str(png_path.relative_to(ROOT)),
        "has_events_rate": float(meta_df.assign(h=X[:, feature_names.index("has_events")] if "has_events" in feature_names else 0).get("h", pd.Series([0])).mean()) if False else None,
    }


def feature_meaning(fname: str) -> str:
    if fname.startswith("eventName::"):
        return f"异常名称是否为「{fname.split('::',1)[1]}」"
    if fname.startswith("eventObj::"):
        return f"异常对象是否为「{fname.split('::',1)[1]}」"
    if fname.startswith("attr_present::"):
        return f"提交属性 {fname.split('::',1)[1]} 是否非空"
    if fname.startswith("tfidf::"):
        return f"需求描述 TF-IDF 词项「{fname.split('::',1)[1]}」"
    if fname.startswith("eventName_primary_"):
        return f"主异常名称={fname[len('eventName_primary_'):]}"
    if fname.startswith("eventObj_primary_"):
        return f"主异常对象={fname[len('eventObj_primary_'):]}"
    if fname.startswith("warehouse_code_"):
        return f"仓库={fname[len('warehouse_code_'):]}"
    if fname.startswith("customer_code_"):
        return f"客户={fname[len('customer_code_'):]}"
    if fname.startswith("service_code_"):
        return f"服务码={fname[len('service_code_'):]}"
    if fname.startswith("order_month_"):
        return f"下单月={fname[len('order_month_'):]}"
    mapping = {
        "has_events": "是否拉到异常事件详情",
        "n_events": "关联异常事件条数",
        "aon_count": "异常单号(AON)数量",
        "aooi_count": "关联入库单数量",
        "has_LF": "是否有装箱清单/LF",
        "has_BEOR": "是否有业务异常说明(BEOR)",
        "has_RD": "是否有需求描述(RD)",
        "has_PACKAGE_SERNO": "是否填包裹条码",
        "has_MERCHANDISE_SERNO": "是否填商品条码",
        "req_len": "需求描述文本长度",
        "is_audit_through": "是否审核通过",
        "n_attrs": "提交属性条数",
        "n_traces": "状态追踪条数",
        "order_doy": "一年中的第几天",
    }
    return mapping.get(fname, fname)


def write_clustering_md(t2: dict, feature_names: list[str]) -> None:
    lines = []
    lines.append("# 入库增值单无监督聚类分析")
    lines.append("")
    lines.append("## 数据概况")
    lines.append("")
    lines.append(f"- 总样本数：**{t2['n_samples']}**（`_oms_cache` 中场景名含「入库」的增值单）")
    lines.append(f"- 特征数：**{t2['n_features']}**")
    lines.append(f"- 场景数：**{t2['n_scenes']}**（随机森林训练仅用样本≥3 的 {t2['n_scenes_rf']} 个场景）")
    lines.append("- 特征来源：orders/atoms 字段、attrs 是否非空、AON/AOOI 计数、eventName/eventObj（有 details 时）、需求描述 TF-IDF、仓库/客户/服务码 one-hot 等。")
    lines.append("- 未安装 `umap-learn` / `xgboost`；降维用 **t-SNE**，重要性用 **RandomForest**。")
    lines.append("")
    lines.append("### 使用的特征名（完整列表见 clustering-features.json）")
    lines.append("")
    # group summary
    groups = Counter()
    for f in feature_names:
        if "::" in f:
            groups[f.split("::", 1)[0] + "::*"] += 1
        elif "_" in f and f.split("_")[0] in {
            "warehouse",
            "customer",
            "service",
            "status",
            "va",
            "product",
            "order",
            "eventName",
            "eventObj",
        }:
            groups[f.split("_")[0] + "_*"] += 1
        else:
            groups["scalar/other"] += 1
    lines.append("| 特征族 | 数量 |")
    lines.append("|--------|-----:|")
    for g, c in groups.most_common():
        lines.append(f"| `{g}` | {c} |")
    lines.append("")
    lines.append("## 特征重要性 Top 20")
    lines.append("")
    lines.append("| 排名 | 特征名 | 重要性分数 | 含义 |")
    lines.append("|------|--------|----------:|------|")
    for row in t2["top20"]:
        lines.append(
            f"| {row['rank']} | `{row['feature']}` | {row['importance']:.4f} | {feature_meaning(row['feature'])} |"
        )
    lines.append("")
    lines.append(f"随机森林训练集准确率（仅作拟合强度参考，非泛化）：**{t2['rf_train_acc']:.3f}**")
    lines.append("")
    lines.append("## 聚类结果")
    lines.append("")
    lines.append("### K-Means 轮廓系数")
    lines.append("")
    lines.append("| k | silhouette |")
    lines.append("|--:|----------:|")
    for r in t2["km_results"]:
        mark = " ← best" if r["k"] == t2["best_k"] else ""
        lines.append(f"| {r['k']} | {r['silhouette']:.4f}{mark} |")
    lines.append("")
    lines.append(
        f"DBSCAN：簇数={t2['dbscan_clusters']}，噪声点={t2['dbscan_noise']}（高维稀疏下仅作对照）。"
    )
    lines.append("")
    lines.append(f"### 聚类明细（K={t2['best_k']}，silhouette={t2['best_silhouette']:.4f}）")
    lines.append("")
    lines.append("| Cluster | 样本数 | 主要场景 | 纯度 | 关键区分特征 |")
    lines.append("|---------|-------:|---------|------:|-----------|")
    for r in t2["cluster_rows"]:
        lines.append(
            f"| {r['cluster']} | {r['n']} | {r['top_scene']} ({pct(int(r['purity']*r['n']), r['n'])}) | {r['purity']*100:.1f}% | {'; '.join(r['features'][:3])} |"
        )
    lines.append("")
    lines.append("## 场景可分性（RF 训练召回，样本≥3）")
    lines.append("")
    lines.append("| 场景码 | OMS 场景全名 | n | train_recall |")
    lines.append("|--------|------------|--:|-------------:|")
    for r in t2["per_scene"]:
        lines.append(f"| {r['code']} | {r['name']} | {r['n']} | {r['train_recall']:.2f} |")
    lines.append("")
    lines.append("## 发现")
    lines.append("")
    top_feats = [r["feature"] for r in t2["top20"][:8]]
    non_event = [f for f in top_feats if not f.startswith("eventName") and "eventObj" not in f and "eventName_primary" not in f]
    high_purity = [r for r in t2["cluster_rows"] if r["purity"] >= 0.8]
    low_recall = [r for r in t2["per_scene"] if r["train_recall"] < 0.5 and r["n"] >= 5]
    high_recall = [r for r in t2["per_scene"] if r["train_recall"] >= 0.8 and r["n"] >= 5]
    lines.append(
        f"1. 除了异常名称/异常对象之外，Top 特征还包括：{', '.join(f'`{x}`' for x in non_event[:6]) or '（Top 仍以事件/属性非空为主）'}。"
    )
    lines.append(
        f"2. 高纯度簇（≥80%）数量：**{len(high_purity)}** / {len(t2['cluster_rows'])}；"
        f"较易区分的场景（train_recall≥0.8 且 n≥5）：{', '.join(r['name'] for r in high_recall[:5]) or '较少'}；"
        f"较难区分：{', '.join(r['name'] for r in low_recall[:5]) or '较少'}。"
    )
    lines.append(
        "3. 建议纳入规则/模型的新特征候选：属性非空模式（LF/包裹条码/商品条码）、关联单数量（AON/AOOI）、仓库/客户、需求描述 TF-IDF 高权词、下单月份（场景码上线节奏）。"
    )
    lines.append("")
    lines.append("## 降维可视化")
    lines.append("")
    lines.append(f"![](clustering-tsne.png)")
    lines.append("")
    lines.append("若图中同色点成团、异色分离，说明现有特征有可分结构；若大量混叠，则仅靠当前结构化字段不足以稳定分场景。")
    lines.append("")
    (OUT / "clustering-analysis.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_insights(t1: dict, t2: dict, names: dict) -> None:
    def combo_stats(combo, pred_name, expect_substrings):
        sc = Counter()
        for (n, o), c in combo.items():
            if pred_name(n):
                sc.update(c)
        a, ca, b, cb, total = top2(sc)
        hit = any(s in a for s in expect_substrings) if a != "—" else False
        share = ca / total if total else 0
        if total == 0:
            verdict = "⚠无样本"
        elif hit and share >= 0.7:
            verdict = "✓"
        elif hit or share >= 0.4:
            verdict = "⚠"
        else:
            verdict = "✗"
        return verdict, a, pct(ca, total), total

    post = t1["post_t1_combo"]
    postg = t1["post_global_combo"]
    v1, a1, p1, n1 = combo_stats(post, lambda n: "包裹条码批量异常" in n, ["补贴包裹标签", "包裹条码批量"])
    v1g, a1g, p1g, n1g = combo_stats(postg, lambda n: "包裹条码批量异常" in n, ["补贴包裹标签", "包裹条码批量"])
    v2, a2, p2, n2 = combo_stats(post, lambda n: "商品条码异常" in n, ["包裹类异常换商品标签", "换商品标签"])
    # object → label type: among post_t1, eventObj=包裹 prefer 包裹标签 scenes
    def obj_stats(obj, expect_keys):
        sc = Counter()
        for (n, o), c in post.items():
            if o == obj:
                sc.update(c)
        a, ca, b, cb, total = top2(sc)
        hit = any(k in a for k in expect_keys)
        share = ca / total if total else 0
        verdict = "✓" if hit and share >= 0.5 else ("⚠" if total else "⚠无样本")
        if total and not hit:
            verdict = "✗" if share < 0.5 else "⚠"
        return verdict, a, pct(ca, total), total

    vo_p, ao_p, po_p, no_p = obj_stats("包裹", ["补贴包裹标签", "包裹标签", "包裹条码"])
    vo_m, ao_m, po_m, no_m = obj_stats("商品", ["换商品标签", "商品标签", "拍照暂存"])

    # fallback §2.1 share overall post
    sc_all = Counter()
    for c in post.values():
        sc_all.update(c)
    a, ca, b, cb, total = top2(sc_all)
    f001 = "尺重/标签辨识后换标上架"
    fallback_share = sum(v for k, v in sc_all.items() if f001 in k)
    v3 = "⚠" if total and fallback_share / total >= 0.35 else "✗"
    # interpretation: if many go to §2.1 even after newer codes exist, fallback is overused OR correctly default

    lines = []
    lines.append("# 场景分类洞察（数据驱动）")
    lines.append("")
    lines.append("## 业务方说的优先级链是否成立？")
    lines.append("")
    lines.append("| 判断环节 | 业务方说的 | 数据验证（时间修正后） | 结论 |")
    lines.append("|---------|----------|-------------------|------|")
    lines.append(
        f"| 异常名称→场景 | 包裹条码批量异常→§2.33 | §2.33 生效后 Top「{a1}」{p1}（n={n1}）；关键场景均生效后 Top「{a1g}」{p1g}（n={n1g}） | {v1}/{v1g} |"
    )
    lines.append(
        f"| 异常名称→场景 | 商品条码异常→§2.5 | §2.33 生效后 Top「{a2}」{p2}（n={n2}） | {v2} |"
    )
    lines.append(
        f"| 异常对象→贴标对象 | 包裹→包裹标签类 | 对象=包裹时 Top「{ao_p}」{po_p}（n={no_p}） | {vo_p} |"
    )
    lines.append(
        f"| 异常对象→贴标对象 | 商品→商品标签类 | 对象=商品时 Top「{ao_m}」{po_m}（n={no_m}） | {vo_m} |"
    )
    lines.append(
        f"| 兜底→§2.1 | 匹配不到→尺重换标(§2.1) | 生效后样本中「{f001}」占比 {pct(fallback_share, total)}（n={total}） | {v3}（高占比更像历史主选/过宽兜底，不能证明规则链） |"
    )
    lines.append("")
    lines.append("### 时间线要点")
    lines.append("")
    for code in sorted(KEY_SCENES):
        lines.append(f"- `{code}` {names.get(code,'')}: 首次 {t1['first_by_code'].get(code, '未出现')}")
    lines.append("")
    lines.append(
        "**判断：** 时间修正后若业务硬映射仍未占优，则上轮「名称+对象不能定场景」**不能**主要归因于「场景码尚未创建」；更可能是历史实操口径与应然规则不一致，或关键信号在需求描述/附件/仓库侧。"
    )
    lines.append("")
    lines.append("## 聚类发现的新规则建议")
    lines.append("")
    lines.append("| 发现 | 新特征 | 建议加入哪个节点 | 预期效果 |")
    lines.append("|------|--------|-------------|---------|")
    # pick concrete from top20
    used = set()
    for row in t2["top20"][:10]:
        f = row["feature"]
        if f in used:
            continue
        used.add(f)
        if f.startswith("eventName"):
            node = "match-template"
            effect = "把异常名称作为一等特征，但需配对象/描述防歧义"
        elif f.startswith("eventObj"):
            node = "match-template / context-bind"
            effect = "区分贴包裹标 vs 贴商品标倾向"
        elif f.startswith("tfidf::"):
            node = "check-requirement / match-template"
            effect = "用需求描述词项消歧同名异常"
        elif f.startswith("attr_present::") or f.startswith("has_"):
            node = "check-requirement / context-bind"
            effect = "用已填属性/附件完备性辅助场景与缺件检查"
        elif f.startswith("warehouse") or f.startswith("customer"):
            node = "match-template（弱先验）"
            effect = "仓/客差异仅作弱权重，避免过拟合"
        else:
            node = "match-template"
            effect = "补充结构化先验"
        lines.append(
            f"| 重要性#{row['rank']} `{f}`={row['importance']:.4f} | {feature_meaning(f)} | {node} | {effect} |"
        )
    lines.append("")
    lines.append("## 对 pipeline 的优化建议（按优先级）")
    lines.append("")
    lines.append(
        "1. **补齐异常事件字段进审核输入**：对增值单拉 `getEventOrders`，稳定注入 `eventName`/`eventObj`（当前 `_oms_cache` 无此列；T14 details 仅有 EB 占位）。"
    )
    lines.append(
        "2. **不要把「名称→场景」做成唯一硬规则**：时间修正后仍歧义；改为「名称+对象 → 候选场景集合 + 权重」，再用需求描述 TF-IDF/关键属性做排序（与现有 ACTION_SCENE_MAP 协同）。"
    )
    lines.append(
        "3. **把高重要性非事件特征纳入 match-template 软信号**：如 LF/条码类属性是否具备、AOOI/AON 数量、仓码；对高纯度簇对应场景可加白名单组合。"
    )
    lines.append(
        "4. **§2.1 兜底要显式标注**：当候选置信度低时落到尺重换标，并在 trace 写明「fallback」，避免与真实命中混淆。"
    )
    lines.append(
        "5. **全窗口复验**：对 `_oms_cache` 5112 单补拉 events 后重跑交叉表与聚类，再决定是否把业务硬映射写成强约束。"
    )
    lines.append("")
    lines.append("## 产物索引")
    lines.append("")
    lines.append("- `scene-code-timeline.md`")
    lines.append("- `clustering-analysis.md` / `clustering-tsne.png` / `clustering-features.json`")
    lines.append("- 上轮：`exception-type-probe.md` / `exception-scene-mapping-probe.md`")
    lines.append("")
    (OUT / "scene-classification-insights.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("loading cache...")
    orders = load_orders()
    atoms = load_atoms()
    attrs_by = load_attrs_by_order()
    traces_by = load_traces_by_order()
    names = load_scene_name_map(atoms)
    print("timeline...")
    timeline = build_timeline(orders, atoms, names)
    print("events...")
    event_orders = load_event_orders()
    print("task1...", "inbound scenes", len(timeline), "event orders", len(event_orders))
    t1 = task1(orders, atoms, names, event_orders, timeline)
    write_timeline_md(t1, names)

    print("features...")
    meta_df, feature_names, X, texts = build_feature_frame(
        orders, atoms, attrs_by, traces_by, event_orders, names
    )
    print("matrix", X.shape)
    print("task2 clustering...")
    t2 = task2(meta_df, feature_names, X)
    write_clustering_md(t2, feature_names)

    # features json (compact: meta + importance + shape; not full dense matrix dump of all floats if huge)
    feat_payload = {
        "n_samples": t2["n_samples"],
        "n_features": t2["n_features"],
        "feature_names": feature_names,
        "importances_top50": [
            {"feature": feature_names[i], "importance": float(imp)}
            for i, imp in sorted(
                enumerate(
                    RandomForestClassifier(
                        n_estimators=200, max_depth=12, random_state=42, n_jobs=-1, class_weight="balanced_subsample"
                    )
                    .fit(
                        X[np.array([Counter(meta_df["scene_code"])[c] >= 3 for c in meta_df["scene_code"]])],
                        meta_df["scene_code"].to_numpy()[
                            np.array([Counter(meta_df["scene_code"])[c] >= 3 for c in meta_df["scene_code"]])
                        ],
                    )
                    .feature_importances_
                ),
                key=lambda t: -t[1],
            )[:50]
        ],
        "top20": t2["top20"],
        "km_results": t2["km_results"],
        "best_k": t2["best_k"],
        "cluster_rows": t2["cluster_rows"],
        "per_scene": t2["per_scene"],
        "orders": meta_df.to_dict(orient="records"),
        "note": "Full dense X omitted to keep file small; feature_names + labels + importances retained.",
    }
    # simpler: reuse t2 top20 without refitting
    feat_payload["importances_top50"] = [
        {"feature": r["feature"], "importance": r["importance"]} for r in t2["top20"]
    ] + [
        {"feature": feature_names[i], "importance": float("nan")}
        for i in range(min(30, len(feature_names)))
        if feature_names[i] not in {r["feature"] for r in t2["top20"]}
    ][:30]

    # store sparse-ish sample means by scene for top features
    top_feats = [r["feature"] for r in t2["top20"]]
    feat_idx = {f: i for i, f in enumerate(feature_names)}
    by_scene_means = {}
    for code in sorted(set(meta_df["scene_code"])):
        mask = (meta_df["scene_code"] == code).to_numpy()
        if mask.sum() == 0:
            continue
        means = {}
        for f in top_feats:
            means[f] = float(X[mask, feat_idx[f]].mean()) if f in feat_idx else None
        by_scene_means[code] = {
            "name": names.get(code) or meta_df.loc[mask, "scene_name"].iloc[0],
            "n": int(mask.sum()),
            "top_feature_means": means,
        }
    feat_payload["by_scene_top_feature_means"] = by_scene_means
    # attach a downsampled matrix for reproducibility
    rng = np.random.default_rng(42)
    if len(X) > 400:
        idx = rng.choice(len(X), size=400, replace=False)
    else:
        idx = np.arange(len(X))
    feat_payload["matrix_sample"] = {
        "order_nos": meta_df.iloc[idx]["order_no"].tolist(),
        "scene_codes": meta_df.iloc[idx]["scene_code"].tolist(),
        "feature_names": feature_names,
        "X": X[idx].round(6).tolist(),
    }
    (OUT / "clustering-features.json").write_text(
        json.dumps(feat_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("insights...")
    write_insights(t1, t2, names)
    print("done", OUT)


if __name__ == "__main__":
    main()
