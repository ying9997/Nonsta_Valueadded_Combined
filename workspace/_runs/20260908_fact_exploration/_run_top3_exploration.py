# coding: utf-8
"""Focused fact exploration: data profile + TOP3 scene samples."""
from __future__ import annotations

import json
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

TARGET_SCENES = [
    {
        "code": "20250407004",
        "name": "【入库】尺重/标签辨识后换标上架",
        "label": "F-001 / 尺重换标",
    },
    {
        "code": "20250407008",
        "name": "【入库】包裹类异常换商品标签上架",
        "label": "A / 包裹异常换标",
    },
    {
        "code": "20250522001",
        "name": "【入库】指定商品拍照暂存",
        "label": "B / 拍照暂存",
    },
]

QUESTIONS = [
    "这条单在 check-requirement 应该 pass 还是 fail？",
    "match-template 应该判 supported/unsupported/ambiguous？",
    "如果判 supported，check-completeness 应该缺什么？",
]


def cell(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, datetime):
        return v.isoformat(sep=" ", timespec="seconds")
    s = str(v).replace("\xa0", " ").strip()
    if s.lower() in {"nan", "none", "nat"}:
        return ""
    return s


def nn(series: pd.Series) -> pd.Series:
    return series.map(cell).ne("")


def fence(text: str) -> str:
    body = (text or "（空）").replace("\r\n", "\n").replace("\r", "\n")
    m = "````" if "```" in body else "```"
    return f"{m}text\n{body}\n{m}"


def classify_audit(flag: str, status: str, event_blob: str) -> str:
    blob = event_blob or ""
    if "审核不通过" in blob or "REVIEW_FAILED" in blob:
        return "退回"
    if (flag or "").upper() == "Y" or ("审核通过" in blob and "审核不通过" not in blob):
        return "通过"
    if (status or "").upper() == "CD" or "取消订单" in blob:
        return "取消"
    return "其他"


def text_mentions_attachment(text: str) -> bool:
    return any(x in (text or "") for x in ["附件", "上传", "见附图", "见图片", "标签文件", "见截图", "照片见"])


def looks_like_file(value: str) -> bool:
    v = value or ""
    if re.search(r"https?://", v, re.I):
        return True
    if re.search(r"\.(pdf|xlsx?|docx?|jpe?g|png|zip)\b", v, re.I) and re.search(
        r"[/\\]|https?://|[0-9a-f]{32}", v, re.I
    ):
        return True
    if re.fullmatch(r"[0-9a-f]{32}(?:\.[A-Za-z0-9]+)?", v.strip(), re.I):
        return True
    return False


