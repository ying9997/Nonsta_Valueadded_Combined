# coding: utf-8
"""Inspect OMS fact workbook for exploration (UTF-8 dump)."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
XLSX = ROOT / "workspace" / "data" / "raw" / "全量_增值单接口口径事实补齐.xlsx"
OUT = ROOT / "workspace" / "_runs" / "20260908_fact_exploration"
OUT.mkdir(parents=True, exist_ok=True)


def cell(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    s = str(v).replace("\xa0", " ").strip()
    if s.lower() in {"nan", "none", "nat"}:
        return ""
    return s


def nonempty(series: pd.Series) -> pd.Series:
    return series.map(cell).ne("")


xl = pd.ExcelFile(XLSX)
sheets_info = []
for name in xl.sheet_names:
    df = pd.read_excel(XLSX, sheet_name=name, dtype=object)
    fill = {c: int(nonempty(df[c]).sum()) for c in df.columns}
    sheets_info.append(
        {
            "sheet": name,
            "rows": len(df),
            "cols": len(df.columns),
            "columns": list(df.columns),
            "fill_counts": fill,
        }
    )

# Load core sheets by name (use actual names from workbook)
sheet_map = {s["sheet"]: s["sheet"] for s in sheets_info}
# Prefer Chinese names; fall back by index order from inspect
names = xl.sheet_names
main_name = names[0]
atoms_name = [n for n in names if "vaAtoms" in n or n.endswith("口径") or "Atoms" in n]
# Find by columns signature
by_cols = {}
for n in names:
    cols = set(pd.read_excel(XLSX, sheet_name=n, nrows=0).columns)
    by_cols[n] = cols

main = None
atoms = None
attrs = None
audit = None
basic = None
for n, cols in by_cols.items():
    if {"orderNo", "sceneOverviewName", "sop", "serviceName", "isAuditThrough"} <= cols and "serviceCode" not in cols:
        main = n
    if {"orderNo", "serviceCode", "sceneOverviewName", "sop"} <= cols and "attributeKey" not in cols:
        atoms = n
    if {"attributeKey", "attributeValue", "orderNo"} <= cols:
        attrs = n
    if {"eventCode", "supplementDesc", "orderNo"} <= cols and "attributeKey" not in cols:
        audit = n
    if {"orderNo", "countryCode", "isAudit"} <= cols:
        basic = n

df_main = pd.read_excel(XLSX, sheet_name=main, dtype=object)
df_atoms = pd.read_excel(XLSX, sheet_name=atoms, dtype=object)
df_attrs = pd.read_excel(XLSX, sheet_name=attrs, dtype=object)
df_audit = pd.read_excel(XLSX, sheet_name=audit, dtype=object)
df_basic = pd.read_excel(XLSX, sheet_name=basic, dtype=object)

# Attribute key distribution
attr_keys = Counter()
attr_names = Counter()
attr_name_by_key = {}
attachment_like = []
for _, r in df_attrs.iterrows():
    k = cell(r.get("attributeKey"))
    n = cell(r.get("attributeName"))
    v = cell(r.get("attributeValue"))
    attr_keys[k] += 1
    attr_names[n] += 1
    if k:
        attr_name_by_key.setdefault(k, n)
    blob = f"{k} {n} {v}".lower()
    # heuristic attachment signals
    if any(
        x in blob
        for x in [
            "attach",
            "file",
            "upload",
            "附件",
            "上传",
            "图片",
            "照片",
            "pdf",
            "xlsx",
            "jpeg",
            "jpg",
            "png",
            "token",
            "url",
            ".doc",
            "label",
            "标签文件",
            "对应关系",
            "操作说明",
            "rdp",
            "rel_rdp",
        ]
    ):
        attachment_like.append(
            {
                "orderNo": cell(r.get("orderNo")),
                "attributeKey": k,
                "attributeName": n,
                "value_head": v[:160],
                "value_len": len(v),
                "inputNode": cell(r.get("inputNode")),
            }
        )

# Detect URL/token/file patterns in attribute values
FILE_RE = re.compile(r"https?://|\.pdf\b|\.xlsx?\b|\.docx?\b|\.jpe?g\b|\.png\b|\.zip\b|[0-9a-f]{32}", re.I)
att_key_counter = Counter()
att_type_counter = Counter()
orders_with_att_signal = set()
for item in attachment_like:
    v = item["value_head"]
    k = item["attributeKey"]
    att_key_counter[k or item["attributeName"]] += 1
    orders_with_att_signal.add(item["orderNo"])
    if re.search(r"\.pdf\b", v, re.I) or "pdf" in (item["attributeName"] or "").lower():
        att_type_counter["pdf_signal"] += 1
    elif re.search(r"\.xlsx?\b", v, re.I):
        att_type_counter["excel_signal"] += 1
    elif re.search(r"\.jpe?g\b|\.png\b", v, re.I):
        att_type_counter["image_signal"] += 1
    elif re.search(r"https?://", v, re.I):
        att_type_counter["url_signal"] += 1
    elif re.fullmatch(r"[0-9a-f]{32}", v.strip(), re.I) or re.search(r"[0-9a-f]{32}\.", v, re.I):
        att_type_counter["token_or_hash_filename_signal"] += 1
    else:
        att_type_counter["other_or_text"] += 1

# Audit events
event_codes = Counter(cell(x) for x in df_audit["eventCode"])
# reject-like from supplementDesc / eventContent
reject_reasons = Counter()
for _, r in df_audit.iterrows():
    code = cell(r.get("eventCode"))
    content = cell(r.get("eventContent"))
    supp = cell(r.get("supplementDesc"))
    blob = code + "|" + content
    if any(x in blob for x in ["退回", "驳回", "拒绝", "reject", "Reject", "REJECT"]):
        reason = supp or content or code
        reject_reasons[reason[:200] or "(empty)"] += 1
    elif cell(r.get("newStatus")) in {"RJ", "RB", "RD"} or "退" in code:
        reason = supp or content or code
        reject_reasons[reason[:200] or "(empty)"] += 1

# Also check main sheet auditTraceEventCode
main_events = Counter(cell(x) for x in df_main["auditTraceEventCode"] if cell(x))
main_reject = Counter()
for _, r in df_main.iterrows():
    code = cell(r.get("auditTraceEventCode"))
    supp = cell(r.get("auditTraceSupplementDesc"))
    if any(x in code for x in ["退回", "驳回", "拒绝"]):
        main_reject[supp[:200] or code or "(empty)"] += 1

# Status / audit distributions on main
audit_dist = Counter()
for _, r in df_main.iterrows():
    flag = cell(r.get("isAuditThrough")).upper()
    status = cell(r.get("status")).upper()
    code = cell(r.get("auditTraceEventCode"))
    if flag == "Y":
        audit_dist["通过(isAuditThrough=Y)"] += 1
    elif flag == "N":
        audit_dist["未通过(isAuditThrough=N)"] += 1
    elif status == "CD":
        audit_dist["取消(status=CD)"] += 1
    else:
        audit_dist[f"其他/未知(flag={flag or 'empty'},status={status or 'empty'})"] += 1

# Better classification
audit_result = Counter()
for _, r in df_main.iterrows():
    flag = cell(r.get("isAuditThrough")).upper()
    status = cell(r.get("status")).upper()
    code = cell(r.get("auditTraceEventCode"))
    if status == "CD":
        label = "取消"
    elif flag == "Y" or ("审核通过" in code and "退回" not in code):
        label = "通过"
    elif flag == "N" or any(x in code for x in ["退回", "驳回"]):
        label = "退回"
    else:
        label = "其他/未知"
    audit_result[label] += 1

# Scene x service from atoms (preferred) and main
scene_cnt = Counter()
scene_service = Counter()
for _, r in df_atoms.iterrows():
    sc = cell(r.get("sceneOverviewName")) or "(空/未知)"
    sv = cell(r.get("serviceName")) or "(空)"
    scene_cnt[sc] += 1
    scene_service[(sc, sv)] += 1

# SOP coverage
sop_yes = int(nonempty(df_atoms["sop"]).sum())
sop_no = len(df_atoms) - sop_yes
sop_by_scene = []
for sc, g in df_atoms.groupby(df_atoms["sceneOverviewName"].map(lambda x: cell(x) or "(空/未知)")):
    n = len(g)
    y = int(nonempty(g["sop"]).sum())
    sop_by_scene.append({"scene": sc, "n": n, "sop_yes": y, "rate": round(y / n, 4) if n else 0})
sop_by_scene.sort(key=lambda x: -x["n"])

# Field fill on main
fill_main = []
for c in df_main.columns:
    y = int(nonempty(df_main[c]).sum())
    fill_main.append({"field": c, "filled": y, "empty": len(df_main) - y, "rate": round(y / len(df_main), 4)})
fill_main_sorted = sorted(fill_main, key=lambda x: -x["filled"])
empty_top = sorted(fill_main, key=lambda x: -x["empty"])[:20]
filled_top = fill_main_sorted[:20]

# Per-scene field coverage (key fields)
key_fields = [
    "requirementDescription",
    "requirementBackground",
    "sceneOverviewName",
    "sop",
    "serviceName",
    "serviceCode",
    "isAuditThrough",
    "auditTraceSupplementDesc",
    "vasDes",
]
# join atoms for serviceCode
scene_field_cov = []
atoms_work = df_atoms.copy()
atoms_work["_scene"] = atoms_work["sceneOverviewName"].map(lambda x: cell(x) or "(空/未知)")
top_scenes = [s for s, _ in scene_cnt.most_common(10)]
for sc in top_scenes:
    g = atoms_work[atoms_work["_scene"] == sc]
    row = {"scene": sc, "n": len(g)}
    for f in key_fields:
        if f in g.columns:
            row[f] = round(int(nonempty(g[f]).sum()) / len(g), 4) if len(g) else 0
        else:
            row[f] = "not_available_in_source"
    scene_field_cov.append(row)

# Stats sheet
stats_name = [n for n in names if n in ("统计",) or "统计" in n]
stats_rows = []
if stats_name:
    df_stats = pd.read_excel(XLSX, sheet_name=stats_name[0], dtype=object)
    for _, r in df_stats.iterrows():
        stats_rows.append({"metric": cell(r.iloc[0]), "value": cell(r.iloc[1])})

# Field mapping sheet
fmap_name = [n for n in names if "字段" in n]
fmap_rows = []
if fmap_name:
    df_fm = pd.read_excel(XLSX, sheet_name=fmap_name[0], dtype=object)
    for _, r in df_fm.iterrows():
        fmap_rows.append({c: cell(r.get(c)) for c in df_fm.columns})

# Sample attribute values that look like files
sample_att_values = attachment_like[:30]

dump = {
    "sheet_names": names,
    "resolved": {
        "main": main,
        "atoms": atoms,
        "attrs": attrs,
        "audit": audit,
        "basic": basic,
    },
    "sheets_info": sheets_info,
    "stats_sheet": stats_rows,
    "field_mapping": fmap_rows,
    "audit_result_main": audit_result.most_common(),
    "audit_dist_detail": audit_dist.most_common(),
    "main_event_codes_top30": main_events.most_common(30),
    "audit_event_codes_top40": event_codes.most_common(40),
    "reject_reasons_from_audit_top20": reject_reasons.most_common(20),
    "reject_reasons_from_main_top20": main_reject.most_common(20),
    "scene_top20": scene_cnt.most_common(20),
    "scene_service_top40": [
        {"scene": a, "service": b, "n": n} for (a, b), n in scene_service.most_common(40)
    ],
    "sop_coverage": {"yes": sop_yes, "no": sop_no, "total": len(df_atoms)},
    "sop_by_scene_top20": sop_by_scene[:20],
    "attr_keys_top40": attr_keys.most_common(40),
    "attr_names_top40": attr_names.most_common(40),
    "attr_name_by_key": attr_name_by_key,
    "attachment_heuristic": {
        "note": "宽表无独立 attachments 列；仅能从 submitAttrs 属性名/值启发式识别，标记 cannot_verify 若非明确文件信号",
        "orders_with_att_like_signal": len(orders_with_att_signal),
        "att_like_rows": len(attachment_like),
        "att_key_counter_top30": att_key_counter.most_common(30),
        "att_type_counter": att_type_counter.most_common(),
        "sample_rows": sample_att_values,
    },
    "fill_top20": filled_top,
    "empty_top20": empty_top,
    "scene_field_cov_top10": scene_field_cov,
    "main_rows": len(df_main),
    "atoms_rows": len(df_atoms),
    "attrs_rows": len(df_attrs),
    "unique_orders_main": int(df_main["orderNo"].map(cell).nunique()),
    "unique_orders_atoms": int(df_atoms["orderNo"].map(cell).nunique()),
}

(OUT / "_profile_dump.json").write_text(json.dumps(dump, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", OUT / "_profile_dump.json")
print("sheets:", names)
print("resolved:", dump["resolved"])
print("audit_result:", audit_result)
print("scene_top10:", scene_cnt.most_common(10))
print("sop:", sop_yes, sop_no)
print("att orders:", len(orders_with_att_signal))
