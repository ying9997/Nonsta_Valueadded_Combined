# coding: utf-8
"""Complexity metrics: 包裹条码/批量异常 × scene (§2.1 vs §2.33 vs other). Doc only."""
from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "Arial Unicode MS", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
CACHE = ROOT / "_runs/20260909_inbound_scene_probe/_oms_cache"
OUT = ROOT / "_runs/20260909_p3_eval"
OUT.mkdir(parents=True, exist_ok=True)

S21 = "20250407004"
S233 = "20250430"

ACTION_PATTERNS = [
    ("辨识", r"辨识|识别|辨認"),
    ("换标", r"换标|换標|更换.*标签|换.*标签|重新贴标|贴标"),
    ("补贴", r"补贴|補貼"),
    ("拍照", r"拍照|拍图|照片"),
    ("销毁", r"销毁|銷毀"),
    ("暂存", r"暂存|暫存"),
    ("上架", r"上架"),
    ("开箱", r"开箱|開箱"),
    ("称重|尺重", r"称重|尺重|量尺寸|测量"),
    ("关联", r"关联|關聯"),
    ("冻结", r"冻结|凍結"),
    ("拦截", r"拦截|攔截"),
    ("拆包装", r"拆包装|拆包"),
    ("换包装", r"换包装|更换包装"),
]

SKU_PATTERNS = [
    r"\bSKU[_\- ]?[A-Za-z0-9\-_]{3,}\b",
    r"\b[A-Z]{1,5}\d{4,}[A-Z0-9\-]*\b",
    r"商品[码號号编码]*[：:]\s*([A-Za-z0-9\-_]{4,})",
    r"条码[：:]\s*([A-Za-z0-9\-_]{6,})",
    r"\bWI\d{6,}\b",
    r"\bEB\d{10,}\b",  # not SKU but counted separately
]


def pct(n, d):
    return 0.0 if not d else 100.0 * n / d


def split_docs(val: str) -> list[str]:
    if not val:
        return []
    parts = re.split(r"[,;\s|/、]+", val.strip())
    return [p for p in parts if p]


def is_inbound(name: str) -> bool:
    return "入库" in (name or "")