def is_vague(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 12:
        return True
    keys = ("帮忙处理", "请处理", "处理一下", "看一下", "看下这个单", "按客户要求", "尽快处理")
    return any(k in t for k in keys) and len(t) < 40


def reject_cat(reason: str) -> str:
    r = reason or ""
    if any(x in r for x in ["需求描述不清", "描述不清楚", "联系客服", "线下与客服"]):
        return "需求描述不清晰"
    if "标准增值" in r:
        return "可能应走标准增值"
    if any(x in r for x in ["仓库暂时无法", "无法提供该服务"]):
        return "仓库无法支持"
    if "场景不符" in r:
        return "场景不符"
    return "其他退回原因"


def load():
    xl = pd.ExcelFile(XLSX)
    sheets = {n: pd.read_excel(XLSX, sheet_name=n, dtype=object) for n in xl.sheet_names}
    return xl.sheet_names, sheets


def build_events(audit: pd.DataFrame):
    by = defaultdict(list)
    for _, r in audit.iterrows():
        ono = cell(r.get("orderNo"))
        by[ono].append(
            {
                "eventCode": cell(r.get("eventCode")),
                "eventContent": cell(r.get("eventContent")),
                "supplementDesc": cell(r.get("supplementDesc")),
                "newStatus": cell(r.get("newStatus")),
                "traceTime": cell(r.get("traceTime")),
            }
        )
    return by


def order_audit_map(main: pd.DataFrame, events):
    out = {}
    for i, r in main.iterrows():
        ono = cell(r.get("orderNo"))
        ev = events.get(ono, [])
        blob = " | ".join(f"{e['eventCode']}/{e['newStatus']}/{e['eventContent']}" for e in ev) or cell(
            r.get("auditTraceEventCode")
        )
        reject = ""
        for e in ev:
            if e["eventCode"] == "审核不通过" or e["newStatus"] == "REVIEW_FAILED":
                reject = e["eventContent"] or e["supplementDesc"]
                break
        out[ono] = {
            "mainRow": int(i) + 2,
            "status": cell(r.get("status")),
            "isAuditThrough": cell(r.get("isAuditThrough")),
            "productName": cell(r.get("productName")),
            "warehouseName": cell(r.get("warehouseName")),
            "auditResult": classify_audit(cell(r.get("isAuditThrough")), cell(r.get("status")), blob),
            "rejectReason": reject,
            "events": ev,
            "auditTraceSupplementDesc": cell(r.get("auditTraceSupplementDesc")),
        }
    return out


def index_attrs(attrs: pd.DataFrame):
    by = defaultdict(list)
    for i, r in attrs.iterrows():
        by[cell(r.get("orderNo"))].append(
            {
                "fieldName": cell(r.get("attributeName")),
                "fieldKey": cell(r.get("attributeKey")),
                "fieldValue": cell(r.get("attributeValue")),
                "inputNode": cell(r.get("inputNode")),
                "sourceRow": int(i) + 2,
            }
        )
    return by


def write_profile(names, sheets, order_map, events, attrs_by_order):
    main = sheets["增值单汇总"]
    atoms = sheets["vaAtoms口径"]
    attrs = sheets["submitAttrs"]
    audit = sheets["auditTrace"]

    lines = []
    a = lines.append
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    a("# 历史增值单数据画像（探索报告）")
    a("")
    a(f"- 生成时间：`{now}`")
    a(f"- 源文件：`{SOURCE_REL}`")
    a("- 本阶段只做探索与标注辅助，**不**生成场景规则 / Eval / SOP 库 / workflow 规则。")
    a("- 本轮抽样范围：用户指定 TOP3 场景（按 `sceneOverviewCode`）。")
    a("")
    a("## 汇总表")
    a("")
    # overall stats
    scene_cnt = Counter(cell(x) or "(空/未知)" for x in atoms["sceneOverviewName"])
    audit_cnt = Counter(v["auditResult"] for v in order_map.values())
    sop_yes = int(nn(atoms["sop"]).sum())
    sop_no = len(atoms) - sop_yes
    mention_orders = set()
    explicit_file_rows = 0
    for _, r in attrs.iterrows():
        v = cell(r.get("attributeValue"))
        if looks_like_file(v):
            explicit_file_rows += 1
        if text_mentions_attachment(v):
            mention_orders.add(cell(r.get("orderNo")))
    for _, r in atoms.iterrows():
        blob = "\n".join([cell(r.get("requirementDescription")), cell(r.get("requirementBackground")), cell(r.get("sop"))])
        if text_mentions_attachment(blob):
            mention_orders.add(cell(r.get("orderNo")))

    a("| 指标 | 值 |")
    a("|---|---|")
    a(f"| sheet 数 | {len(names)} |")
    a(f"| 增值单汇总行数（订单） | {len(main)} |")
    a(f"| vaAtoms口径行数（原子/服务） | {len(atoms)} |")
    a(f"| submitAttrs 行数 | {len(attrs)} |")
    a(f"| auditTrace 行数 | {len(audit)} |")
    a(f"| 场景种类数（含空） | {len(scene_cnt)} |")
    a(f"| 审核-通过 | {audit_cnt.get('通过', 0)} |")
    a(f"| 审核-退回 | {audit_cnt.get('退回', 0)} |")
    a(f"| 审核-取消 | {audit_cnt.get('取消', 0)} |")
    a(f"| 审核-其他 | {audit_cnt.get('其他', 0)} |")
    a(f"| SOP 有填写 | {sop_yes}（{sop_yes/len(atoms):.1%}） |")
    a(f"| SOP 未填写 | {sop_no}（{sop_no/len(atoms):.1%}） |")
    a(f"| 附件上传率（可确认） | `cannot_verify`（源表无独立附件列） |")
    a(f"| 文本提及附件的订单数（启发式） | {len(mention_orders)} |")
    a(f"| submitAttrs 疑似文件 URL/token 行 | {explicit_file_rows} |")
    a("")
    a("### TOP3 场景覆盖（抽样目标）")
    a("")
    a("| 场景码 | 场景名 | 原子行数 | 有SOP | SOP率 | 需求描述有值 | 退回单数* |")
    a("|---|---|---:|---:|---:|---:|---:|")
    for t in TARGET_SCENES:
        g = atoms[atoms["sceneOverviewCode"].map(cell) == t["code"]]
        if g.empty:
            g = atoms[atoms["sceneOverviewName"].map(cell) == t["name"]]
        n = len(g)
        sy = int(nn(g["sop"]).sum()) if n else 0
        rd = int(nn(g["requirementDescription"]).sum()) if n else 0
        rej = 0
        for _, r in g.iterrows():
            if order_map.get(cell(r.get("orderNo")), {}).get("auditResult") == "退回":
                rej += 1
        a(
            f"| `{t['code']}` | {t['name']} | {n} | {sy} | "
            f"{(sy/n if n else 0):.1%} | {rd} | {rej} |"
        )
    a("")
    a("\\*退回单数按订单审核轨迹含「审核不通过」统计（同一单多原子可能重复计到不同场景行）。")
    a("")
    a("## 1. 所有 sheet 与字段")
    a("")
    a("| sheet | 行数 | 列数 | 字段 |")
    a("|---|---:|---:|---|")
    for name in names:
        df = sheets[name]
        cols = ", ".join(f"`{c}`" for c in df.columns)
        a(f"| {name} | {len(df)} | {len(df.columns)} | {cols} |")
    a("")
    a("### 核心字段对照")
    a("")
    a("| 业务含义 | 字段 | 状态 |")
    a("|---|---|---|")
    a("| VASC 单号 | `orderNo` | available |")
    a("| 场景 | `sceneOverviewName` / `sceneOverviewCode` | available |")
    a("| 服务 | `serviceName` / `serviceCode` | available |")
    a("| 客户需求原文 | `requirementDescription` / `VAS_ATTR_REL_RD` | available（约半数有值） |")
    a("| SOP | `sop` | available |")
    a("| 审核结果 | `isAuditThrough` + `auditTrace` | available |")
    a("| 退回原因 | `auditTrace.eventContent` | available |")
    a("| 原子属性 | `submitAttrs`（仅 RD/BEOR） | partial |")
    a("| 上传附件 | 独立附件列 | `not_available_in_source` / `cannot_verify` |")
    a("| vasDes | `vasDes` | `not_available_in_source`（全空） |")
    a("")
    a("## 2. 场景分布（sceneOverviewName × 数量）")
    a("")
    a("| sceneOverviewName | 数量 |")
    a("|---|---:|")
    for sc, n in scene_cnt.most_common():
        mark = " ← TOP3" if any(sc == t["name"] for t in TARGET_SCENES) else ""
        a(f"| {sc}{mark} | {n} |")
    a("")
    a("## 3. 审核结果分布")
    a("")
    a("分类口径：退回 = 轨迹含审核不通过；通过 = isAuditThrough=Y 或审核通过；取消 = status=CD 且未判退回/通过；其余=其他。")
    a("")
    a("| 审核结果 | 数量 |")
    a("|---|---:|")
    for k in ["通过", "退回", "取消", "其他"]:
        a(f"| {k} | {audit_cnt.get(k, 0)} |")
    a("")
    a("| status | 数量 |")
    a("|---|---:|")
    for k, n in Counter(cell(x).upper() for x in main["status"]).most_common():
        a(f"| {k} | {n} |")
    a("")
    # reject top
    rej_c = Counter()
    for _, r in audit.iterrows():
        if cell(r.get("eventCode")) == "审核不通过" or cell(r.get("newStatus")) == "REVIEW_FAILED":
            rej_c[cell(r.get("eventContent")) or "(empty)"] += 1
    a("### 退回原因 Top 10（auditTrace 行）")
    a("")
    a("| 退回原因 | 数量 |")
    a("|---|---:|")
    for reason, n in rej_c.most_common(10):
        a(f"| {reason.replace('|', '\\|')} | {n} |")
    a("")
    a("## 4. SOP 填写率 / 附件上传率")
    a("")
    a("| 指标 | 数量 | 比例 |")
    a("|---|---:|---:|")
    a(f"| 有 SOP | {sop_yes} | {sop_yes/len(atoms):.1%} |")
    a(f"| 无 SOP | {sop_no} | {sop_no/len(atoms):.1%} |")
    a(f"| 附件可确认上传 | cannot_verify | — |")
    a(f"| 文本提及附件（启发式） | {len(mention_orders)} | {len(mention_orders)/len(main):.1%} of orders |")
    a("")
    a("### TOP3 场景 SOP 覆盖")
    a("")
    a("| 场景 | n | 有SOP | 无SOP | 覆盖率 |")
    a("|---|---:|---:|---:|---:|")
    for t in TARGET_SCENES:
        g = atoms[atoms["sceneOverviewCode"].map(cell) == t["code"]]
        n = len(g)
        sy = int(nn(g["sop"]).sum()) if n else 0
        a(f"| {t['name']} | {n} | {sy} | {n-sy} | {(sy/n if n else 0):.1%} |")
    a("")
    a("## 5. 数据缺口与人工核准")
    a("")
    a("1. 附件清单无法从本 Excel 确认（`cannot_verify`）。")
    a("2. `submitAttrs` 仅需求描述/背景，其他原子属性未展开。")
    a("3. `vasDes` 全空。")
    a("4. 本轮仅对 TOP3 场景抽 9 条样本供人工标注。")
    a("")
    (OUT / "data-profile.md").write_text("\n".join(lines), encoding="utf-8")
    return {
        "generatedAt": now,
        "audit_cnt": dict(audit_cnt),
        "sop_yes": sop_yes,
        "sop_no": sop_no,
        "mention_orders": len(mention_orders),
        "explicit_file_rows": explicit_file_rows,
        "scene_cnt_top": scene_cnt.most_common(15),
        "reject_top": rej_c.most_common(5),
    }


def candidates_for_scene(atoms, order_map, attrs_by_order, code: str, name: str):
    rows = []
    for i, r in atoms.iterrows():
        scode = cell(r.get("sceneOverviewCode"))
        sname = cell(r.get("sceneOverviewName"))
        if scode != code and sname != name:
            continue
        if scode and scode != code:
            continue
        ono = cell(r.get("orderNo"))
        oi = order_map.get(ono, {})
        desc = cell(r.get("requirementDescription"))
        bg = cell(r.get("requirementBackground"))
        sop = cell(r.get("sop"))
        attrs = attrs_by_order.get(ono, [])
        audit_result = oi.get("auditResult", "其他")
        reject = oi.get("rejectReason", "")
        mentions = text_mentions_attachment("\n".join([desc, bg, sop]))
        explicit = any(looks_like_file(a["fieldValue"]) for a in attrs)
        tags = []
        if len(sop) >= 400:
            tags.append("SOP很长或很复杂")
        if is_vague(desc):
            tags.append("需求描述很模糊")
        if mentions and not explicit:
            tags.append("有附件提及但字段无附件记录")
        if audit_result == "通过" and not mentions and not explicit and len(desc) > 20:
            tags.append("无附件记录但仍通过")
        if audit_result == "退回":
            cat = reject_cat(reject)
            if cat != "需求描述不清晰":
                tags.append(f"退回原因不是需求描述不清晰（{cat}）")
            if cat == "可能应走标准增值":
                tags.append("可能应走标准增值")
            if cat == "仓库无法支持":
                tags.append("仓库无法支持")
            if cat == "场景不符":
                tags.append("场景不符")
        if not attrs:
            tags.append("字段不完整（无 submitAttrs）")
        rows.append(
            {
                "atomsRow": int(i) + 2,
                "orderNo": ono,
                "sceneCode": scode or code,
                "sceneName": sname or name,
                "serviceCode": cell(r.get("serviceCode")),
                "serviceName": cell(r.get("serviceName")),
                "desc": desc,
                "bg": bg,
                "sop": sop,
                "auditResult": audit_result,
                "rejectReason": reject,
                "finalStatus": oi.get("status", ""),
                "attrs": attrs,
                "tags": tags,
                "mentions": mentions,
                "mainRow": oi.get("mainRow"),
                "productName": oi.get("productName", ""),
                "warehouseName": oi.get("warehouseName", ""),
                "events": oi.get("events", []),
            }
        )
    return rows


def pick3(cands: list[dict], scene_name: str):
    used = set()
    picked = []
    notes = []

    def take(row, slot, why):
        key = (row["orderNo"], row["atomsRow"])
        if key in used:
            return False
        used.add(key)
        x = dict(row)
        x["slot"] = slot
        x["why"] = why
        picked.append(x)
        return True

    passes = sorted(
        [c for c in cands if c["auditResult"] == "通过"],
        key=lambda c: (0 if c["desc"] else 1, 0 if c["sop"] else 1, -len(c["desc"]), c["orderNo"]),
    )
    rejects = sorted(
        [c for c in cands if c["auditResult"] == "退回"],
        key=lambda c: (
            0 if c["desc"] else 1,
            0 if c["rejectReason"] else 1,
            -len(c["rejectReason"]),
            c["orderNo"],
        ),
    )
    bounds = sorted(
        [c for c in cands if c["tags"] and (c["orderNo"], c["atomsRow"]) not in used],
        key=lambda c: (0 if c["desc"] else 1, -len(c["tags"]), -len(c["sop"]), -len(c["desc"]), c["orderNo"]),
    )

    if passes:
        take(passes[0], "通过", "审核通过样本")
    else:
        notes.append(f"「{scene_name}」无可抽通过样本")

    if rejects:
        take(rejects[0], "退回", "审核退回样本")
    else:
        notes.append(f"「{scene_name}」无可抽退回样本")

    # refresh bounds excluding used
    bounds = [c for c in cands if c["tags"] and (c["orderNo"], c["atomsRow"]) not in used]
    bounds = sorted(
        bounds,
        key=lambda c: (0 if c["desc"] else 1, -len(c["tags"]), -len(c["sop"]), -len(c["desc"]), c["orderNo"]),
    )
    if bounds:
        b = bounds[0]
        take(b, "边界", "边界样本：" + "；".join(b["tags"][:4]))
    else:
        rest = [c for c in cands if (c["orderNo"], c["atomsRow"]) not in used]
        rest = sorted(rest, key=lambda c: (0 if c["desc"] else 1, -(len(c["desc"]) + len(c["sop"])), c["orderNo"]))
        if rest:
            take(rest[0], "边界", "边界样本（弱）：该场景缺少典型边界特征，取信息量较高剩余样本")
        else:
            notes.append(f"「{scene_name}」边界样本不足")

    # fill to 3 — prefer remaining with requirement text
    for c in sorted(cands, key=lambda x: (0 if x["desc"] else 1, -len(x["desc"]), x["orderNo"])):
        if len(picked) >= 3:
            break
        take(c, "补足", f"补足样本：auditResult={c['auditResult']}")

    if len(cands) < 3:
        notes.append(f"「{scene_name}」候选仅 {len(cands)} 条，不足 3 条")
    return picked, notes


def attachments_for(row):
    out = []
    for a in row["attrs"]:
        if looks_like_file(a["fieldValue"]):
            out.append(
                {
                    "attachmentName": a["fieldName"] or "unknown",
                    "attachmentType": "unknown",
                    "attachmentTokenOrUrl": a["fieldValue"][:300],
                    "source": f"submitAttrs#row{a['sourceRow']}",
                }
            )
    if out:
        return out, "heuristic_from_attr_value"
    if row["mentions"]:
        return [
            {
                "attachmentName": "cannot_verify",
                "attachmentType": "unknown",
                "attachmentTokenOrUrl": "cannot_verify",
                "source": "text_mention_only_no_attachment_column",
            }
        ], "cannot_verify"
    return [
        {
            "attachmentName": "not_available_in_source",
            "attachmentType": "unknown",
            "attachmentTokenOrUrl": "not_available_in_source",
            "source": "no_attachment_column_in_workbook",
        }
    ], "cannot_verify"


def to_sample(sample_id: str, row: dict) -> dict:
    atts, att_status = attachments_for(row)
    submitted = [
        {
            "fieldName": a["fieldName"],
            "fieldKey": a["fieldKey"],
            "fieldValue": a["fieldValue"],
            "inputNode": a["inputNode"] or "unknown",
        }
        for a in row["attrs"]
    ]
    if not submitted:
        if row["desc"]:
            submitted.append(
                {
                    "fieldName": "需求描述",
                    "fieldKey": "VAS_ATTR_REL_RD",
                    "fieldValue": row["desc"],
                    "inputNode": "unknown",
                    "note": "来自 vaAtoms；submitAttrs 无行",
                }
            )
        if row["bg"]:
            submitted.append(
                {
                    "fieldName": "需求背景说明",
                    "fieldKey": "BEOR",
                    "fieldValue": row["bg"],
                    "inputNode": "unknown",
                    "note": "来自 vaAtoms；submitAttrs 无行",
                }
            )
    return {
        "sampleId": sample_id,
        "vascNo": row["orderNo"],
        "场景": row["sceneName"],
        "场景码": row["sceneCode"],
        "serviceCode": row["serviceCode"],
        "serviceName": row["serviceName"],
        "productName": row["productName"],
        "客户需求原文": row["desc"],
        "需求背景": row["bg"],
        "审核结果": row["auditResult"],
        "退回原因": row["rejectReason"],
        "finalStatus": row["finalStatus"],
        "已填写字段": submitted,
        "已上传附件": atts,
        "attachmentStatus": att_status,
        "SOP原文": row["sop"],
        "抽样槽位": row["slot"],
        "whyThisSample": row["why"],
        "boundaryTags": row["tags"],
        "我需要判断的问题": QUESTIONS,
        "humanLabelPlaceholder": {
            "checkRequirement": None,
            "matchTemplate": None,
            "checkCompleteness": None,
            "verifiedBy": None,
            "verifiedAt": None,
        },
        "provenance": {
            "sourceFile": SOURCE_REL,
            "atomsSheet": "vaAtoms口径",
            "atomsRow": row["atomsRow"],
            "mainSheet": "增值单汇总",
            "mainRow": row["mainRow"],
        },
    }


def write_readable(samples, notes):
    lines = []
    a = lines.append
    a("# TOP3 场景标注辅助样本（人可读）")
    a("")
    a("- 每场景目标：通过 1 / 退回 1 / 边界 1")
    a(f"- 样本数：{len(samples)}")
    a("- **不是** eval gold / 规则资产")
    if notes:
        a("- 备注：")
        for n in notes:
            a(f"  - {n}")
    a("")
    for s in samples:
        a(f"## {s['sampleId']} · {s['vascNo']}")
        a("")
        a(f"- 场景：{s['场景']}（`{s['场景码']}`）")
        a(f"- 服务：`{s.get('serviceCode')}` / {s.get('serviceName')}")
        a(f"- 产品：{s.get('productName')}")
        a(f"- 审核结果：{s['审核结果']}")
        a(f"- 退回原因：{s['退回原因'] or '（无）'}")
        a(f"- 最终状态：`{s.get('finalStatus')}`")
        a(f"- 抽样槽位：{s.get('抽样槽位')}；原因：{s.get('whyThisSample')}")
        if s.get("boundaryTags"):
            a(f"- 边界标签：{'；'.join(s['boundaryTags'])}")
        p = s["provenance"]
        a(f"- 溯源：`{p['sourceFile']}` · `{p['atomsSheet']}#row{p['atomsRow']}` · `{p['mainSheet']}#row{p['mainRow']}`")
        a(f"- 附件状态：`{s.get('attachmentStatus')}`")
        a("")
        a("### 客户需求原文")
        a("")
        a(fence(s.get("客户需求原文") or "（空）"))
        a("")
        a("### 需求背景")
        a("")
        a(fence(s.get("需求背景") or "（空）"))
        a("")
        a("### 已填写字段")
        a("")
        if s.get("已填写字段"):
            for f in s["已填写字段"]:
                a(f"#### {f.get('fieldName')} (`{f.get('fieldKey')}`)")
                a("")
                a(fence(f.get("fieldValue") or "（空）"))
                a("")
        else:
            a("（无）")
            a("")
        a("### 已上传附件")
        a("")
        a("| name | type | token/url | source |")
        a("|---|---|---|---|")
        for att in s.get("已上传附件") or []:
            a(
                f"| {att.get('attachmentName')} | {att.get('attachmentType')} | "
                f"{att.get('attachmentTokenOrUrl')} | {att.get('source')} |"
            )
        a("")
        a("### SOP原文")
        a("")
        a(fence(s.get("SOP原文") or "（空）"))
        a("")
        a("### 我需要判断的问题")
        a("")
        for q in s.get("我需要判断的问题") or []:
            a(f"- {q}")
        a("")
        a("---")
        a("")
    (OUT / "sample-cases-readable.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    names, sheets = load()
    events = build_events(sheets["auditTrace"])
    order_map = order_audit_map(sheets["增值单汇总"], events)
    attrs_by_order = index_attrs(sheets["submitAttrs"])
    stats = write_profile(names, sheets, order_map, events, attrs_by_order)

    samples = []
    all_notes = []
    sid = 1
    for t in TARGET_SCENES:
        cands = candidates_for_scene(
            sheets["vaAtoms口径"], order_map, attrs_by_order, t["code"], t["name"]
        )
        picked, notes = pick3(cands, t["name"])
        all_notes.extend(notes)
        if not picked:
            all_notes.append(f"「{t['name']}」（{t['code']}）候选为 0")
        for p in picked:
            samples.append(to_sample(f"S{sid:03d}", p))
            sid += 1

    payload = {
        "meta": {
            "generatedAt": stats["generatedAt"],
            "source": SOURCE_REL,
            "purpose": "exploration_and_human_labeling_aid",
            "notGenerated": ["scene_rules", "eval_cases", "sop_case_library", "workflow_rules"],
            "targetScenes": TARGET_SCENES,
            "sampleCount": len(samples),
            "notes": all_notes,
        },
        "samples": samples,
    }
    (OUT / "sample-cases.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_readable(samples, all_notes)

    summary = {
        "files": ["data-profile.md", "sample-cases.json", "sample-cases-readable.md"],
        "out": str(OUT),
        "audit": stats["audit_cnt"],
        "sop": {"yes": stats["sop_yes"], "no": stats["sop_no"]},
        "attachment": {
            "status": "cannot_verify",
            "mention_orders": stats["mention_orders"],
            "explicit_file_rows": stats["explicit_file_rows"],
        },
        "targetScenes": [
            {"code": t["code"], "name": t["name"]} for t in TARGET_SCENES
        ],
        "sampleCount": len(samples),
        "byScene": {
            s["场景"]: [
                {
                    "id": x["sampleId"],
                    "vasc": x["vascNo"],
                    "slot": x["抽样槽位"],
                    "audit": x["审核结果"],
                    "descLen": len(x["客户需求原文"] or ""),
                }
                for x in samples
                if x["场景"] == s["场景"]
            ]
            for s in samples
        },
        "notes": all_notes,
        "rejectTop": stats["reject_top"],
    }
    # fix byScene unique
    by_scene = defaultdict(list)
    for x in samples:
        by_scene[f"{x['场景码']} {x['场景']}"].append(
            {
                "id": x["sampleId"],
                "vasc": x["vascNo"],
                "slot": x["抽样槽位"],
                "audit": x["审核结果"],
                "descLen": len(x["客户需求原文"] or ""),
            }
        )
    summary["byScene"] = dict(by_scene)
    (OUT / "_run_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
