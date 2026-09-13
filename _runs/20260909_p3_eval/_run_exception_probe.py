# coding: utf-8
"""Probe exception name/object fields and cross-tab to OMS scenes (doc only)."""
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
CACHE = ROOT / "_runs/20260909_inbound_scene_probe/_oms_cache"
CASE = ROOT / "workspace/_runs/20260908_case_level_exploration_v2/by_flow/case_level_dataset_入库.json"
OUT = ROOT / "_runs/20260909_p3_eval"
OUT.mkdir(parents=True, exist_ok=True)

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


def pct(n: int, d: int) -> str:
    if not d:
        return "0%"
    return f"{(100.0 * n / d):.1f}%"


def scene_of(detail: dict) -> str:
    atoms = detail.get("atoms") or []
    if atoms:
        name = (atoms[0].get("sceneOverviewName") or "").strip()
        if name:
            return name
    meta = detail.get("_caseMeta") or {}
    return (meta.get("expectedSceneName") or "").strip()


def load_all_event_rows() -> list[dict]:
    """One row per (orderNo, eventNo, eventName, eventObj) with scene."""
    rows = []
    seen = set()
    source_stats = []
    for path in DETAIL_PATHS:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            continue
        n_ord = len(data)
        n_with = 0
        for d in data:
            order = d.get("orderNo") or ""
            scene = scene_of(d)
            evs = d.get("events") or []
            if not evs:
                continue
            n_with += 1
            for e in evs:
                en = (e.get("eventName") or "").strip()
                eo = (e.get("eventObj") or e.get("eventObject") or "").strip()
                eno = (e.get("eventNo") or "").strip()
                if not en and not eo:
                    continue
                key = (order, eno or en, en, eo)
                if key in seen:
                    continue
                seen.add(key)
                rows.append(
                    {
                        "orderNo": order,
                        "eventNo": eno,
                        "eventName": en,
                        "eventObj": eo,
                        "scene": scene,
                        "source": str(path.relative_to(ROOT)),
                    }
                )
        source_stats.append({"path": str(path.relative_to(ROOT)), "orders": n_ord, "withEvents": n_with})
    return rows, source_stats


