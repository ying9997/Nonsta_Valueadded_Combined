# coding: utf-8
"""Monthly eventName × scene share trends (analysis only, no pipeline changes)."""
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

# Chinese font fallbacks on Windows
plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "Arial Unicode MS", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
CACHE = ROOT / "_runs/20260909_inbound_scene_probe/_oms_cache"
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

# § aliases for focus chart
S21 = "20250407004"  # 尺重/标签辨识后换标上架
S233 = "20250430"  # 批量异常补贴包裹标签
FOCUS_NAME = "包裹条码批量异常（需客户处理）"


def parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    s = str(s).strip()
    if not s:
        return None
    if s.isdigit():
        n = int(s)
        if n > 10_000_000_000:
            return datetime.fromtimestamp(n / 1000.0, tz=timezone.utc).replace(tzinfo=None)
        return datetime.fromtimestamp(n, tz=timezone.utc).replace(tzinfo=None)
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:19].replace("Z", ""), fmt.replace("T", " ").replace("Z", "") if "T" in fmt else fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


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
    return orders, atoms_by


def primary_inbound_atom(alist: list[dict]) -> dict | None:
    inbound = [a for a in alist if is_inbound(a.get("scene_overview_name") or "")]
    pool = inbound or []
    if not pool:
        return None
    return sorted(pool, key=lambda x: int(x.get("service_sequence") or 1))[0]


def scene_from_detail(d: dict) -> tuple[str, str]:
    for a in d.get("atoms") or []:
        name = (a.get("sceneOverviewName") or "").strip()
        code = (a.get("sceneOverviewCode") or "").strip()
        if is_inbound(name) and code:
            return code, name
    if d.get("atoms"):
        a = d["atoms"][0]
        return (a.get("sceneOverviewCode") or "").strip(), (a.get("sceneOverviewName") or "").strip()
    return "", ""


def date_from_detail(d: dict) -> datetime | None:
    lh = d.get("listHeader") or {}
    if isinstance(lh, dict):
        for key in ("orderDate", "createdIso", "created"):
            dt = parse_dt(lh.get(key) if key != "created" else str(lh.get("created") or ""))
            if dt:
                return dt
        # createdIso may exist
        dt = parse_dt(lh.get("createdIso"))
        if dt:
            return dt
    return None


def load_rows(orders, atoms_by) -> list[dict]:
    """One row per (order, eventName) with month + scene. Prefer cache date/scene."""
    best: dict[str, dict] = {}
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
                if en:
                    evs.append(en)
            if not evs:
                continue
            # prefer richer event set
            prev = best.get(ono)
            if prev and len(prev["eventNames"]) >= len(set(evs)):
                continue
            o = orders.get(ono)
            dt = parse_dt(o.get("order_date")) if o else None
            date_src = "cache" if dt else None
            if not dt:
                dt = date_from_detail(d)
                date_src = "details" if dt else None
            scode, sname = "", ""
            scene_src = ""
            if o and ono in atoms_by:
                pa = primary_inbound_atom(atoms_by[ono])
                if pa:
                    scode = pa.get("scene_overview_code") or ""
                    sname = pa.get("scene_overview_name") or ""
                    scene_src = "cache"
            if not scode or not is_inbound(sname):
                scode2, sname2 = scene_from_detail(d)
                if is_inbound(sname2):
                    scode, sname = scode2, sname2
                    scene_src = "details" if scene_src != "cache" else scene_src
            if not dt or not scode or not is_inbound(sname):
                continue
            best[ono] = {
                "orderNo": ono,
                "order_date": dt,
                "month": dt.strftime("%Y-%m"),
                "sceneCode": scode,
                "sceneName": sname,
                "eventNames": sorted(set(evs)),
                "date_src": date_src,
                "scene_src": scene_src,
                "in_cache": ono in orders,
            }
    rows = []
    for rec in best.values():
        for en in rec["eventNames"]:
            rows.append({**rec, "eventName": en})
    return rows


def short_scene(name: str, code: str) -> str:
    name = re.sub(r"^【入库】\s*", "", name or "")
    name = name.replace("\t", "").strip()
    if len(name) > 22:
        name = name[:20] + "…"
    return f"{code}:{name}"


def monthly_share(rows: list[dict], event_name: str | None = None, name_contains: str | None = None):
    """month -> Counter(sceneCode), and sceneCode->name map"""
    by_m: dict[str, Counter] = defaultdict(Counter)
    names: dict[str, str] = {}
    for r in rows:
        en = r["eventName"]
        if event_name and en != event_name:
            continue
        if name_contains and name_contains not in en:
            continue
        if event_name is None and name_contains is None:
            pass
        by_m[r["month"]][r["sceneCode"]] += 1
        names[r["sceneCode"]] = r["sceneName"]
    return dict(by_m), names