def load_cache():
    orders = {}
    with (CACHE / "orders.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            orders[r["order_no"]] = r
    atoms_by = defaultdict(list)
    with (CACHE / "atoms.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            atoms_by[r["order_no"]].append(r)
    attrs_by = defaultdict(list)
    with (CACHE / "attrs_submit.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            attrs_by[r["order_no"]].append(r)
    traces_by = defaultdict(list)
    tp = CACHE / "traces.csv"
    if tp.exists():
        with tp.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                traces_by[r["order_no"]].append(r)
    return orders, atoms_by, attrs_by, traces_by


def primary_inbound(alist):
    inbound = [a for a in alist if is_inbound(a.get("scene_overview_name") or "")]
    if not inbound:
        return None
    return sorted(inbound, key=lambda x: int(x.get("service_sequence") or 1))[0]


def load_details_index():
    """orderNo -> best detail dict with events."""
    best = {}
    for p in ROOT.glob("_runs/**/details.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for d in data:
            ono = d.get("orderNo") or ""
            if not ono:
                continue
            evs = [e for e in (d.get("events") or []) if (e.get("eventName") or "").strip()]
            score = len(evs) * 10
            atoms = d.get("atoms") or []
            score += sum(len(a.get("vaAtomFiles") or []) for a in atoms)
            score += sum(len(a.get("vaAtomAttrs") or []) for a in atoms)
            prev = best.get(ono)
            if prev and prev["_score"] >= score:
                continue
            d = dict(d)
            d["_score"] = score
            d["_path"] = str(p.relative_to(ROOT))
            best[ono] = d
    return best


def match_event_names(detail) -> list[str]:
    names = []
    for e in (detail or {}).get("events") or []:
        en = (e.get("eventName") or "").strip()
        if en and ("批量异常" in en or "包裹条码异常" in en):
            names.append(en)
    return sorted(set(names))


def req_text_from_attrs(attrs: list[dict], atom: dict | None, detail: dict | None) -> str:
    parts = []
    keys_want = {"BEOR", "VAS_ATTR_REL_RD", "RD", "EVENT01"}
    for r in attrs:
        k = r.get("attribute_key") or ""
        n = r.get("attribute_name") or ""
        v = (r.get("attribute_value") or "").strip()
        if not v:
            continue
        if k in keys_want or "需求" in n or "描述" in n or "说明" in n or "背景" in n:
            parts.append(v)
    if atom:
        if atom.get("vas_des"):
            parts.append(atom["vas_des"])
        if atom.get("sop"):
            parts.append(atom["sop"])
    if detail:
        for a in detail.get("atoms") or []:
            for attr in a.get("vaAtomAttrs") or []:
                k = attr.get("attributeKeyOriginal") or attr.get("attributeKey") or ""
                n = attr.get("attributeName") or ""
                v = (attr.get("attributeValue") or attr.get("attributeValueOriginal") or "").strip()
                if not v:
                    continue
                if k in keys_want or "需求" in n or "描述" in n or "说明" in n:
                    parts.append(v)
            if a.get("vasDes"):
                parts.append(a.get("vasDes") or "")
            if a.get("sop"):
                parts.append(a.get("sop") or "")
    # dedupe keep order
    seen = set()
    out = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return "\n".join(out)


def count_actions(text: str) -> tuple[int, list[str]]:
    found = []
    for label, pat in ACTION_PATTERNS:
        if re.search(pat, text, flags=re.I):
            found.append(label)
    return len(found), found


def count_skus(text: str) -> int:
    found = set()
    # merchandise-like tokens
    for m in re.finditer(r"(?:SKU|sku|货号|商品编码)[：:\s]*([A-Za-z0-9\-_]{3,})", text):
        found.add(m.group(1).upper())
    for m in re.finditer(r"\b[A-Z]{2,}\d{3,}[A-Z0-9\-]*\b", text):
        tok = m.group(0)
        if tok.startswith("VASC") or tok.startswith("EB") or tok.startswith("WI"):
            continue
        found.add(tok)
    # Chinese enumeration 共N个SKU / N个商品
    m = re.search(r"(\d+)\s*个\s*(?:SKU|商品|sku)", text)
    if m:
        return max(len(found), int(m.group(1)))
    return len(found)


def file_stats(detail: dict | None, attrs: list[dict]) -> tuple[int, int, list[str]]:
    files = []
    if detail:
        for a in detail.get("atoms") or []:
            files.extend(a.get("vaAtomFiles") or [])
    types = []
    for f in files:
        t = f.get("fileType") or f.get("attachmentType") or f.get("type") or "unknown"
        types.append(str(t))
    # attrs that look like file uploads with non-empty value
    file_attr_keys = set()
    for r in attrs:
        k = r.get("attribute_key") or ""
        n = r.get("attribute_name") or ""
        v = (r.get("attribute_value") or "").strip()
        show = ""
        if "附件" in n or "SOP" in n.upper() or "上传" in n or k in {"EVENT02", "EVENT03", "VAS_ATTR_REL_LF"}:
            if v:
                file_attr_keys.add(k or n)
    n_files = len(files)
    n_types = len(set(types)) if types else len(file_attr_keys)
    # if no files in details, approximate with file-like attrs
    if n_files == 0 and file_attr_keys:
        n_files = len(file_attr_keys)
    return n_files, n_types, sorted(set(types) | file_attr_keys)


def nonempty_attr_count(attrs: list[dict], detail: dict | None) -> int:
    keys = set()
    for r in attrs:
        v = (r.get("attribute_value") or "").strip()
        if v:
            keys.add(r.get("attribute_key") or r.get("attribute_name") or id(r))
    if detail and not keys:
        for a in detail.get("atoms") or []:
            for attr in a.get("vaAtomAttrs") or []:
                v = (attr.get("attributeValue") or attr.get("attributeValueOriginal") or "").strip()
                if v:
                    keys.add(attr.get("attributeKeyOriginal") or attr.get("attributeKey") or id(attr))
    return len(keys)


def build_eb_to_vascs(attrs_by) -> dict[str, set[str]]:
    eb_map: dict[str, set[str]] = defaultdict(set)
    for ono, attrs in attrs_by.items():
        for r in attrs:
            if r.get("attribute_key") != "AON":
                continue
            for eb in split_docs(r.get("attribute_value") or ""):
                if eb.upper().startswith("EB") or eb.upper().startswith("RM"):
                    eb_map[eb].add(ono)
    return eb_map


def group_of(code: str) -> str:
    if code == S21:
        return "§2.1"
    if code == S233:
        return "§2.33"
    return "其他"


def compute_metrics(ono, orders, atoms_by, attrs_by, traces_by, details, eb_map) -> dict | None:
    alist = atoms_by.get(ono) or []
    pa = primary_inbound(alist)
    detail = details.get(ono)
    scode, sname = "", ""
    if pa:
        scode = pa.get("scene_overview_code") or ""
        sname = pa.get("scene_overview_name") or ""
    if (not scode or not is_inbound(sname)) and detail:
        for a in detail.get("atoms") or []:
            if is_inbound(a.get("sceneOverviewName") or ""):
                scode = a.get("sceneOverviewCode") or ""
                sname = a.get("sceneOverviewName") or ""
                break
    if not scode or not is_inbound(sname):
        return None

    attrs = attrs_by.get(ono) or []
    attr_map = {}
    for r in attrs:
        k = r.get("attribute_key") or ""
        v = (r.get("attribute_value") or "").strip()
        if k and (k not in attr_map or v):
            attr_map[k] = v

    text = req_text_from_attrs(attrs, pa, detail)
    n_actions, actions = count_actions(text)
    ebs = split_docs(attr_map.get("AON") or "")
    # also from events
    if detail:
        for e in detail.get("events") or []:
            eno = (e.get("eventNo") or e.get("businessNo") or "").strip()
            if eno and eno not in ebs:
                ebs.append(eno)
    wis = split_docs(attr_map.get("VAS_ATTR_REL_AOOI") or "")
    n_files, n_file_types, file_type_list = file_stats(detail, attrs)
    n_attrs = nonempty_attr_count(attrs, detail)
    n_sku = count_skus(text)
    # re-submit: any EB linked to >1 VASC
    multi = 0
    for eb in ebs:
        if len(eb_map.get(eb) or []) > 1:
            multi = 1
            break
    traces = traces_by.get(ono) or []
    # reject/resubmit signals in traces
    reject_kw = 0
    for t in traces:
        blob = f"{t.get('event_content') or ''}{t.get('supplement_desc') or ''}{t.get('old_status') or ''}{t.get('new_status') or ''}"
        if any(k in blob for k in ("退回", "驳回", "拒绝", "重提", "重新提交", "不通过")):
            reject_kw = 1
            break

    event_names = match_event_names(detail) if detail else []

    return {
        "orderNo": ono,
        "sceneCode": scode,
        "sceneName": sname,
        "group": group_of(scode),
        "eventNames": event_names,
        "req_len": len(text),
        "n_actions": n_actions,
        "actions": actions,
        "n_eb": len(ebs),
        "n_wi": len(wis),
        "n_files": n_files,
        "n_file_types": n_file_types,
        "file_types": file_type_list,
        "n_attrs": n_attrs,
        "n_sku": n_sku,
        "has_resubmit_eb": multi,
        "has_reject_trace": reject_kw,
        "n_traces": len(traces),
        "has_LF": 1 if attr_map.get("VAS_ATTR_REL_LF") else 0,
        "has_BEOR": 1 if attr_map.get("BEOR") else 0,
        "req_lines": text.count("\n") + (1 if text else 0),
        "in_cache": ono in orders,
        "has_detail": 1 if detail else 0,
        "text_preview": text[:120].replace("\n", " "),
    }


def summarize(vals: list[float]) -> dict:
    if not vals:
        return {"n": 0, "mean": None, "median": None, "p25": None, "p75": None, "min": None, "max": None}
    a = np.asarray(vals, dtype=float)
    return {
        "n": int(len(a)),
        "mean": float(a.mean()),
        "median": float(np.median(a)),
        "p25": float(np.percentile(a, 25)),
        "p75": float(np.percentile(a, 75)),
        "min": float(a.min()),
        "max": float(a.max()),
    }


def fmt_sum(s: dict) -> str:
    if not s["n"]:
        return "n=0"
    return (
        f"n={s['n']} mean={s['mean']:.1f} med={s['median']:.1f} "
        f"IQR=[{s['p25']:.1f},{s['p75']:.1f}] range=[{s['min']:.0f},{s['max']:.0f}]"
    )


METRIC_LABELS = [
    ("req_len", "需求描述字数"),
    ("n_actions", "需求中动作种类数"),
    ("n_eb", "关联异常单(EB)数"),
    ("n_wi", "关联入库单(WI)数"),
    ("n_files", "附件数量"),
    ("n_file_types", "附件种类数"),
    ("n_attrs", "非空表单字段数"),
    ("n_sku", "描述中SKU/商品码数"),
    ("n_traces", "状态追踪条数"),
    ("req_lines", "需求描述行数"),
    ("has_LF", "是否有LF附件字段"),
    ("has_resubmit_eb", "EB关联多VASC"),
    ("has_reject_trace", "轨迹含退回/重提词"),
]


def plot_boxplots(cohorts: dict[str, list[dict]], out_path: Path, title: str):
    # numeric metrics for boxplots
    metrics = [
        ("req_len", "需求字数"),
        ("n_actions", "动作数"),
        ("n_eb", "EB数"),
        ("n_wi", "WI数"),
        ("n_files", "附件数"),
        ("n_attrs", "非空字段数"),
        ("n_sku", "SKU数"),
        ("n_traces", "追踪条数"),
    ]
    groups = [g for g in ["§2.1", "§2.33", "其他"] if g in cohorts and cohorts[g]]
    if not groups:
        return
    fig, axes = plt.subplots(2, 4, figsize=(14, 7))
    axes = axes.ravel()
    for ax, (key, lab) in zip(axes, metrics):
        data = [[float(r[key]) for r in cohorts[g]] for g in groups]
        bp = ax.boxplot(data, labels=groups, showfliers=True, patch_artist=True)
        colors = ["#6baed6", "#74c476", "#fdae6b"]
        for patch, c in zip(bp["boxes"], colors):
            patch.set_facecolor(c)
            patch.set_alpha(0.7)
        ax.set_title(lab, fontsize=10)
        ax.tick_params(axis="x", labelsize=8)
        ax.grid(True, axis="y", alpha=0.3)
    fig.suptitle(title, fontsize=12)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)


def find_threshold(a_vals, b_vals, prefer_simple_in_b=True):
    """Find simple cutoff where §2.33 (b) tends simpler than §2.1 (a). Return candidate thresholds."""
    if not a_vals or not b_vals:
        return None
    # try percentiles of combined
    allv = np.asarray(a_vals + b_vals, dtype=float)
    cands = sorted(set(np.percentile(allv, [25, 40, 50, 60, 75]).tolist()))
    best = None
    for thr in cands:
        # simple = value <= thr
        a_simple = sum(1 for x in a_vals if x <= thr) / len(a_vals)
        b_simple = sum(1 for x in b_vals if x <= thr) / len(b_vals)
        # want b more simple than a
        lift = b_simple - a_simple
        if best is None or lift > best["lift"]:
            best = {"thr": float(thr), "s21_simple_rate": a_simple, "s233_simple_rate": b_simple, "lift": lift}
    return best


def main():
    orders, atoms_by, attrs_by, traces_by = load_cache()
    details = load_details_index()
    eb_map = build_eb_to_vascs(attrs_by)

    # Cohort A: eventName filter
    cohort_a = []
    for ono, d in details.items():
        names = match_event_names(d)
        if not names:
            continue
        m = compute_metrics(ono, orders, atoms_by, attrs_by, traces_by, details, eb_map)
        if not m:
            continue
        m["eventNames"] = names
        m["cohort"] = "event_filter"
        cohort_a.append(m)

    # Cohort B: cache scene §2.1 / §2.33 all inbound (supplement; no eventName required)
    cohort_b = []
    for ono, alist in atoms_by.items():
        pa = primary_inbound(alist)
        if not pa:
            continue
        code = pa.get("scene_overview_code") or ""
        if code not in {S21, S233}:
            continue
        m = compute_metrics(ono, orders, atoms_by, attrs_by, traces_by, details, eb_map)
        if not m:
            continue
        m["cohort"] = "scene_cache"
        # tag if event matches
        m["event_match"] = 1 if match_event_names(details.get(ono)) else 0
        cohort_b.append(m)

    def by_group(rows):
        g = defaultdict(list)
        for r in rows:
            g[r["group"]].append(r)
        return dict(g)

    ga = by_group(cohort_a)
    gb = by_group(cohort_b)

    plot_boxplots(
        ga,
        OUT / "complexity-boxplot.png",
        "复杂度对比（异常名称含 包裹条码异常/批量异常）§2.1 vs §2.33 vs 其他",
    )
    plot_boxplots(
        {k: gb[k] for k in ["§2.1", "§2.33"] if k in gb},
        OUT / "complexity-boxplot-scene-cache.png",
        "补充：cache 场景 §2.1 vs §2.33（不强制 eventName）",
    )

    lines = []
    lines.append("# 需求复杂度 vs 场景选择（§2.1 / §2.33 / 其他）")
    lines.append("")
    lines.append("## 样本口径")
    lines.append("")
    lines.append(
        "- **主样本**：既有 `details.json` 中 `eventName` 含「包裹条码异常」或「批量异常」的入库增值单；场景优先 `_oms_cache` atoms，否则 details。"
    )
    lines.append(
        f"- 主样本规模：共 **{len(cohort_a)}** 单 → §2.1={len(ga.get('§2.1', []))}，§2.33={len(ga.get('§2.33', []))}，其他={len(ga.get('其他', []))}。"
    )
    lines.append(
        "- **严重限制**：带 eventName 的 §2.33 几乎为空（与上轮覆盖偏差一致）。因此另附 **cache 场景对照**：窗口内所有 `20250407004` vs `20250430` 单，用 attrs/details 算同一套复杂度（不要求 eventName）。"
    )
    lines.append(
        f"- 场景对照规模：§2.1={len(gb.get('§2.1', []))}，§2.33={len(gb.get('§2.33', []))}（其中带匹配 eventName 的 §2.33 仅 {sum(1 for r in gb.get('§2.33', []) if r.get('event_match'))}）。"
    )
    lines.append("- 未改 pipeline、未新查 OMS。")
    lines.append("")

    # name breakdown
    name_cnt = Counter(n for r in cohort_a for n in r["eventNames"])
    lines.append("### 主样本异常名称分布")
    lines.append("")
    lines.append("| 异常名称 | 单量 |")
    lines.append("|---------|-----:|")
    for n, c in name_cnt.most_common():
        lines.append(f"| {n} | {c} |")
    lines.append("")

    other_scenes = Counter((r["sceneCode"], r["sceneName"]) for r in ga.get("其他", []))
    lines.append("### 主样本「其他」场景分布")
    lines.append("")
    lines.append("| 场景码 | OMS 全名 | n |")
    lines.append("|--------|---------|--:|")
    for (c, n), k in other_scenes.most_common():
        lines.append(f"| {c} | {n} | {k} |")
    lines.append("")

    def write_compare_table(title: str, groups_map: dict, group_keys: list[str]):
        lines.append(f"## {title}")
        lines.append("")
        header = "| 指标 | " + " | ".join(group_keys) + " |"
        sep = "|------|" + "|".join(["------"] * len(group_keys)) + "|"
        lines.append(header)
        lines.append(sep)
        for key, lab in METRIC_LABELS:
            cells = []
            for g in group_keys:
                rows = groups_map.get(g) or []
                vals = [float(r[key]) for r in rows]
                cells.append(fmt_sum(summarize(vals)))
            lines.append(f"| {lab} (`{key}`) | " + " | ".join(cells) + " |")
        lines.append("")

        # binary rates
        lines.append("### 二值指标占比")
        lines.append("")
        lines.append("| 指标 | " + " | ".join(group_keys) + " |")
        lines.append("|------|" + "|".join(["------"] * len(group_keys)) + "|")
        for key, lab in [
            ("has_LF", "有 LF"),
            ("has_BEOR", "有 BEOR"),
            ("has_resubmit_eb", "EB↔多 VASC"),
            ("has_reject_trace", "轨迹退回词"),
            ("has_detail", "有 details"),
        ]:
            cells = []
            for g in group_keys:
                rows = groups_map.get(g) or []
                if not rows:
                    cells.append("—")
                else:
                    cells.append(f"{pct(sum(r[key] for r in rows), len(rows)):.1f}% (n={len(rows)})")
            lines.append(f"| {lab} | " + " | ".join(cells) + " |")
        lines.append("")

    write_compare_table(
        "主样本对比（eventName 过滤）",
        ga,
        [g for g in ["§2.1", "§2.33", "其他"] if ga.get(g)],
    )
    write_compare_table(
        "补充：cache 场景对照（§2.1 vs §2.33，不强制 eventName）",
        gb,
        [g for g in ["§2.1", "§2.33"] if gb.get(g)],
    )

    lines.append("## 箱线图")
    lines.append("")
    lines.append("### 主样本")
    lines.append("")
    lines.append("![](complexity-boxplot.png)")
    lines.append("")
    lines.append("### 场景对照（cache）")
    lines.append("")
    lines.append("![](complexity-boxplot-scene-cache.png)")
    lines.append("")

    # Hypothesis test style comparison on cache cohort (has both groups)
    lines.append("## 假说检验：简单→§2.33，复杂→§2.1？")
    lines.append("")
    s21 = gb.get("§2.1") or []
    s233 = gb.get("§2.33") or []
    lines.append(
        "因主样本 §2.33≈1，**假说主要依据 cache 场景对照**（同窗口实选场景），并参考主样本 §2.1 vs 其他。"
    )
    lines.append("")
    lines.append("| 指标 | §2.1 中位数 | §2.33 中位数 | §2.33 是否更简单 |")
    lines.append("|------|----------:|-----------:|----------------|")
    direction = []
    for key, lab in [
        ("req_len", "需求字数"),
        ("n_actions", "动作数"),
        ("n_eb", "EB数"),
        ("n_wi", "WI数"),
        ("n_files", "附件数"),
        ("n_attrs", "非空字段数"),
        ("n_sku", "SKU数"),
        ("n_traces", "追踪条数"),
    ]:
        a = summarize([float(r[key]) for r in s21])
        b = summarize([float(r[key]) for r in s233])
        if a["median"] is None or b["median"] is None:
            simpler = "—"
        else:
            # lower = simpler for these metrics
            if b["median"] < a["median"] * 0.9:
                simpler = "✓ 更简单"
                direction.append(1)
            elif b["median"] > a["median"] * 1.1:
                simpler = "✗ 更复杂"
                direction.append(-1)
            else:
                simpler = "≈ 接近"
                direction.append(0)
        lines.append(
            f"| {lab} | {a['median'] if a['median'] is not None else '—'} | {b['median'] if b['median'] is not None else '—'} | {simpler} |"
        )
    lines.append("")

    # thresholds on cache cohort
    lines.append("### 分界线候选（cache 对照）")
    lines.append("")
    lines.append("| 指标 | 候选阈值（≤ 视为更简单） | §2.33 落在简单侧占比 | §2.1 落在简单侧占比 | 提升（pp） |")
    lines.append("|------|-------------------------|--------------------:|-------------------:|----------:|")
    thr_notes = []
    for key, lab in [("req_len", "需求字数"), ("n_actions", "动作数"), ("n_eb", "EB数"), ("n_attrs", "非空字段数"), ("n_files", "附件数")]:
        a_vals = [float(r[key]) for r in s21]
        b_vals = [float(r[key]) for r in s233]
        thr = find_threshold(a_vals, b_vals)
        if not thr:
            continue
        lines.append(
            f"| {lab} | ≤ {thr['thr']:.0f} | {thr['s233_simple_rate']*100:.1f}% | {thr['s21_simple_rate']*100:.1f}% | {thr['lift']*100:.1f} |"
        )
        thr_notes.append((lab, thr))
    lines.append("")

    # main sample s21 vs other
    lines.append("### 主样本：§2.1 vs 其他（同为「条码异常」名称）")
    lines.append("")
    lines.append("| 指标 | §2.1 中位数 | 其他 中位数 |")
    lines.append("|------|----------:|----------:|")
    for key, lab in [("req_len", "需求字数"), ("n_actions", "动作数"), ("n_eb", "EB数"), ("n_wi", "WI数"), ("n_files", "附件数"), ("n_attrs", "非空字段")]:
        a = summarize([float(r[key]) for r in ga.get("§2.1", [])])
        b = summarize([float(r[key]) for r in ga.get("其他", [])])
        lines.append(f"| {lab} | {a['median'] if a['n'] else '—'} | {b['median'] if b['n'] else '—'} |")
    lines.append("")

    pos = sum(1 for x in direction if x > 0)
    neg = sum(1 for x in direction if x < 0)
    neu = sum(1 for x in direction if x == 0)

    lines.append("## 结论")
    lines.append("")
    if len(s233) < 5 and len(ga.get("§2.33", [])) < 5:
        lines.append(
            f"1. **主样本无法直接验证假说**：eventName 过滤后 §2.33 仅 {len(ga.get('§2.33', []))} 单；结论依赖 cache 场景对照（§2.33 n={len(s233)}，§2.1 n={len(s21)}）。"
        )
    if pos > neg and pos >= 3:
        verdict = "部分成立"
        lines.append(
            f"2. **假说「简单→§2.33，复杂→§2.1」：{verdict}**（{pos} 项指标 §2.33 更简单，{neg} 项相反，{neu} 项接近）。"
        )
    elif neg > pos:
        verdict = "不成立（方向相反或混乱）"
        lines.append(
            f"2. **假说：{verdict}**（更简单指标数 {pos}，更复杂 {neg}，接近 {neu}）。"
        )
    else:
        verdict = "证据不足 / 弱"
        lines.append(
            f"2. **假说：{verdict}**（更简单 {pos}，更复杂 {neg}，接近 {neu}）；复杂度不是主导分流因子，或与场景上线/客户习惯混杂。"
        )

    # concrete thresholds if lift decent
    good_thr = [t for t in thr_notes if t[1]["lift"] >= 0.1]
    if good_thr:
        lines.append("3. **相对有用的「简单」分界线候选**（cache 对照，§2.33 更常落在简单侧）：")
        for lab, thr in good_thr:
            lines.append(
                f"   - {lab} ≤ **{thr['thr']:.0f}**（§2.33 简单侧 {thr['s233_simple_rate']*100:.0f}% vs §2.1 {thr['s21_simple_rate']*100:.0f}%）"
            )
    else:
        lines.append(
            "3. **未找到提升 ≥10pp 的清晰分界线**：即使存在中位数差异，重叠大，不宜用单一阈值硬切场景。"
        )

    lines.append(
        "4. **建议**：复杂度最多作 match-template **软特征**（字数、动作数、EB/WI 数、附件数）；不能替代异常名称/对象/业务硬规则。要坐实假说，需给 §2.33 单补拉 eventName 后重跑主样本。"
    )
    lines.append("")

    # extras discovered
    lines.append("## 额外复杂度指标（已纳入上表）")
    lines.append("")
    lines.append("- 需求描述行数、状态追踪条数、是否有 LF/BEOR、轨迹是否含退回/重提用词、同一 EB 是否关联多个 VASC。")
    lines.append("")

    (OUT / "complexity-vs-scene.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    payload = {
        "cohort_a_n": len(cohort_a),
        "cohort_a_groups": {k: len(v) for k, v in ga.items()},
        "cohort_b_n": len(cohort_b),
        "cohort_b_groups": {k: len(v) for k, v in gb.items()},
        "verdict": verdict,
        "metrics_main": {
            g: {key: summarize([float(r[key]) for r in rows]) for key, _ in METRIC_LABELS}
            for g, rows in ga.items()
        },
        "metrics_cache": {
            g: {key: summarize([float(r[key]) for r in rows]) for key, _ in METRIC_LABELS}
            for g, rows in gb.items()
        },
        "rows_a": [{k: v for k, v in r.items() if k != "text_preview"} | {"text_preview": r.get("text_preview")} for r in cohort_a],
        "rows_b_sample": [
            {k: v for k, v in r.items() if k not in ("actions", "file_types") or True}
            for r in cohort_b
        ],
    }
    # simplify json
    def clean(o):
        if isinstance(o, dict):
            return {k: clean(v) for k, v in o.items()}
        if isinstance(o, list):
            return [clean(x) for x in o]
        if isinstance(o, (np.floating, float)):
            return float(o)
        if isinstance(o, (np.integer, int)):
            return int(o)
        return o

    (OUT / "_complexity_vs_scene.json").write_text(
        json.dumps(clean(payload), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("A", {k: len(v) for k, v in ga.items()})
    print("B", {k: len(v) for k, v in gb.items()})
    print("verdict", verdict)


if __name__ == "__main__":
    main()