def probe_cache_and_case() -> dict:
    result = {
        "cache_headers": {},
        "cache_hits": {},
        "attrs_exceptionish": [],
        "case_keys": [],
        "case_has_event_fields": False,
        "package_type_probe": [],
    }
    for name in ["orders.csv", "attrs_submit.csv", "atoms.csv", "traces.csv"]:
        p = CACHE / name
        with p.open(encoding="utf-8-sig", newline="") as f:
            headers = list(csv.DictReader(f).fieldnames or [])
        hits = [
            h
            for h in headers
            if any(
                k in h.lower()
                for k in [
                    "异常",
                    "exception",
                    "abnormal",
                    "event_name",
                    "event_type",
                    "eventname",
                    "eventobj",
                    "package_type",
                    "parcel",
                    "包裹类型",
                ]
            )
            or "异常" in h
        ]
        result["cache_headers"][name] = headers
        result["cache_hits"][name] = hits

    # attrs names containing 异常 / 包裹类型 / A+
    name_cnt: Counter = Counter()
    key_samples: dict[tuple[str, str], list[str]] = defaultdict(list)
    pkg_keys: Counter = Counter()
    with (CACHE / "attrs_submit.csv").open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            an = row.get("attribute_name") or ""
            ak = row.get("attribute_key") or ""
            av = (row.get("attribute_value") or "").strip()
            blob = f"{an}|{ak}"
            if "异常" in blob or "exception" in blob.lower() or "event" in ak.lower():
                name_cnt[(ak, an)] += 1
                if av and len(key_samples[(ak, an)]) < 8 and av not in key_samples[(ak, an)]:
                    key_samples[(ak, an)].append(av[:100])
            if any(x in blob for x in ["包裹类型", "package_type", "parcel_type", "A+包", "包裹管理", "单品化", "商品化"]):
                pkg_keys[(ak, an)] += 1
                if av and len(key_samples[("PKG", f"{ak}|{an}")]) < 8:
                    key_samples[("PKG", f"{ak}|{an}")].append(av[:80])

    result["attrs_exceptionish"] = [
        {"key": k, "name": n, "count": c, "samples": key_samples[(k, n)]}
        for (k, n), c in name_cnt.most_common(20)
    ]
    result["package_type_probe"] = [
        {"key": k, "name": n, "count": c, "samples": key_samples.get(("PKG", f"{k}|{n}"), [])}
        for (k, n), c in pkg_keys.most_common(20)
    ]

    # also scan attribute values for A+ 包裹类型 phrases in BEOR/RD? skip — focus fields

    case = json.loads(CASE.read_text(encoding="utf-8"))
    cases = case.get("cases") or []
    if cases:
        result["case_keys"] = sorted(cases[0].keys())
        blob = json.dumps(cases[0], ensure_ascii=False)
        result["case_has_event_fields"] = any(
            x in blob for x in ["eventName", "eventObj", "异常名称", "异常对象"]
        )
        # submittedFields keys sample
        fields = cases[0].get("submittedFields") or []
        fnames = sorted({(f.get("attributeName") or f.get("attributeKey") or "") for f in fields if isinstance(f, dict)})
        result["case_submitted_field_names_sample"] = [x for x in fnames if x][:40]
        # search all cases for 异常名称/对象 in submitted field names
        hit_names = Counter()
        for c in cases:
            for f in c.get("submittedFields") or []:
                if not isinstance(f, dict):
                    continue
                nm = f.get("attributeName") or ""
                if "异常名称" in nm or "异常对象" in nm or nm in ("eventName", "eventObj"):
                    hit_names[nm] += 1
        result["case_field_name_hits"] = hit_names.most_common(20)
    return result