def plot_focus_s21_s233(rows: list[dict], out_path: Path) -> dict:
    """Focus chart: 批量异常 share of §2.1 vs §2.33 by month."""
    # exact name + fuzzy contains
    targets = [r for r in rows if FOCUS_NAME in r["eventName"] or r["eventName"] == FOCUS_NAME]
    # also near variants
    if not targets:
        targets = [r for r in rows if "包裹条码批量异常" in r["eventName"]]
    by_m: dict[str, Counter] = defaultdict(Counter)
    for r in targets:
        by_m[r["month"]][r["sceneCode"]] += 1
    months = sorted(by_m)
    s21, s233, other, total = [], [], [], []
    for m in months:
        c = by_m[m]
        t = sum(c.values())
        total.append(t)
        s21.append(100.0 * c.get(S21, 0) / t if t else 0)
        s233.append(100.0 * c.get(S233, 0) / t if t else 0)
        other.append(100.0 * (t - c.get(S21, 0) - c.get(S233, 0)) / t if t else 0)

    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.plot(months, s21, marker="o", label=f"§2.1 尺重换标 ({S21})")
    ax.plot(months, s233, marker="s", label=f"§2.33 补贴包裹标签 ({S233})")
    ax.plot(months, other, marker="^", linestyle="--", label="其他入库场景合计")
    for i, m in enumerate(months):
        ax.annotate(f"n={total[i]}", (m, max(s21[i], s233[i], other[i]) + 2), fontsize=8, ha="center")
    ax.set_ylim(0, 110)
    ax.set_ylabel("当月占比 (%)")
    ax.set_xlabel("下单月")
    ax.set_title("异常名称含「包裹条码批量异常」→ §2.1 vs §2.33 月度占比")
    ax.legend(loc="best", fontsize=9)
    ax.grid(True, alpha=0.3)
    fig.autofmt_xdate(rotation=30)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)
    return {
        "months": months,
        "s21": s21,
        "s233": s233,
        "other": other,
        "total": total,
        "n_orders": len({r["orderNo"] for r in targets}),
        "names": sorted({r["eventName"] for r in targets}),
    }


def plot_event_multiscene(rows: list[dict], event_key: str, match_fn, out_path: Path, title: str, top_k: int = 5):
    matched = [r for r in rows if match_fn(r["eventName"])]
    by_m, names = monthly_share(matched, None, None)
    # rebuild with filter already applied via matched
    by_m = defaultdict(Counter)
    names = {}
    for r in matched:
        by_m[r["month"]][r["sceneCode"]] += 1
        names[r["sceneCode"]] = r["sceneName"]
    by_m = dict(by_m)
    if not by_m:
        return None

    # pick top scenes overall
    overall = Counter()
    for c in by_m.values():
        overall.update(c)
    top_scenes = [s for s, _ in overall.most_common(top_k)]
    months = sorted(by_m)
    fig, ax = plt.subplots(figsize=(10, 5.5))
    for code in top_scenes:
        ys = []
        for m in months:
            t = sum(by_m[m].values())
            ys.append(100.0 * by_m[m].get(code, 0) / t if t else 0)
        ax.plot(months, ys, marker="o", label=short_scene(names.get(code, code), code))
    # other
    ys_other = []
    totals = []
    for m in months:
        t = sum(by_m[m].values())
        totals.append(t)
        top_sum = sum(by_m[m].get(c, 0) for c in top_scenes)
        ys_other.append(100.0 * (t - top_sum) / t if t else 0)
    if any(y > 0 for y in ys_other):
        ax.plot(months, ys_other, marker="x", linestyle="--", color="gray", label="其他场景合计")
    for i, m in enumerate(months):
        ax.annotate(f"n={totals[i]}", (m, 102), fontsize=7, ha="center", color="gray")
    ax.set_ylim(0, 115)
    ax.set_ylabel("当月占比 (%)")
    ax.set_xlabel("下单月")
    ax.set_title(title)
    ax.legend(loc="best", fontsize=7)
    ax.grid(True, alpha=0.3)
    fig.autofmt_xdate(rotation=30)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)
    return {
        "event_key": event_key,
        "n_orders": len({r["orderNo"] for r in matched}),
        "names": sorted({r["eventName"] for r in matched}),
        "months": months,
        "totals": totals,
        "top_scenes": [(c, names.get(c, c), overall[c]) for c in top_scenes],
        "file": out_path.name,
    }


