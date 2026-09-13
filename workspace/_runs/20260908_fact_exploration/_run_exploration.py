# coding: utf-8
"""Fact exploration + labeling samples for 20260908_fact_exploration.

Outputs only exploration artifacts (data-profile / sample-cases).
Does NOT create scene rules, eval gold, SOP library, or workflow JSON.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
XLSX = ROOT / "workspace" / "data" / "raw" / "全量_增值单接口口径事实补齐.xlsx"
OUT = ROOT / "workspace" / "_runs" / "20260908_fact_exploration"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE_REL = "workspace/data/raw/全量_增值单接口口径事实补齐.xlsx"

HUMAN_QUESTIONS = [
    "这条单在 check-requirement 节点应该 pass 还是 fail？为什么？",
    "normalizedRequirement 应该抽取出哪些对象、动作、目的、数量、仓库、附件信号？",
    "match-template 节点应该判 supported / unsupported / ambiguous？为什么？",
    "如果判 supported，check-completeness 节点还缺哪些字段或附件？",
    "sop_generated 节点应该参考哪些历史 SOP 表达？哪些内容不能直接照抄？",
    "最终 expectedOutputPath 应该是什么？",
]

LABEL_PLACEHOLDER = {
    "expectedTrace": {
        "checkRequirement": {
            "complete": None,
            "normalizedRequirement": None,
            "signals": {},
            "boundBypasses": [],
        },
        "matchTemplate": {
            "decision": None,
            "querySignals": {},
            "expectedScores": {},
            "expectedGap": None,
            "reason": None,
        },
        "checkCompleteness": {
            "missingFields": [],
            "missingAttachments": [],
            "reason": None,
        },
        "sopGenerated": {
            "expectedStyle": None,
            "referenceSopPattern": None,
            "doNotCopyNotes": [],
        },
        "finalDecision": {"expectedOutputPath": None, "reason": None},
    },
    "verifiedBy": None,
    "verifiedAt": None,
}


def cell(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, datetime):
        return v.isoformat(sep=" ", timespec="seconds")
    s = str(v).replace("\xa0", " ").strip()
    if s.lower() in {"nan", "none", "nat"}:
        return ""
    return s


def nonempty_series(s: pd.Series) -> pd.Series:
    return s.map(cell).ne("")


def md_escape(text: str) -> str:
    return (text or "").replace("\r\n", "\n").replace("\r", "\n")


def fence(text: str) -> str:
    body = md_escape(text) if text else "（空）"
    marker = "````" if "```" in body else "```"
    return f"{marker}text\n{body}\n{marker}"


def classify_audit_result(flag: str, status: str, event_blob: str) -> str:
    flag_u = (flag or "").upper()
    status_u = (status or "").upper()
    blob = event_blob or ""
    if "审核不通过" in blob or "REVIEW_FAILED" in blob:
        return "退回"
    if flag_u == "Y" or ("审核通过" in blob and "审核不通过" not in blob):
        return "通过"
    if status_u == "CD" or "取消订单" in blob:
        return "取消"
    if flag_u == "N":
        # 本表中 N 几乎都伴随取消；无明确审核不通过文案时归其他
        return "其他/未知"
    return "其他/未知"


def infer_attachment_type(name: str, value: str) -> str:
    blob = f"{name} {value}".lower()
    if re.search(r"\.pdf\b", blob):
        return "pdf"
    if re.search(r"\.xlsx?\b", blob):
        return "excel"
    if re.search(r"\.jpe?g\b|\.png\b|\.gif\b|\.webp\b", blob):
        return "image"
    if re.search(r"https?://", blob):
        return "url"
    if re.search(r"[0-9a-f]{32}", blob):
        return "token"
    return "unknown"


def looks_like_attachment_value(value: str) -> bool:
    v = value or ""
    if not v:
        return False
    if re.search(r"https?://", v, re.I):
        return True
    if re.search(r"\.(pdf|xlsx?|docx?|jpe?g|png|zip|csv)\b", v, re.I):
        # filename alone without path still may be reference, not uploaded file record
        return bool(re.search(r"[/\\]|https?://|[0-9a-f]{32}", v, re.I))
    if re.fullmatch(r"[0-9a-f]{32}(?:\.[A-Za-z0-9]+)?", v.strip(), re.I):
        return True
    return False


def text_mentions_attachment(text: str) -> bool:
    t = text or ""
    return any(x in t for x in ["附件", "上传", "见附图", "见图片", "标签文件", "见截图", "照片见"])


def is_vague_requirement(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 12:
        return True
    vague = (
        "帮忙处理",
        "请处理",
        "处理一下",
        "看一下",
        "看下这个单",
        "按客户要求",
        "尽快处理",
        "谢谢",
    )
    if any(v in t for v in vague) and len(t) < 40:
        return True
    return False


def reject_reason_category(reason: str) -> str:
    r = reason or ""
    if any(x in r for x in ["需求描述不清", "描述不清楚", "联系客服沟通", "补充说明"]):
        return "需求描述不清晰"
    if any(x in r for x in ["标准增值", "请提交标准"]):
        return "可能应走标准增值"
    if any(x in r for x in ["仓库暂时无法", "无法提供该服务", "仓库无法"]):
        return "仓库无法支持"
    if any(x in r for x in ["场景不符", "不适用", "不支持此场景"]):
        return "场景不符"
    if any(x in r for x in ["补资料", "补充附件", "缺少", "未上传", "资料不齐"]):
        return "资料/附件不齐"
    return "其他退回原因"


def load_workbook():
    xl = pd.ExcelFile(XLSX)
    names = xl.sheet_names
    sheets = {}
    for name in names:
        sheets[name] = pd.read_excel(XLSX, sheet_name=name, dtype=object)
    return names, sheets


def build_profile(names, sheets):
    main = sheets["增值单汇总"]
    atoms = sheets["vaAtoms口径"]
    attrs = sheets["submitAttrs"]
    audit = sheets["auditTrace"]
    basic = sheets["basicInfo口径"]

    # sheet inventory
    sheet_rows = []
    for name in names:
        df = sheets[name]
        fill = {c: int(nonempty_series(df[c]).sum()) for c in df.columns}
        sheet_rows.append(
            {
                "sheet": name,
                "rows": len(df),
                "cols": len(df.columns),
                "columns": list(df.columns),
                "fill": fill,
            }
        )

    # core field map
    core_fields = [
        ("VASC 单号", "orderNo", "增值单汇总 / vaAtoms口径 / basicInfo口径 / submitAttrs / auditTrace", "available"),
        ("增值产品", "productName / productCode", "增值单汇总 / basicInfo口径", "available"),
        ("增值服务", "serviceName", "增值单汇总 / vaAtoms口径", "available"),
        ("服务编码", "serviceCode", "vaAtoms口径 / submitAttrs", "available"),
        ("场景 sceneOverviewName", "sceneOverviewName (+ sceneOverviewCode)", "vaAtoms口径 / 增值单汇总", "available"),
        ("客户需求原文", "requirementDescription (attr VAS_ATTR_REL_RD)", "vaAtoms口径 / submitAttrs", "available"),
        ("需求背景", "requirementBackground (attr BEOR)", "vaAtoms口径 / submitAttrs", "available"),
        ("SOP", "sop", "vaAtoms口径 / 增值单汇总", "available"),
        ("审核结果", "isAuditThrough + auditTrace.eventCode/newStatus", "增值单汇总 / auditTrace / basicInfo口径", "available"),
        ("退回原因", "auditTrace.eventContent / supplementDesc（审核不通过）", "auditTrace；汇总表 auditTraceSupplementDesc", "available"),
        ("原子属性", "submitAttrs（本文件仅见 VAS_ATTR_REL_RD / BEOR）", "submitAttrs", "partial"),
        ("上传附件", "独立附件列表/附件 token 列", "源表无独立附件列", "cannot_verify / not_available_in_source"),
        ("vasDes", "vasDes", "vaAtoms口径 / 增值单汇总", "not_available_in_source（全空）"),
    ]

    # scene distribution from atoms (one row ~ one atom/service)
    scene_cnt = Counter()
    scene_service = Counter()
    for _, r in atoms.iterrows():
        sc = cell(r.get("sceneOverviewName")) or "(空/未知)"
        sv = cell(r.get("serviceName")) or "(空)"
        scene_cnt[sc] += 1
        scene_service[(sc, sv)] += 1

    # audit result on main (order-level)
    order_events = defaultdict(list)
    for _, r in audit.iterrows():
        ono = cell(r.get("orderNo"))
        order_events[ono].append(
            {
                "eventCode": cell(r.get("eventCode")),
                "eventContent": cell(r.get("eventContent")),
                "supplementDesc": cell(r.get("supplementDesc")),
                "newStatus": cell(r.get("newStatus")),
                "oldStatus": cell(r.get("oldStatus")),
                "traceTime": cell(r.get("traceTime")),
            }
        )

    audit_result = Counter()
    reject_reason_counter = Counter()
    for _, r in main.iterrows():
        ono = cell(r.get("orderNo"))
        flag = cell(r.get("isAuditThrough"))
        status = cell(r.get("status"))
        events = order_events.get(ono, [])
        event_blob = " | ".join(
            f"{e['eventCode']}/{e['newStatus']}/{e['eventContent']}" for e in events
        ) or cell(r.get("auditTraceEventCode"))
        label = classify_audit_result(flag, status, event_blob)
        audit_result[label] += 1
        if label == "退回":
            # prefer fail eventContent
            reason = ""
            for e in events:
                if e["eventCode"] == "审核不通过" or e["newStatus"] == "REVIEW_FAILED":
                    reason = e["eventContent"] or e["supplementDesc"] or e["eventCode"]
                    break
            if not reason:
                reason = cell(r.get("auditTraceSupplementDesc")) or cell(r.get("auditTraceEventCode")) or "(empty)"
            reject_reason_counter[reason[:240] or "(empty)"] += 1

    # also count reject reasons from all REVIEW_FAILED rows (may > unique orders)
    reject_from_trace = Counter()
    for _, r in audit.iterrows():
        if cell(r.get("eventCode")) == "审核不通过" or cell(r.get("newStatus")) == "REVIEW_FAILED":
            reason = cell(r.get("eventContent")) or cell(r.get("supplementDesc")) or "(empty)"
            reject_from_trace[reason[:240]] += 1

    # SOP coverage on atoms
    sop_yes = int(nonempty_series(atoms["sop"]).sum())
    sop_no = len(atoms) - sop_yes
    sop_by_scene = []
    for sc, g in atoms.groupby(atoms["sceneOverviewName"].map(lambda x: cell(x) or "(空/未知)")):
        n = len(g)
        y = int(nonempty_series(g["sop"]).sum())
        sop_by_scene.append({"scene": sc, "n": n, "sop_yes": y, "sop_no": n - y, "rate": round(y / n, 4) if n else 0})
    sop_by_scene.sort(key=lambda x: (-x["n"], x["scene"]))

    # attachments
    # submitAttrs only RD/BEOR — no dedicated attachment attrs
    attr_key_cnt = Counter(cell(x) for x in attrs["attributeKey"])
    attr_name_cnt = Counter(cell(x) for x in attrs["attributeName"])
    explicit_file_rows = 0
    mention_orders = set()
    for _, r in attrs.iterrows():
        v = cell(r.get("attributeValue"))
        if looks_like_attachment_value(v):
            explicit_file_rows += 1
        if text_mentions_attachment(v):
            mention_orders.add(cell(r.get("orderNo")))
    # also scan atoms requirement/sop for mention
    for _, r in atoms.iterrows():
        blob = "\n".join(
            [
                cell(r.get("requirementDescription")),
                cell(r.get("requirementBackground")),
                cell(r.get("sop")),
            ]
        )
        if text_mentions_attachment(blob):
            mention_orders.add(cell(r.get("orderNo")))

    attachment_summary = {
        "status": "cannot_verify",
        "note": (
            "源表无独立 uploadedAttachments / fileList / attachmentToken 列。"
            "submitAttrs 仅有 VAS_ATTR_REL_RD、BEOR 两类提交属性；"
            "无法从本文件确认真实上传附件清单与类型。"
        ),
        "orders_with_attachment_mention_in_text": len(mention_orders),
        "submitAttrs_rows_with_explicit_file_url_or_token": explicit_file_rows,
        "submitAttrs_attributeKey_distribution": attr_key_cnt.most_common(),
        "submitAttrs_attributeName_distribution": attr_name_cnt.most_common(),
        "orders_with_submitAttrs": int(attrs["orderNo"].map(cell).nunique()),
        "main_orders": len(main),
        "orders_without_submitAttrs": len(main) - int(attrs["orderNo"].map(cell).nunique()),
    }

    # field fill main
    fill_main = []
    for c in main.columns:
        y = int(nonempty_series(main[c]).sum())
        fill_main.append(
            {
                "field": c,
                "filled": y,
                "empty": len(main) - y,
                "rate": round(y / len(main), 4) if len(main) else 0,
            }
        )
    fill_top20 = sorted(fill_main, key=lambda x: (-x["filled"], x["field"]))[:20]
    empty_top20 = sorted(fill_main, key=lambda x: (-x["empty"], x["field"]))[:20]

    # per-scene coverage on atoms for key fields
    key_fields = [
        "requirementDescription",
        "requirementBackground",
        "sceneOverviewName",
        "sceneOverviewCode",
        "serviceCode",
        "serviceName",
        "sop",
        "vasDes",
    ]
    top_scenes = [s for s, _ in scene_cnt.most_common(10)]
    scene_field_cov = []
    atoms2 = atoms.copy()
    atoms2["_scene"] = atoms2["sceneOverviewName"].map(lambda x: cell(x) or "(空/未知)")
    for sc in top_scenes:
        g = atoms2[atoms2["_scene"] == sc]
        row = {"scene": sc, "n": len(g)}
        for f in key_fields:
            if f in g.columns:
                row[f] = round(int(nonempty_series(g[f]).sum()) / len(g), 4) if len(g) else 0
            else:
                row[f] = "not_available_in_source"
        scene_field_cov.append(row)

    # status / isAuditThrough raw
    status_dist = Counter(cell(x).upper() for x in main["status"])
    flag_dist = Counter(cell(x).upper() or "(empty)" for x in main["isAuditThrough"])

    profile = {
        "generatedAt": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "source": str(XLSX),
        "source_rel": SOURCE_REL,
        "sheet_inventory": sheet_rows,
        "core_fields": core_fields,
        "scene_counts": scene_cnt.most_common(),
        "scene_service_counts": [
            {"scene": a, "service": b, "n": n} for (a, b), n in scene_service.most_common()
        ],
        "audit_result": audit_result.most_common(),
        "status_dist": status_dist.most_common(),
        "isAuditThrough_dist": flag_dist.most_common(),
        "reject_reason_top10_order_level": reject_reason_counter.most_common(10),
        "reject_reason_top10_trace_rows": reject_from_trace.most_common(10),
        "sop_coverage": {"yes": sop_yes, "no": sop_no, "total": len(atoms)},
        "sop_by_scene": sop_by_scene,
        "attachment_summary": attachment_summary,
        "fill_top20_main": fill_top20,
        "empty_top20_main": empty_top20,
        "scene_field_cov_top10": scene_field_cov,
        "stats_sheet": [
            {"metric": cell(r.iloc[0]), "value": cell(r.iloc[1])}
            for _, r in sheets["统计"].iterrows()
        ],
        "field_mapping": [
            {c: cell(r.get(c)) for c in sheets["字段映射"].columns}
            for _, r in sheets["字段映射"].iterrows()
        ],
        "top_scenes_for_sampling": top_scenes,
        "order_events": order_events,
    }
    return profile, main, atoms, attrs, audit, basic


def index_attrs(attrs: pd.DataFrame):
    by_order = defaultdict(list)
    for i, r in attrs.iterrows():
        ono = cell(r.get("orderNo"))
        by_order[ono].append(
            {
                "fieldName": cell(r.get("attributeName")),
                "fieldKey": cell(r.get("attributeKey")),
                "fieldValue": cell(r.get("attributeValue")),
                "inputNode": cell(r.get("inputNode")),
                "serviceCode": cell(r.get("serviceCode")),
                "serviceSequence": cell(r.get("serviceSequence")),
                "sourceSheet": "submitAttrs",
                "sourceRow": int(i) + 2,
            }
        )
    return by_order


def build_order_index(main: pd.DataFrame, profile):
    out = {}
    for i, r in main.iterrows():
        ono = cell(r.get("orderNo"))
        events = profile["order_events"].get(ono, [])
        event_blob = " | ".join(
            f"{e['eventCode']}/{e['newStatus']}/{e['eventContent']}" for e in events
        ) or cell(r.get("auditTraceEventCode"))
        reject = ""
        for e in events:
            if e["eventCode"] == "审核不通过" or e["newStatus"] == "REVIEW_FAILED":
                reject = e["eventContent"] or e["supplementDesc"]
                break
        if not reject and "审核不通过" in cell(r.get("auditTraceEventCode")):
            reject = cell(r.get("auditTraceSupplementDesc")) or cell(r.get("auditTraceEventCode"))
        out[ono] = {
            "mainRow": int(i) + 2,
            "status": cell(r.get("status")),
            "statusDesc": cell(r.get("statusDesc")),
            "isAuditThrough": cell(r.get("isAuditThrough")),
            "productName": cell(r.get("productName")),
            "productCode": cell(r.get("productCode")),
            "warehouseCode": cell(r.get("warehouseCode")),
            "warehouseName": cell(r.get("warehouseName")),
            "auditTraceEventCode": cell(r.get("auditTraceEventCode")),
            "auditTraceSupplementDesc": cell(r.get("auditTraceSupplementDesc")),
            "auditResult": classify_audit_result(
                cell(r.get("isAuditThrough")), cell(r.get("status")), event_blob
            ),
            "rejectReason": reject,
            "events": events,
        }
    return out


def candidate_rows(atoms: pd.DataFrame, order_idx: dict, attrs_by_order: dict, scene: str):
    rows = []
    for i, r in atoms.iterrows():
        sc = cell(r.get("sceneOverviewName")) or "(空/未知)"
        if sc != scene:
            continue
        ono = cell(r.get("orderNo"))
        oi = order_idx.get(ono, {})
        desc = cell(r.get("requirementDescription"))
        bg = cell(r.get("requirementBackground"))
        sop = cell(r.get("sop"))
        attrs = attrs_by_order.get(ono, [])
        reject = oi.get("rejectReason", "")
        audit_result = oi.get("auditResult", "其他/未知")
        mentions_att = text_mentions_attachment("\n".join([desc, bg, sop]))
        explicit_att = any(looks_like_attachment_value(a["fieldValue"]) for a in attrs)
        boundary_tags = []
        if len(sop) >= 400:
            boundary_tags.append("SOP很长或很复杂")
        if is_vague_requirement(desc):
            boundary_tags.append("需求描述很模糊")
        if mentions_att and not explicit_att:
            boundary_tags.append("文本提及附件但源表无附件记录")
        if audit_result == "通过" and not mentions_att and not explicit_att and len(desc) > 20:
            boundary_tags.append("无附件记录但仍通过")
        if audit_result == "退回":
            cat = reject_reason_category(reject)
            if cat != "需求描述不清晰":
                boundary_tags.append(f"退回原因={cat}")
            if cat == "可能应走标准增值":
                boundary_tags.append("可能应走标准增值")
            if cat == "仓库无法支持":
                boundary_tags.append("仓库无法支持")
            if cat == "场景不符":
                boundary_tags.append("场景不符")
        if not attrs:
            boundary_tags.append("无 submitAttrs 记录/字段不完整")
        rows.append(
            {
                "atomsRow": int(i) + 2,
                "orderNo": ono,
                "scene": sc,
                "serviceCode": cell(r.get("serviceCode")),
                "serviceName": cell(r.get("serviceName")),
                "productName": oi.get("productName", ""),
                "desc": desc,
                "bg": bg,
                "sop": sop,
                "vasDes": cell(r.get("vasDes")),
                "auditResult": audit_result,
                "rejectReason": reject,
                "finalStatus": oi.get("status", ""),
                "isAuditThrough": oi.get("isAuditThrough", ""),
                "attrs": attrs,
                "mentions_att": mentions_att,
                "explicit_att": explicit_att,
                "boundary_tags": boundary_tags,
                "mainRow": oi.get("mainRow"),
                "events": oi.get("events", []),
                "warehouseName": oi.get("warehouseName", ""),
                "auditTraceSupplementDesc": oi.get("auditTraceSupplementDesc", ""),
            }
        )
    return rows


def pick_samples_for_scene(cands: list[dict], scene: str) -> list[dict]:
    used = set()
    picked = []

    def take(row, why: str, slot: str):
        key = (row["orderNo"], row["atomsRow"])
        if key in used:
            return False
        used.add(key)
        item = dict(row)
        item["why"] = why
        item["slot"] = slot
        picked.append(item)
        return True

    # 1 pass
    passes = [c for c in cands if c["auditResult"] == "通过"]
    passes_ranked = sorted(
        passes,
        key=lambda c: (
            0 if c["desc"] else 1,
            0 if c["sop"] else 1,
            -len(c["desc"]),
            c["orderNo"],
        ),
    )
    if passes_ranked:
        take(passes_ranked[0], "审核通过样本：有审核通过信号，便于对照期望输出路径", "通过")

    # 2 reject
    rejects = [c for c in cands if c["auditResult"] == "退回"]
    rejects_ranked = sorted(
        rejects,
        key=lambda c: (
            0 if c["rejectReason"] else 1,
            -len(c["rejectReason"]),
            c["orderNo"],
        ),
    )
    if rejects_ranked:
        take(rejects_ranked[0], "退回样本：存在审核不通过轨迹，便于标注 fail/unsupported 路径", "退回")

    # 3 boundary
    boundaries = [c for c in cands if c["boundary_tags"]]
    # prefer unused
    boundaries = [c for c in boundaries if (c["orderNo"], c["atomsRow"]) not in used]
    # diversify
    def boundary_score(c):
        tags = c["boundary_tags"]
        score = 0
        preferred = [
            "SOP很长或很复杂",
            "需求描述很模糊",
            "文本提及附件但源表无附件记录",
            "无附件记录但仍通过",
            "可能应走标准增值",
            "仓库无法支持",
            "场景不符",
            "退回原因=其他退回原因",
            "无 submitAttrs 记录/字段不完整",
        ]
        for i, p in enumerate(preferred):
            if any(p in t or t == p for t in tags):
                score += 100 - i
        score += min(len(c["sop"]) // 50, 20)
        return -score

    boundaries_ranked = sorted(boundaries, key=lambda c: (boundary_score(c), c["orderNo"]))
    if boundaries_ranked:
        c = boundaries_ranked[0]
        take(c, "边界样本：" + "；".join(c["boundary_tags"][:4]), "边界")
    else:
        # fallback any unused with longest desc/sop
        rest = [c for c in cands if (c["orderNo"], c["atomsRow"]) not in used]
        rest = sorted(rest, key=lambda c: (-(len(c["desc"]) + len(c["sop"])), c["orderNo"]))
        if rest:
            take(rest[0], "边界样本（弱）：该场景缺少典型边界特征，取信息量较高的剩余样本", "边界")

    # if still <3, fill with remaining diverse audit results
    if len(picked) < 3:
        for c in sorted(cands, key=lambda x: (x["auditResult"], -len(x["desc"]), x["orderNo"])):
            if len(picked) >= 3:
                break
            take(
                c,
                f"补足样本：该场景可抽样不足，补入 auditResult={c['auditResult']}",
                "补足",
            )

    note = ""
    if len(cands) < 3:
        note = f"场景「{scene}」候选仅 {len(cands)} 条，不足 3 条。"
    elif len(picked) < 3:
        note = f"场景「{scene}」仅抽到 {len(picked)} 条（通过/退回/边界类别覆盖不足）。"
    return picked, note


def make_sample_obj(sample_id: str, row: dict) -> dict:
    attachments = []
    att_status = "cannot_verify"
    # explicit file-like attr values (rare/none expected)
    for a in row["attrs"]:
        if looks_like_attachment_value(a["fieldValue"]):
            attachments.append(
                {
                    "attachmentName": a["fieldName"] or "unknown",
                    "attachmentType": infer_attachment_type(a["fieldName"], a["fieldValue"]),
                    "attachmentTokenOrUrl": a["fieldValue"][:300],
                    "source": f"submitAttrs#{a['sourceRow']}",
                }
            )
            att_status = "heuristic_from_attr_value"
    if not attachments:
        if row["mentions_att"]:
            attachments.append(
                {
                    "attachmentName": "cannot_verify",
                    "attachmentType": "unknown",
                    "attachmentTokenOrUrl": "cannot_verify",
                    "source": "text_mention_only_no_attachment_column",
                }
            )
        else:
            attachments.append(
                {
                    "attachmentName": "not_available_in_source",
                    "attachmentType": "unknown",
                    "attachmentTokenOrUrl": "not_available_in_source",
                    "source": "no_attachment_column_in_workbook",
                }
            )

    submitted = [
        {
            "fieldName": a["fieldName"],
            "fieldKey": a["fieldKey"],
            "fieldValue": a["fieldValue"],
            "inputNode": a["inputNode"] or "unknown",
        }
        for a in row["attrs"]
    ]
    # if no attrs but requirement exists on atoms, surface as derived view
    if not submitted and (row["desc"] or row["bg"]):
        if row["desc"]:
            submitted.append(
                {
                    "fieldName": "需求描述",
                    "fieldKey": "VAS_ATTR_REL_RD",
                    "fieldValue": row["desc"],
                    "inputNode": "unknown",
                    "note": "来自 vaAtoms口径.requirementDescription；submitAttrs 无该单行",
                }
            )
        if row["bg"]:
            submitted.append(
                {
                    "fieldName": "需求背景说明",
                    "fieldKey": "BEOR",
                    "fieldValue": row["bg"],
                    "inputNode": "unknown",
                    "note": "来自 vaAtoms口径.requirementBackground；submitAttrs 无该单行",
                }
            )

    return {
        "sampleId": sample_id,
        "vascNo": row["orderNo"],
        "sceneOverviewName": row["scene"],
        "serviceCode": row["serviceCode"] or "unknown",
        "serviceName": row["serviceName"] or "unknown",
        "productName": row["productName"] or "unknown",
        "warehouseName": row.get("warehouseName") or "unknown",
        "auditResult": row["auditResult"],
        "rejectReason": row["rejectReason"] or "",
        "finalStatus": row["finalStatus"] or "unknown",
        "isAuditThrough": row.get("isAuditThrough") or "",
        "customerRequirementRaw": row["desc"] or "",
        "requirementBackground": row["bg"] or "",
        "submittedFields": submitted,
        "uploadedAttachments": attachments,
        "attachmentVerificationStatus": att_status if attachments and att_status != "cannot_verify" else "cannot_verify",
        "sopRaw": row["sop"] or "",
        "vasDes": row["vasDes"] or "not_available_in_source",
        "auditTraceSupplementDesc": row.get("auditTraceSupplementDesc") or "",
        "auditEvents": row.get("events") or [],
        "whyThisSample": row["why"],
        "sampleSlot": row["slot"],
        "boundaryTags": row.get("boundary_tags") or [],
        "questionsForHumanLabeling": HUMAN_QUESTIONS,
        "humanLabelPlaceholder": LABEL_PLACEHOLDER,
        "provenance": {
            "sourceFile": SOURCE_REL,
            "atomsSheet": "vaAtoms口径",
            "atomsRow": row["atomsRow"],
            "mainSheet": "增值单汇总",
            "mainRow": row.get("mainRow"),
            "submitAttrsRows": [a["sourceRow"] for a in row["attrs"]],
        },
    }


def write_data_profile_md(profile: dict, sample_meta: dict):
    lines = []
    a = lines.append
    a("# 非标增值历史数据画像（事实探索）")
    a("")
    a(f"- 生成时间：`{profile['generatedAt']}`")
    a(f"- 源文件：`{profile['source_rel']}`")
    a("- 本阶段仅做数据探索与标注辅助，**未**生成场景规则集 / Eval 样本集 / SOP 案例库 / workflow 规则。")
    a("- 抽样主表口径：`vaAtoms口径`（含 serviceCode / scene）；审核口径：`auditTrace` + `增值单汇总.isAuditThrough`。")
    a("")
    a("## 1. Sheet 清单")
    a("")
    a("| sheet | 行数 | 列数 | 字段列表 |")
    a("|---|---:|---:|---|")
    for s in profile["sheet_inventory"]:
        cols = ", ".join(f"`{c}`" for c in s["columns"])
        a(f"| {s['sheet']} | {s['rows']} | {s['cols']} | {cols} |")
    a("")
    a("## 2. 核心字段识别")
    a("")
    a("| 业务含义 | 源字段 | 所在 sheet | 状态 |")
    a("|---|---|---|---|")
    for name, field, where, status in profile["core_fields"]:
        a(f"| {name} | `{field}` | {where} | `{status}` |")
    a("")
    a("### 字段映射（源表自带）")
    a("")
    a("| fieldGroup | apiField | factSource |")
    a("|---|---|---|")
    for r in profile["field_mapping"]:
        a(f"| {r.get('fieldGroup','')} | {r.get('apiField','')} | {r.get('factSource','')} |")
    a("")
    a("## 3. 场景分布（`vaAtoms口径`）")
    a("")
    a("| sceneOverviewName | 数量 |")
    a("|---|---:|")
    for sc, n in profile["scene_counts"][:30]:
        a(f"| {sc} | {n} |")
    a("")
    a(f"场景种类数（含空/未知）：**{len(profile['scene_counts'])}**；原子行合计：**{profile['sop_coverage']['total']}**。")
    a("")
    a("### sceneOverviewName × serviceName（Top 40）")
    a("")
    a("| sceneOverviewName | serviceName | 数量 |")
    a("|---|---|---:|")
    for r in profile["scene_service_counts"][:40]:
        a(f"| {r['scene']} | {r['service']} | {r['n']} |")
    a("")
    a("## 4. 审核结果分布（订单级，`增值单汇总`）")
    a("")
    a("分类规则（探索口径，供人工复核）：")
    a("")
    a("1. **退回**：`auditTrace` 出现 `审核不通过` / `REVIEW_FAILED`")
    a("2. **通过**：`isAuditThrough=Y`，或轨迹含审核通过且无审核不通过")
    a("3. **取消**：`status=CD` 或轨迹含取消订单，且未判为退回/通过")
    a("4. **其他/未知**：其余（含无轨迹、ES 异常终止等）")
    a("")
    a("| 审核结果 | 数量 |")
    a("|---|---:|")
    for k, n in profile["audit_result"]:
        a(f"| {k} | {n} |")
    a("")
    a("| status | 数量 |")
    a("|---|---:|")
    for k, n in profile["status_dist"]:
        a(f"| {k} | {n} |")
    a("")
    a("| isAuditThrough | 数量 |")
    a("|---|---:|")
    for k, n in profile["isAuditThrough_dist"]:
        a(f"| {k} | {n} |")
    a("")
    a("> 注：本文件中 `isAuditThrough=N` 的订单 `status` 多为 `CD`（取消）。退回信号更可靠的来源是 `auditTrace` 的审核不通过事件。")
    a("")
    a("## 5. 退回原因 Top 10")
    a("")
    a("### 5.1 订单级（每单取第一条审核不通过的 eventContent）")
    a("")
    a("| 退回原因 | 数量 |")
    a("|---|---:|")
    if profile["reject_reason_top10_order_level"]:
        for reason, n in profile["reject_reason_top10_order_level"]:
            safe = reason.replace("|", "\\|")
            a(f"| {safe} | {n} |")
    else:
        a("| （无） | 0 |")
    a("")
    a("### 5.2 轨迹行级（`auditTrace` 中审核不通过行）")
    a("")
    a("| 退回原因 | 数量 |")
    a("|---|---:|")
    for reason, n in profile["reject_reason_top10_trace_rows"]:
        safe = reason.replace("|", "\\|")
        a(f"| {safe} | {n} |")
    a("")
    a("## 6. SOP 覆盖情况（`vaAtoms口径`）")
    a("")
    a("| 指标 | 数量 |")
    a("|---|---:|")
    a(f"| 有 SOP | {profile['sop_coverage']['yes']} |")
    a(f"| 无 SOP | {profile['sop_coverage']['no']} |")
    a(f"| 合计 | {profile['sop_coverage']['total']} |")
    a("")
    a("### 按场景 SOP 覆盖率（按样本量排序，前 25）")
    a("")
    a("| sceneOverviewName | 样本量 | 有SOP | 无SOP | 覆盖率 |")
    a("|---|---:|---:|---:|---:|")
    for r in profile["sop_by_scene"][:25]:
        a(f"| {r['scene']} | {r['n']} | {r['sop_yes']} | {r['sop_no']} | {r['rate']:.2%} |")
    a("")
    a("## 7. 附件覆盖情况")
    a("")
    att = profile["attachment_summary"]
    a(f"- 总体结论：`{att['status']}`")
    a(f"- 说明：{att['note']}")
    a("")
    a("| 指标 | 值 |")
    a("|---|---|")
    a(f"| 有独立附件列 | `not_available_in_source` |")
    a(f"| 能确认的“有附件单量” | `cannot_verify` |")
    a(f"| 能确认的“无附件单量” | `cannot_verify` |")
    a(f"| 文本中提及附件的订单数（启发式） | {att['orders_with_attachment_mention_in_text']} |")
    a(f"| submitAttrs 中疑似文件 URL/token 的行数 | {att['submitAttrs_rows_with_explicit_file_url_or_token']} |")
    a(f"| 有 submitAttrs 的订单数 | {att['orders_with_submitAttrs']} |")
    a(f"| 无 submitAttrs 的订单数（相对汇总 968） | {att['orders_without_submitAttrs']} |")
    a("")
    a("### submitAttrs 属性分布（即本文件可见的“原子属性”）")
    a("")
    a("| attributeKey | 次数 |")
    a("|---|---:|")
    for k, n in att["submitAttrs_attributeKey_distribution"]:
        a(f"| `{k}` | {n} |")
    a("")
    a("| attributeName | 次数 |")
    a("|---|---:|")
    for k, n in att["submitAttrs_attributeName_distribution"]:
        a(f"| {k} | {n} |")
    a("")
    a("## 8. 字段填写情况（`增值单汇总`）")
    a("")
    a("### 高频填写字段 Top 20")
    a("")
    a("| 字段 | 已填 | 空 | 覆盖率 |")
    a("|---|---:|---:|---:|")
    for r in profile["fill_top20_main"]:
        a(f"| `{r['field']}` | {r['filled']} | {r['empty']} | {r['rate']:.2%} |")
    a("")
    a("### 高频空字段 Top 20")
    a("")
    a("| 字段 | 已填 | 空 | 覆盖率 |")
    a("|---|---:|---:|---:|")
    for r in profile["empty_top20_main"]:
        a(f"| `{r['field']}` | {r['filled']} | {r['empty']} | {r['rate']:.2%} |")
    a("")
    a("### Top10 场景关键字段覆盖率（`vaAtoms口径`）")
    a("")
    header = (
        "| scene | n | requirementDescription | requirementBackground | sceneOverviewName | "
        "serviceCode | serviceName | sop | vasDes |"
    )
    a(header)
    a("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for r in profile["scene_field_cov_top10"]:
        def fmt(v):
            if isinstance(v, float):
                return f"{v:.2%}"
            return str(v)

        a(
            f"| {r['scene']} | {r['n']} | {fmt(r['requirementDescription'])} | {fmt(r['requirementBackground'])} | "
            f"{fmt(r['sceneOverviewName'])} | {fmt(r['serviceCode'])} | {fmt(r['serviceName'])} | "
            f"{fmt(r['sop'])} | {fmt(r['vasDes'])} |"
        )
    a("")
    a("## 9. 源表自带统计（`统计` sheet）")
    a("")
    a("| metric | value |")
    a("|---|---|")
    for r in profile["stats_sheet"]:
        a(f"| {r['metric']} | {r['value']} |")
    a("")
    a("## 10. 数据缺口")
    a("")
    a("1. **上传附件**：`not_available_in_source` / `cannot_verify`。无附件清单、类型、token 列；只能从需求文本看到“见附件”等字样。")
    a("2. **vasDes**：源表字段存在但全空 → `not_available_in_source`。")
    a("3. **完整原子属性**：`submitAttrs` 仅有需求描述/需求背景；其他属性（如入库单号、标签文件等）本文件未展开。")
    a("4. **场景空值**：约 303 条原子行 `sceneOverviewName` 为空，需单独作为一类人工看。")
    a("5. **审核结果口径混杂**：通过/退回/取消在 `isAuditThrough`、`status`、`auditTrace` 三者间不完全一一对应。")
    a("6. **直连 API**：统计页写明 `not_called_missing_openapi_credentials`，事实来自 DB mirror。")
    a("")
    a("## 11. 本轮抽样摘要")
    a("")
    a(f"- 抽样场景数：{sample_meta['scene_count']}")
    a(f"- 样本条数：{sample_meta['sample_count']}")
    a(f"- 场景列表：{', '.join(sample_meta['scenes'])}")
    for note in sample_meta.get("notes", []):
        a(f"- 备注：{note}")
    a("")
    a("## 12. 后续人工核准事项")
    a("")
    a("1. 确认审核结果分类规则（尤其是 `isAuditThrough=N` + `status=CD` 是否一律算退回后取消）。")
    a("2. 确认空场景 `(空/未知)` 是否纳入后续 ground truth 建设。")
    a("3. 确认附件是否需要另接 API/对象存储；本文件无法作为附件完备性证据。")
    a("4. 对 `sample-cases-readable.md` 中每条样本填写 `humanLabelPlaceholder`。")
    a("5. 标注时重点回答：check-requirement / match-template / check-completeness / sop_generated / expectedOutputPath。")
    a("")
    (OUT / "data-profile.md").write_text("\n".join(lines), encoding="utf-8")


def write_readable_md(samples: list[dict], notes: list[str]):
    lines = []
    a = lines.append
    a("# 人工标注辅助样本（可读版）")
    a("")
    a("- 用途：人工阅读后标注 pipeline 各节点期望输出。")
    a("- **不是** eval gold / 场景规则 / SOP 案例库。")
    a(f"- 样本数：{len(samples)}")
    if notes:
        a("- 抽样备注：")
        for n in notes:
            a(f"  - {n}")
    a("")
    for s in samples:
        a(f"## {s['sampleId']} · {s['vascNo']}")
        a("")
        a(f"- 场景：{s['sceneOverviewName']}")
        a(f"- 服务：`{s['serviceCode']}` / {s['serviceName']}")
        a(f"- 产品：{s['productName']}")
        a(f"- 仓库：{s.get('warehouseName')}")
        a(f"- 审核结果：{s['auditResult']}")
        a(f"- 退回原因：{s['rejectReason'] or '（无）'}")
        a(f"- 最终状态 finalStatus：`{s['finalStatus']}` / isAuditThrough=`{s.get('isAuditThrough')}`")
        a(f"- 抽样槽位：{s.get('sampleSlot')}；原因：{s['whyThisSample']}")
        if s.get("boundaryTags"):
            a(f"- 边界标签：{'；'.join(s['boundaryTags'])}")
        prov = s["provenance"]
        a(
            f"- 溯源：`{prov['sourceFile']}` · atoms `{prov['atomsSheet']}#row{prov['atomsRow']}` · "
            f"main `{prov['mainSheet']}#row{prov.get('mainRow')}` · submitAttrs rows={prov.get('submitAttrsRows')}"
        )
        a(f"- 附件核验状态：`{s.get('attachmentVerificationStatus')}`")
        a("")
        a("### 客户需求原文")
        a("")
        a(fence(s.get("customerRequirementRaw") or "（空）"))
        a("")
        a("### 需求背景")
        a("")
        a(fence(s.get("requirementBackground") or "（空）"))
        a("")
        a("### 已填写字段")
        a("")
        if s.get("submittedFields"):
            a("| fieldName | fieldKey | inputNode | fieldValue |")
            a("|---|---|---|---|")
            for f in s["submittedFields"]:
                val = md_escape(f.get("fieldValue") or "").replace("|", "\\|")
                if len(val) > 500:
                    val = val[:500] + "…"
                note = f.get("note")
                name = f.get("fieldName") or ""
                if note:
                    name = f"{name}（{note}）"
                a(f"| {name} | `{f.get('fieldKey')}` | {f.get('inputNode')} | {val} |")
            a("")
            a("<details><summary>字段全文</summary>")
            a("")
            for f in s["submittedFields"]:
                a(f"#### {f.get('fieldName')} (`{f.get('fieldKey')}`)")
                a("")
                a(fence(f.get("fieldValue") or "（空）"))
                a("")
            a("</details>")
        else:
            a("（无 submitAttrs，且 atoms 需求字段为空）")
        a("")
        a("### 已上传附件")
        a("")
        a("| attachmentName | type | token/url | source |")
        a("|---|---|---|---|")
        for att in s.get("uploadedAttachments") or []:
            a(
                f"| {att.get('attachmentName')} | {att.get('attachmentType')} | "
                f"{att.get('attachmentTokenOrUrl')} | {att.get('source')} |"
            )
        a("")
        a("### SOP 原文")
        a("")
        a(fence(s.get("sopRaw") or "（空）"))
        a("")
        a("### vasDes / 审核补充")
        a("")
        a(f"- vasDes：`{s.get('vasDes')}`")
        a("")
        a(fence(s.get("auditTraceSupplementDesc") or "（空）"))
        a("")
        if s.get("auditEvents"):
            a("### 审核轨迹（摘要）")
            a("")
            a("| eventCode | newStatus | eventContent | supplementDesc |")
            a("|---|---|---|---|")
            for e in s["auditEvents"]:
                a(
                    f"| {e.get('eventCode')} | {e.get('newStatus')} | "
                    f"{(e.get('eventContent') or '').replace('|','\\|')} | "
                    f"{(e.get('supplementDesc') or '').replace('|','\\|')[:120]} |"
                )
            a("")
        a("### 需要人工判断的问题")
        a("")
        for q in s.get("questionsForHumanLabeling") or []:
            a(f"- {q}")
        a("")
        a("---")
        a("")
    (OUT / "sample-cases-readable.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    names, sheets = load_workbook()
    profile, main, atoms, attrs, audit, basic = build_profile(names, sheets)
    attrs_by_order = index_attrs(attrs)
    order_idx = build_order_index(main, profile)

    top_scenes = profile["top_scenes_for_sampling"]
    samples = []
    notes = []
    sid = 1
    for scene in top_scenes:
        cands = candidate_rows(atoms, order_idx, attrs_by_order, scene)
        picked, note = pick_samples_for_scene(cands, scene)
        if note:
            notes.append(note)
        if not picked:
            notes.append(f"场景「{scene}」无可抽样候选。")
            continue
        # coverage note
        has_pass = any(p["slot"] == "通过" for p in picked)
        has_rej = any(p["slot"] == "退回" for p in picked)
        if not has_pass:
            notes.append(f"场景「{scene}」缺少审核通过样本（该场景可能无通过单）。")
        if not has_rej:
            notes.append(f"场景「{scene}」缺少退回样本（该场景可能无审核不通过轨迹）。")
        for p in picked:
            samples.append(make_sample_obj(f"S{sid:03d}", p))
            sid += 1

    sample_meta = {
        "scene_count": len(top_scenes),
        "sample_count": len(samples),
        "scenes": top_scenes,
        "notes": notes,
    }

    # drop huge order_events from profile dump used for md
    profile_for_md = dict(profile)
    # keep order_events only in intermediate if needed; strip for json sidecar lightness? keep for sampling already done
    profile_light = {k: v for k, v in profile.items() if k != "order_events"}

    write_data_profile_md(profile_for_md, sample_meta)
    write_readable_md(samples, notes)

    payload = {
        "meta": {
            "generatedAt": profile["generatedAt"],
            "source": SOURCE_REL,
            "purpose": "human_labeling_aid_only",
            "notGenerated": [
                "scene_rule_candidates",
                "eval_cases",
                "sop_case_library",
                "workflow_input_rules",
            ],
            "sceneCount": sample_meta["scene_count"],
            "sampleCount": sample_meta["sample_count"],
            "topScenes": top_scenes,
            "notes": notes,
        },
        "samples": samples,
    }
    (OUT / "sample-cases.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT / "_profile_stats.json").write_text(
        json.dumps(profile_light, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # summary stdout
    summary = {
        "out_dir": str(OUT),
        "files": ["data-profile.md", "sample-cases.json", "sample-cases-readable.md"],
        "audit_result": profile["audit_result"],
        "scene_top10": profile["scene_counts"][:10],
        "sop": profile["sop_coverage"],
        "attachment": {
            "status": profile["attachment_summary"]["status"],
            "mention_orders": profile["attachment_summary"]["orders_with_attachment_mention_in_text"],
            "explicit_file_rows": profile["attachment_summary"]["submitAttrs_rows_with_explicit_file_url_or_token"],
        },
        "sample_count": len(samples),
        "scene_count": len(top_scenes),
        "notes": notes,
        "reject_top5": profile["reject_reason_top10_trace_rows"][:5],
    }
    (OUT / "_run_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