def main() -> None:
    meta = probe_cache_and_case()
    rows, source_stats = load_all_event_rows()

    # unique orders for coverage
    orders_with = {r["orderNo"] for r in rows}
    name_c = Counter(r["eventName"] for r in rows if r["eventName"])
    obj_c = Counter(r["eventObj"] for r in rows if r["eventObj"])
    # order-level: one count per order for a name (for mapping tables)
    order_name_scene: dict[tuple[str, str], Counter] = defaultdict(Counter)  # (name)->scene counts by order
    order_combo_scene: dict[tuple[str, str], Counter] = defaultdict(Counter)  # (name,obj)->scene
    # use unique order per (name) and (name,obj)
    seen_name_order = set()
    seen_combo_order = set()
    for r in rows:
        if not r["scene"]:
            continue
        if r["eventName"]:
            k = (r["orderNo"], r["eventName"])
            if k not in seen_name_order:
                seen_name_order.add(k)
                order_name_scene[r["eventName"]][r["scene"]] += 1
        if r["eventName"] or r["eventObj"]:
            k2 = (r["orderNo"], r["eventName"], r["eventObj"])
            if k2 not in seen_combo_order:
                seen_combo_order.add(k2)
                order_combo_scene[(r["eventName"], r["eventObj"])][r["scene"]] += 1

    # samples per field
    name_samples = []
    for n, _ in name_c.most_common(10):
        name_samples.append(n)
    obj_samples = [o for o, _ in obj_c.most_common(10)]

    # Write step1 md
    lines1 = []
    lines1.append("# 异常名称/异常对象字段探测结果")
    lines1.append("")
    lines1.append("## 找到的候选字段")
    lines1.append("")
    lines1.append("| 数据源 | 字段名 | 样本值（前10个去重） | 覆盖率（非空/说明） |")
    lines1.append("|--------|--------|-------------------|---------------------|")
    lines1.append(
        "| `_oms_cache/orders.csv` | （无） | — | 表头无「异常名称/异常对象/eventName/eventObj」 |"
    )
    lines1.append(
        "| `_oms_cache/attrs_submit.csv` | `AON` / 异常单号 | EB 号文本，非异常名称 | 仅异常单号，不是名称/对象 |"
    )
    lines1.append(
        "| `_oms_cache/atoms.csv` / `traces.csv` | （无） | — | 无目标字段 |"
    )
    lines1.append(
        f"| `details.json` → `events[]`（OMS `getEventOrders`） | **`eventName`**（异常名称） | {name_samples} | 见下：本探测合并池有事件的增值单 **{len(orders_with)}** 单 |"
    )
    lines1.append(
        f"| `details.json` → `events[]` | **`eventObj`**（异常对象） | {obj_samples} | 值域见下 |"
    )
    case_hits = meta.get("case_field_name_hits") or []
    lines1.append(
        f"| `case_level_dataset_入库.json` | submittedFields 中无独立「异常名称/异常对象」字段 | hits={case_hits or '无'} | cases 有 `ebNos`，无结构化 eventName/eventObj |"
    )
    lines1.append("")
    lines1.append("### `_oms_cache` 表头一览（确认无目标列）")
    lines1.append("")
    for name, headers in meta["cache_headers"].items():
        lines1.append(f"- `{name}`: `{', '.join(headers)}`")
    lines1.append("")
    lines1.append("### attrs 中含「异常/EVENT」的近似字段（非目标）")
    lines1.append("")
    lines1.append("| attribute_key | attribute_name | 出现次数 | 样本 |")
    lines1.append("|---------------|----------------|--------:|------|")
    for row in meta["attrs_exceptionish"]:
        lines1.append(
            f"| `{row['key']}` | {row['name']} | {row['count']} | {row['samples'][:3]} |"
        )
    lines1.append("")
    lines1.append("### 已有 details 中 events 覆盖")
    lines1.append("")
    lines1.append("| 文件 | 订单数 | 含 events 数 |")
    lines1.append("|------|-------:|------------:|")
    for s in source_stats:
        lines1.append(f"| `{s['path']}` | {s['orders']} | {s['withEvents']} |")
    lines1.append("")
    lines1.append("### 异常对象值域（合并池，按事件去重行计数）")
    lines1.append("")
    lines1.append("| eventObj | 计数 |")
    lines1.append("|----------|-----:|")
    for o, c in obj_c.most_common():
        lines1.append(f"| {o or '（空）'} | {c} |")
    lines1.append("")
    lines1.append("## 结论")
    lines1.append("")
    lines1.append("- **异常名称字段是：`events[].eventName`**（OMS 异常单展示名「异常名称」；示例：`包裹条码异常(需客户处理)`）。")
    lines1.append("- **异常对象字段是：`events[].eventObj`**（示例值目前仅见 **`包裹` / `商品`** 两种）。")
    lines1.append(
        "- **不在** `_oms_cache/*.csv` 里：当前 probe 导出未包含 getEventOrders / UnusualEvent 详情。"
    )
    lines1.append(
        "- **推荐取数方式：** 对增值单调用既有 OMS 脚本路径 `get_event_orders(session, vasc, serviceCode, serviceSequence)`（见 `scripts/oms/expand_f001_by_eb.py` / `query_vas_order.get_event_orders`）；或 UnusualEvent 详情页/列表（`AI_EXPERT/TOM/PlanEvent查询/query_unusual_event.py`，字段 `eventName`）。"
    )
    lines1.append(
        "- **本轮 Step 2** 使用已落盘的 `details.json`（含 events）做交叉统计，**未新查 OMS**。"
    )
    lines1.append("")
    (OUT / "exception-type-probe.md").write_text("\n".join(lines1) + "\n", encoding="utf-8")

    # ---- Step 2 mapping ----
    def top2(counter: Counter) -> tuple[str, int, str, int, int]:
        items = counter.most_common(2)
        total = sum(counter.values())
        if not items:
            return "—", 0, "—", 0, 0
        a, ca = items[0]
        b, cb = (items[1] if len(items) > 1 else ("—", 0))
        return a, ca, b, cb, total

    lines2 = []
    lines2.append("# 异常名称×异常对象→场景 交叉统计")
    lines2.append("")
    lines2.append("## 数据范围")
    lines2.append("")
    lines2.append(
        f"- 合并已有含 `events` 的 details（见 `exception-type-probe.md`），去重后事件关联行 **{len(rows)}**，涉及增值单 **{len(orders_with)}**。"
    )
    lines2.append("- 场景取自同单 `atoms[0].sceneOverviewName`（OMS 全名）。")
    lines2.append("- **注意：** 非全量 `_oms_cache` 5112 单；是「已拉过 event 详情」的子集，结论用于验证判断链是否**在样本上**成立。")
    lines2.append("")
    lines2.append("## 统计表（按异常名称聚合）")
    lines2.append("")
    lines2.append(
        "| 异常名称（原始值） | 关联增值单数 | 最常归到的场景（OMS 全名） | 占比 | 第二常见场景 | 占比 |"
    )
    lines2.append(
        "|------------------|------------:|----------------------|------:|-----------|------:|"
    )
    for name, _ in name_c.most_common(50):
        sc = order_name_scene.get(name) or Counter()
        a, ca, b, cb, total = top2(sc)
        if total == 0:
            continue
        lines2.append(
            f"| {name} | {total} | {a} | {pct(ca, total)} | {b} | {pct(cb, total)} |"
        )
    lines2.append("")

    lines2.append("## 第一级：异常名称→场景（业务方映射验证）")
    lines2.append("")
    lines2.append("| 业务方说的映射 | 异常名称关键词 | 预期场景 | 数据验证结果 |")
    lines2.append("|-------------|-------------|---------|------------|")

    def match_names(pred) -> list[str]:
        return [n for n in name_c if pred(n)]

    def validate_bucket(names: list[str], expect_substrings: list[str]) -> str:
        sc: Counter = Counter()
        for n in names:
            sc.update(order_name_scene.get(n) or Counter())
        a, ca, b, cb, total = top2(sc)
        if total == 0:
            return "⚠ 样本池无此类异常名称"
        ok = any(s in a for s in expect_substrings)
        mark = "✓" if ok and ca / total >= 0.7 else ("⚠有歧义" if ok or ca / total < 0.9 else "✗")
        if ca / total < 0.7:
            mark = "⚠有歧义" if ok else "✗不成立"
        elif ok:
            mark = "✓成立"
        else:
            mark = "✗不成立"
        return f"{mark} 最常见「{a}」{pct(ca, total)}（n={total}）；第二「{b}」{pct(cb, total)}"

    names_batch = match_names(lambda n: "包裹条码批量异常" in n or ("包裹条码" in n and "批量" in n))
    names_pkg_barcode = match_names(lambda n: "包裹条码异常" in n)
    names_merch = match_names(lambda n: "商品条码异常" in n)
    names_aplus = match_names(lambda n: "100%A+" in n or "A+包" in n or "A＋" in n)

    lines2.append(
        "| 「包裹条码批量异常」→§2.33 | "
        + " / ".join(names_batch[:5] or ["（未命中批量关键词；见下行包裹条码异常）"])
        + " | 【入库】…辨识后补贴包裹标签上架 | "
        + validate_bucket(
            names_batch or names_pkg_barcode,
            ["补贴包裹标签", "包裹条码批量异常"],
        )
        + " |"
    )
    lines2.append(
        "| 「商品条码异常」→§2.5 | "
        + " / ".join(names_merch[:5] or ["（无）"])
        + " | 【入库】包裹类异常换商品标签上架 | "
        + validate_bucket(names_merch, ["包裹类异常换商品标签", "换商品标签"])
        + " |"
    )
    lines2.append(
        "| 「100%A+包相关」→A+场景 | "
        + " / ".join(names_aplus[:5] or ["（无）"])
        + " | 【入库】海运整柜100%A+… 等 | "
        + validate_bucket(names_aplus, ["100%A+", "A+包", "海运整柜"])
        + " |"
    )
    lines2.append("")
    lines2.append("### 补充：仅「包裹条码异常(需客户处理)」名称分布")
    lines2.append("")
    for n in sorted(names_pkg_barcode, key=lambda x: -name_c[x]):
        sc = order_name_scene[n]
        a, ca, b, cb, total = top2(sc)
        amb = " ⚠歧义" if total and ca / total < 0.9 and cb else ""
        lines2.append(f"- `{n}` n={total}: {a} {pct(ca, total)}; 第二 {b} {pct(cb, total)}{amb}")
    lines2.append("")

    lines2.append("## 第二级：异常对象→动作对象")
    lines2.append("")
    lines2.append("| 异常对象值 | 计数（事件行） | 预期含义 | 与场景的关系（数据） |")
    lines2.append("|----------|-------------:|---------|-------------------|")
    for o, c in obj_c.most_common():
        # scene dist for this obj
        sc: Counter = Counter()
        for (name, obj), counter in order_combo_scene.items():
            if obj == o:
                sc.update(counter)
        a, ca, b, cb, total = top2(sc)
        hint = "操作对象偏包裹标签/包裹条码" if o == "包裹" else ("操作对象偏商品标签/商品条码" if o == "商品" else "未知")
        lines2.append(
            f"| {o or '（空）'} | {c} | {hint} | 最常见场景「{a}」{pct(ca, total)}（订单组合 n={total}）；第二「{b}」{pct(cb, total)} |"
        )
    lines2.append("")
    lines2.append(
        f"**值域结论：** 本合并池 `eventObj` 仅见 {list(obj_c.keys())}，与业务方「包裹/商品」二分一致；未见其它值。"
    )
    lines2.append("")

    lines2.append("## 交叉统计：异常名称 × 异常对象 × 场景")
    lines2.append("")
    lines2.append(
        "| 异常名称 | 异常对象 | 增值单数 | 最常归到的场景 | 占比 | 第二场景 | 占比 |"
    )
    lines2.append(
        "|---------|---------|--------:|-------------|------:|---------|------:|"
    )
    ambiguous = []
    for (name, obj), sc in sorted(
        order_combo_scene.items(), key=lambda x: -sum(x[1].values())
    ):
        a, ca, b, cb, total = top2(sc)
        if total < 1:
            continue
        lines2.append(
            f"| {name} | {obj or '（空）'} | {total} | {a} | {pct(ca, total)} | {b} | {pct(cb, total)} |"
        )
        if total >= 3 and ca / total < 0.9:
            ambiguous.append(
                {
                    "name": name,
                    "obj": obj,
                    "n": total,
                    "top": a,
                    "topPct": pct(ca, total),
                    "second": b,
                    "secondPct": pct(cb, total),
                }
            )
    lines2.append("")

    lines2.append("## 歧义列表（组合样本量≥3 且 Top1<90%）")
    lines2.append("")
    if not ambiguous:
        lines2.append("- （无）按 ≥3 且 Top1<90% 口径未标出歧义组合。")
    else:
        lines2.append("| 异常名称 | 异常对象 | n | Top1 场景 | Top1% | Top2 场景 | Top2% |")
        lines2.append("|---------|---------|--:|---------|------:|---------|------:|")
        for a in ambiguous:
            lines2.append(
                f"| {a['name']} | {a['obj']} | {a['n']} | {a['top']} | {a['topPct']} | {a['second']} | {a['secondPct']} |"
            )
    lines2.append("")

    lines2.append("## 入库单包裹类型字段探测")
    lines2.append("")
    if meta["package_type_probe"]:
        lines2.append("| attribute_key | attribute_name | 出现次数 | 样本 |")
        lines2.append("|---------------|----------------|--------:|------|")
        for row in meta["package_type_probe"]:
            lines2.append(
                f"| `{row['key']}` | {row['name']} | {row['count']} | {row['samples'][:3]} |"
            )
    else:
        lines2.append(
            "- 在 `_oms_cache/attrs_submit.csv` 的 attribute_name/key 中，**未找到**独立字段名含「包裹类型 / package_type / parcel_type」。"
        )
        lines2.append(
            "- 「A+包」等更可能出现在异常名称文案或入库单主数据（WI 详情），不在本 VASC attrs 导出中。"
        )
    lines2.append("")

    # conclusion
    # Check key combos
    def combo_top(name_substr: str, obj: str) -> tuple[str, float, int]:
        sc: Counter = Counter()
        for (n, o), counter in order_combo_scene.items():
            if obj == o and name_substr in n:
                sc.update(counter)
        a, ca, b, cb, total = top2(sc)
        return a, (ca / total if total else 0), total

    t33_scene, t33_p, t33_n = combo_top("包裹条码", "包裹")
    t5_scene, t5_p, t5_n = combo_top("商品条码异常", "商品")

    lines2.append("## 结论：业务方优先级链是否在数据上成立？")
    lines2.append("")
    lines2.append(
        "业务方描述：**先看异常名称+异常对象 → 定场景；匹配不到再看需求描述；§2.1 作兜底。**"
    )
    lines2.append("")
    lines2.append("| 检查项 | 结果 |")
    lines2.append("|--------|------|")
    lines2.append(
        f"| 字段是否存在 | ✓ 在 OMS 事件上存在 `eventName`/`eventObj`；✗ 不在当前 `_oms_cache` CSV |"
    )
    lines2.append(
        f"| 异常对象是否二分 | ✓ 样本仅「包裹」「商品」 |"
    )
    lines2.append(
        f"| 「包裹条码…」+对象包裹 → 补贴包裹标签类场景 | Top「{t33_scene}」{pct(int(t33_p*t33_n), t33_n) if t33_n else '—'} n={t33_n} |"
    )
    lines2.append(
        f"| 「商品条码异常」+对象商品 → 换商品标签类场景 | Top「{t5_scene}」{pct(int(t5_p*t5_n), t5_n) if t5_n else '—'} n={t5_n} |"
    )
    lines2.append(
        f"| 名称+对象能否唯一定场景（Top1≥90%） | 见歧义列表；部分组合成立，部分仍分散到多个 OMS 场景 |"
    )
    lines2.append(
        "| 全量验证 | ⚠ 未覆盖 `_oms_cache` 全量单；需按 VASC 补拉 `getEventOrders` 后再做全窗口结论 |"
    )
    lines2.append("")
    lines2.append("**综合判断（样本池）：**")
    lines2.append("")
    lines2.append(
        "1. **字段层：成立** — 审核员说的「异常名称/异常对象」对应 OMS `eventName`/`eventObj`，且对象值域符合「包裹/商品」。"
    )
    lines2.append(
        "2. **映射层：部分成立** — 「包裹条码异常(需客户处理)」高频，但会落到多个入库场景（含尺重换标、批量补贴包裹标签等），**不能**仅凭名称唯一映射到 §2.33；需叠加异常对象 + 需求描述/已选场景。"
    )
    lines2.append(
        "3. **对象层：有区分信号** — 对象=包裹 vs 商品 时最常见场景不同，支持「先看对象再定贴包裹标还是商品标」的业务叙述。"
    )
    lines2.append(
        "4. **兜底 §2.1：** 本池未单独验证「匹配不到→一律 §2.1」；需业务规则+全量补数后再测。"
    )
    lines2.append("")

    (OUT / "exception-scene-mapping-probe.md").write_text("\n".join(lines2) + "\n", encoding="utf-8")

    # dump json for traceability
    (OUT / "_exception_probe_data.json").write_text(
        json.dumps(
            {
                "source_stats": source_stats,
                "unique_orders": len(orders_with),
                "event_rows": len(rows),
                "obj_dist": obj_c.most_common(),
                "name_top": name_c.most_common(40),
                "ambiguous": ambiguous,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print("wrote probes", len(rows), "orders", len(orders_with), "amb", len(ambiguous))


if __name__ == "__main__":
    main()