def plot_heatmap_all(rows: list[dict], out_path: Path, min_name_n: int = 5):
    """eventName (high freq) × month → dominant scene share annotation optional; main: stacked? Use heatmap of dominant scene code index."""
    name_cnt = Counter(r["eventName"] for r in rows)
    names = [n for n, c in name_cnt.most_common() if c >= min_name_n]
    months = sorted({r["month"] for r in rows})
    # for each name×month: share of top scene
    data = np.full((len(names), len(months)), np.nan)
    annot = [["" for _ in months] for _ in names]
    for i, en in enumerate(names):
        for j, m in enumerate(months):
            sub = [r for r in rows if r["eventName"] == en and r["month"] == m]
            if not sub:
                continue
            c = Counter(r["sceneCode"] for r in sub)
            top, tc = c.most_common(1)[0]
            share = 100.0 * tc / len(sub)
            data[i, j] = share
            annot[i][j] = f"{top[-4:] if len(top)>4 else top}\n{share:.0f}%/{len(sub)}"

    fig, ax = plt.subplots(figsize=(max(8, len(months) * 1.2), max(4, len(names) * 0.7)))
    im = ax.imshow(data, aspect="auto", cmap="YlOrRd", vmin=0, vmax=100)
    ax.set_xticks(range(len(months)))
    ax.set_xticklabels(months, rotation=30, ha="right")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels([n if len(n) <= 28 else n[:26] + "…" for n in names], fontsize=8)
    for i in range(len(names)):
        for j in range(len(months)):
            if annot[i][j]:
                ax.text(j, i, annot[i][j], ha="center", va="center", fontsize=6)
    ax.set_title("高频异常名称 × 月：当月 Top1 场景码占比（格子=scene尾码 / 占比 / n）")
    fig.colorbar(im, ax=ax, fraction=0.03, label="Top1 场景占比 %")
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)
    return names, months


