# coding: utf-8
"""P3 task1/2 helpers: golden details merge + T1/T3 attachment stats."""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT = ROOT / "_runs/20260909_p3_eval"
CACHE = ROOT / "_runs/20260909_inbound_scene_probe/_oms_cache"
OUT.mkdir(parents=True, exist_ok=True)

NEED = [
    "VASC000000311652",
    "VASC000000315774",
    "VASC000000298617",
    "VASC000000305805",
    "VASC000000326061",
]

TARGETS = {
    "20250430": '【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架（§2.33）',
    "202506120001": "【入库】关联第三方商品条码上架（§2.12）",
}

FILEISH = {"VAS_ATTR_REL_LF", "EVENT02", "EVENT03", "VAS_ATTR_REL_SP", "TRPP"}


def is_fileish(key: str, name: str) -> bool:
    blob = f"{key}|{name}"
    return (
        key in FILEISH
        or "LF" in key
        or any(x in blob for x in ("附件", "文件", "上传", "SOP", "标签", "清单"))
    )


def merge_details() -> None:
    t14 = json.loads((ROOT / "_runs/20260909_t14_eval/details.json").read_text(encoding="utf-8"))
    demo = json.loads((ROOT / "_runs/20260904_demo_cases/demo_all.details.json").read_text(encoding="utf-8"))
    by = {x["orderNo"]: x for x in t14}
    for x in demo:
        by[x["orderNo"]] = x if x["orderNo"] == "VASC000000326061" else by.get(x["orderNo"], x)
    # ensure 326061 from demo
    for x in demo:
        if x["orderNo"] == "VASC000000326061":
            by[x["orderNo"]] = x
    merged = [by[n] for n in NEED if n in by]
    missing = [n for n in NEED if n not in by]
    (OUT / "t14-golden-details.json").write_text(
        json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("merged", len(merged), "missing", missing)


def attachment_rules() -> None:
    atoms_by: dict[str, list[dict]] = defaultdict(list)
    with (CACHE / "atoms.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            atoms_by[r["order_no"]].append(r)

    order_scene: dict[str, str] = {}
    for ono, alist in atoms_by.items():
        inbound = [a for a in alist if "入库" in (a.get("scene_overview_name") or "")]
        if not inbound:
            continue
        pa = sorted(inbound, key=lambda x: int(x.get("service_sequence") or 1))[0]
        order_scene[ono] = pa["scene_overview_code"]

    orders_by_scene: dict[str, set[str]] = defaultdict(set)
    for ono, code in order_scene.items():
        if code in TARGETS:
            orders_by_scene[code].add(ono)

    attrs_by_order: dict[str, list[dict]] = defaultdict(list)
    with (CACHE / "attrs_submit.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if (r.get("input_node") or "").upper() != "SUBMIT":
                continue
            attrs_by_order[r["order_no"]].append(r)

    lines: list[str] = []
    lines.append("# T1/T3 附件必填规则统计（数据驱动建议）")
    lines.append("")
    lines.append("## 口径")
    lines.append("")
    lines.append("- 数据：`_runs/20260909_inbound_scene_probe/_oms_cache/`（atoms + attrs_submit）")
    lines.append("- 筛选：`input_node=SUBMIT`；按增值单主入库 `scene_overview_code` 归属场景")
    lines.append("- **出现率** = 该场景订单中出现过该 fieldKey 的订单占比（不论值是否非空）")
    lines.append("- **非空率** = 该场景订单中该 fieldKey 值非空的订单占比")
    lines.append("- 建议：出现率≥70% → 建议必填；40–70% → 建议选填/待业务确认；<40% → 不建议默认必填")
    lines.append("- **只产出建议，不修改场景卡**")
    lines.append("")

    for code, sname in TARGETS.items():
        onos = sorted(orders_by_scene[code])
        n = len(onos)
        lines.append(f"## {sname}")
        lines.append("")
        lines.append(f"- 场景码：`{code}`")
        lines.append(f"- 订单数：**{n}**")
        lines.append("")
        key_present: Counter[str] = Counter()
        key_nonempty: Counter[str] = Counter()
        key_name: dict[str, str] = {}
        for ono in onos:
            seen: set[str] = set()
            nonempty: set[str] = set()
            for r in attrs_by_order.get(ono) or []:
                k = r.get("attribute_key") or ""
                if not k:
                    continue
                seen.add(k)
                key_name[k] = r.get("attribute_name") or k
                if (r.get("attribute_value") or "").strip():
                    nonempty.add(k)
            for k in seen:
                key_present[k] += 1
            for k in nonempty:
                key_nonempty[k] += 1

        def sort_key(k: str) -> tuple:
            name = key_name.get(k, k)
            return (0 if is_fileish(k, name) else 1, -key_present[k], k)

        keys = sorted(key_present.keys(), key=sort_key)
        lines.append("| OMS 场景全名（见映射表） | fieldKey | fieldName | 出现率 | 非空率 | 必填建议 |")
        lines.append("|------------------------|---------|-----------|-------:|-------:|---------|")
        for k in keys:
            pr = 100.0 * key_present[k] / n if n else 0
            nr = 100.0 * key_nonempty[k] / n if n else 0
            name = key_name.get(k, k)
            if pr < 10 and not is_fileish(k, name):
                continue
            if pr >= 70:
                sug = "≥70%→建议必填"
            elif pr >= 40:
                sug = "40–70%→建议选填/待确认"
            else:
                sug = "<40%→不建议默认必填"
            lines.append(f"| {sname} | `{k}` | {name} | {pr:.1f}% | {nr:.1f}% | {sug} |")
        lines.append("")
        lines.append("### 附件/文件类字段聚焦")
        lines.append("")
        att_keys = [k for k in keys if is_fileish(k, key_name.get(k, k))]
        if not att_keys:
            lines.append("- （未识别到明显附件类字段）")
        else:
            lines.append("| fieldKey | fieldName | 出现率 | 非空率 | 建议 |")
            lines.append("|---------|-----------|-------:|-------:|------|")
            for k in att_keys:
                pr = 100.0 * key_present[k] / n if n else 0
                nr = 100.0 * key_nonempty[k] / n if n else 0
                sug = "建议必填" if pr >= 70 else ("待确认" if pr >= 40 else "不建议默认必填")
                lines.append(f"| `{k}` | {key_name.get(k, k)} | {pr:.1f}% | {nr:.1f}% | {sug} |")
        lines.append("")

    lines.append("## 小结")
    lines.append("")
    lines.append("- 以上为 SUBMIT 阶段字段统计，供业务确认 T1/T3 附件策略；**未改场景卡**。")
    lines.append("- 若「出现率高但非空率低」，说明表单常挂该控件但多数未上传，必填需结合非空率与业务口径再定。")
    lines.append("")
    (OUT / "attachment-rules-t1t3.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("wrote attachment-rules-t1t3.md")


if __name__ == "__main__":
    merge_details()
    attachment_rules()