def main():
    orders, atoms_by = load_cache()
    rows = load_rows(orders, atoms_by)
    name_cnt = Counter(r["eventName"] for r in rows)
    order_cnt = len({r["orderNo"] for r in rows})
    cache_n = len({r["orderNo"] for r in rows if r["in_cache"]})

    focus = plot_focus_s21_s233(rows, OUT / "scene-trend-batch-barcode-s21-s233.png")

    charts = []
    specs = [
        (
            "batch",
            lambda n: "包裹条码批量异常" in n,
            "scene-trend-batch-barcode-multisene.png",
            "「包裹条码批量异常*」→ 各入库场景月度占比（Top5）",
        ),
        (
            "pkg_barcode",
            lambda n: "包裹条码异常" in n and "批量" not in n,
            "scene-trend-package-barcode.png",
            "「包裹条码异常*」（非批量）→ 各入库场景月度占比（Top5）",
        ),
        (
            "merch_barcode",
            lambda n: "商品条码异常" in n,
            "scene-trend-merchandise-barcode.png",
            "「商品条码异常*」→ 各入库场景月度占比（Top5）",
        ),
        (
            "unrecog",
            lambda n: "系统无法识别" in n,
            "scene-trend-barcode-unrecognized.png",
            "「商品有条码但系统无法识别」→ 各入库场景月度占比（Top5）",
        ),
        (
            "extra_item",
            lambda n: "订单外商品" in n,
            "scene-trend-extra-merchandise.png",
            "「包裹内出现订单外商品」→ 各入库场景月度占比（Top5）",
        ),
        (
            "aplus",
            lambda n: "A+" in n or "A＋" in n or "100%A" in n,
            "scene-trend-aplus.png",
            "名称含 A+/100%A+ → 各入库场景月度占比（Top5）",
        ),
    ]
    for key, fn, fname, title in specs:
        info = plot_event_multiscene(rows, key, fn, OUT / fname, title)
        if info:
            charts.append(info)

    heat_names, heat_months = plot_heatmap_all(rows, OUT / "scene-trend-heatmap-top-names.png", min_name_n=5)

    # markdown
    lines = []
    lines.append("# 异常名称 × 场景选择：月度趋势")
    lines.append("")
    lines.append("## 数据说明")
    lines.append("")
    lines.append(
        "- **场景 / 下单日优先**取自 `_runs/20260909_inbound_scene_probe/_oms_cache/`（`atoms` 入库场景 + `orders.order_date`）。"
    )
    lines.append(
        "- **异常名称 `eventName`** 不在 `_oms_cache` CSV 中；来自既有 details 的 `events[]`（与上轮探测相同来源），**本轮未新查 OMS**。"
    )
    lines.append(
        f"- 可用样本：增值单 **{order_cnt}**（其中命中本窗口 cache **{cache_n}**）；事件名关联行 **{len(rows)}**。"
    )
    lines.append(f"- 日期缺 cache 时回退 details.`listHeader.orderDate`；场景非入库则丢弃。")
    lines.append("")
    lines.append("### 异常名称频次")
    lines.append("")
    lines.append("| 异常名称 | 关联单数（按名） |")
    lines.append("|---------|----------------:|")
    for n, c in name_cnt.most_common():
        lines.append(f"| {n} | {c} |")
    lines.append("")

    lines.append("## 重点：包裹条码批量异常 — §2.1 vs §2.33")
    lines.append("")
    lines.append(f"- 匹配到的原始异常名称：{focus['names']}")
    lines.append(f"- 订单数：{focus['n_orders']}")
    lines.append("")
    lines.append("![](scene-trend-batch-barcode-s21-s233.png)")
    lines.append("")
    lines.append("| 月份 | n | §2.1 占比 | §2.33 占比 | 其他占比 |")
    lines.append("|------|--:|--------:|----------:|--------:|")
    for i, m in enumerate(focus["months"]):
        lines.append(
            f"| {m} | {focus['total'][i]} | {focus['s21'][i]:.1f}% | {focus['s233'][i]:.1f}% | {focus['other'][i]:.1f}% |"
        )
    lines.append("")
    # trend verdict
    if focus["months"]:
        early = focus["s21"][0] if focus["s21"] else None
        late = focus["s21"][-1] if focus["s21"] else None
        early233 = focus["s233"][0] if focus["s233"] else None
        late233 = focus["s233"][-1] if focus["s233"] else None
        lines.append("### 读图要点")
        lines.append("")
        lines.append(
            f"- 首月 §2.1={early:.1f}% / §2.33={early233:.1f}%；末月 §2.1={late:.1f}% / §2.33={late233:.1f}%（按有样本月份）。"
        )
        shifted = (late233 or 0) > (early233 or 0) + 10 and (late or 0) < (early or 0) - 10
        if shifted:
            lines.append("- **可见**「前期偏 §2.1、后期切向 §2.33」迹象。")
        else:
            lines.append(
                "- **未见**清晰的「前期归 §2.1、后期稳定切到 §2.33」趋势（或样本过少/仍以 §2.1 或其他场景为主）。"
            )
        lines.append("")

    lines.append("## 其他高频异常名称（Top 场景折线）")
    lines.append("")
    for ch in charts:
        lines.append(f"### {ch['event_key']} — {ch['names']}")
        lines.append("")
        lines.append(f"- 订单数：{ch['n_orders']}")
        lines.append(
            "- Top 场景："
            + "； ".join(f"{short_scene(nm, c)} (n={n})" for c, nm, n in ch["top_scenes"])
        )
        lines.append("")
        lines.append(f"![]({ch['file']})")
        lines.append("")
        lines.append("| 月份 | n |")
        lines.append("|------|--:|")
        for m, t in zip(ch["months"], ch["totals"]):
            lines.append(f"| {m} | {t} |")
        lines.append("")

    lines.append("## 总览热力图")
    lines.append("")
    lines.append("频次 ≥5 的异常名称；格子为当月 Top1 场景码（显示码尾）与占比/样本量。")
    lines.append("")
    lines.append("![](scene-trend-heatmap-top-names.png)")
    lines.append("")
    lines.append("## 结论（针对「前期 §2.1 → 后期专属场景」假说）")
    lines.append("")
    lines.append(
        "1. 本图仅覆盖 **已有 eventName 的子集**，不是 `_oms_cache` 全量 5112 单；月度 n 往往很小，解读需谨慎。"
    )
    lines.append(
        "2. 「包裹条码批量异常」在已有样本上若未呈现向 §2.33 切换，与时间线探测结论一致：不能单靠「场景码晚出现」解释。"
    )
    lines.append(
        "3. 其他高频名（商品条码异常、系统无法识别、订单外商品等）请对照上图看是否出现专属场景抬升；有则值得做成「生效日后加强映射」规则，无则优先查需求描述/属性。"
    )
    lines.append(
        "4. 若要做全窗口结论，需对 cache 入库单补拉 `getEventOrders` 后再重画。"
    )
    lines.append("")

    (OUT / "scene-trend-by-month.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # sidecar json for audit
    (OUT / "_scene_trend_rows.json").write_text(
        json.dumps(
            {
                "n_rows": len(rows),
                "n_orders": order_cnt,
                "n_in_cache": cache_n,
                "name_counts": name_cnt.most_common(),
                "focus": focus,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print("orders", order_cnt, "rows", len(rows), "cache", cache_n)
    print("wrote", OUT / "scene-trend-by-month.md")


if __name__ == "__main__":
    main()
