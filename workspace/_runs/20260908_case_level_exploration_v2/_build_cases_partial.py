# coding: utf-8
"""Build case-level exploration dataset v2 from chat Excel + OMS cache."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT = ROOT / "workspace" / "_runs" / "20260908_case_level_exploration_v2"
CACHE = OUT / "_oms_cache"
OMS_XLSX = ROOT / "workspace" / "data" / "raw" / "全量_增值单接口口径事实补齐.xlsx"
CHAT_XLSX = Path(r"D:\DA\待整理\value_added_realted\两个群_20260421-20260801_非标增值讨论_任一艾特命中.xlsx")

VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)
WO_RE = re.compile(r"WO\d{6,}", re.I)
M_RE = re.compile(r"M0\d{15,}", re.I)
ATT_MENTION_RE = re.compile(r"附件|上传|图片|照片|pdf|xlsx|标签文件|见附图|见截图|\.pdf|\.xlsx|\.jpe?g|\.png", re.I)

HUMAN_QUESTIONS = [
    "这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）",
    "normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？",
    "match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？",
    "check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？",
    "sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？",
    "最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？",
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
    "source": "needs_human_label",
    "verifiedBy": None,
    "verifiedAt": None,
}


def cell(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, datetime):
        return v.isoformat(sep=" ", timespec="seconds")
    s = str(v).replace("\xa0", " ").strip()
    if s.lower() in {"nan", "none", "nat", "null"}:
        return ""
    return s


def uniq(seq):
    out = []
    seen = set()
    for x in seq:
        x = cell(x)
        if not x:
            continue
        k = x.upper() if re.match(r"^(VASC|EB|WI|WO|M0)", x, re.I) else x
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    return out


def extract_ids(text: str):
    t = text or ""
    return {
        "vasc": uniq(VASC_RE.findall(t)),
        "eb": uniq(EB_RE.findall(t)),
        "wi": uniq(WI_RE.findall(t)),
        "wo": uniq(WO_RE.findall(t)),
        "m": uniq(M_RE.findall(t)),
    }


def classify_audit(flag: str, status: str, events: list[dict]) -> tuple[str, str]:
    blob = " | ".join(
        f"{e.get('event_code','')}/{e.get('new_status','')}/{e.get('event_content','')}" for e in events
    )
    reject = ""
    for e in events:
        if cell(e.get("event_code")) == "审核不通过" or cell(e.get("new_status")) == "REVIEW_FAILED":
            reject = cell(e.get("event_content")) or cell(e.get("supplement_desc"))
            break
    flag_u = (flag or "").upper()
    status_u = (status or "").upper()
    if "审核不通过" in blob or "REVIEW_FAILED" in blob:
        return "退回", reject
    if flag_u == "Y" or ("审核通过" in blob and "审核不通过" not in blob):
        return "通过", ""
    if status_u == "CD" or "取消订单" in blob:
        return "取消", reject
    return "其他/未知", reject


def text_mentions_attachment(*texts: str) -> bool:
    return any(ATT_MENTION_RE.search(t or "") for t in texts)


def load_cache_csv(name: str) -> pd.DataFrame:
    path = CACHE / f"{name}.csv"
    if not path.exists():
        raise FileNotFoundError(path)
    return pd.read_csv(path, dtype=object).fillna("")


def load_chat() -> pd.DataFrame:
    df = pd.read_excel(CHAT_XLSX, sheet_name="讨论明细", dtype=object)
    return df


def load_mapping() -> pd.DataFrame:
    return pd.read_excel(OMS_XLSX, sheet_name="讨论-增值单映射", dtype=object)


def build_oms_indexes(orders, atoms, traces, files, attrs):
    order_by_no = {}
    for _, r in orders.iterrows():
        ono = cell(r["order_no"]).upper()
        order_by_no[ono] = {c: cell(r[c]) for c in orders.columns}

    atoms_by_order = defaultdict(list)
    for _, r in atoms.iterrows():
        ono = cell(r["order_no"]).upper()
        atoms_by_order[ono].append({c: cell(r[c]) for c in atoms.columns})

    traces_by_order = defaultdict(list)
    for _, r in traces.iterrows():
        ono = cell(r["order_no"]).upper()
        traces_by_order[ono].append({c: cell(r[c]) for c in traces.columns})

    files_by_order = defaultdict(list)
    for _, r in files.iterrows():
        ono = cell(r["order_no"]).upper()
        files_by_order[ono].append({c: cell(r[c]) for c in files.columns})

    attrs_by_order = defaultdict(list)
    for _, r in attrs.iterrows():
        ono = cell(r["order_no"]).upper()
        attrs_by_order[ono].append({c: cell(r[c]) for c in attrs.columns})

    return order_by_no, atoms_by_order, traces_by_order, files_by_order, attrs_by_order


def vasc_bundle(ono: str, order_by_no, atoms_by_order, traces_by_order, files_by_order, attrs_by_order):
    o = order_by_no.get(ono.upper())
    if not o:
        return None
    events = traces_by_order.get(ono.upper(), [])
    audit, reject = classify_audit(o.get("is_audit_through", ""), o.get("status", ""), events)
    atms = atoms_by_order.get(ono.upper(), [])
    attrs = attrs_by_order.get(ono.upper(), [])
    files = files_by_order.get(ono.upper(), [])
    reqs = []
    bgs = []
    for a in attrs:
        key = a.get("attribute_key", "")
        name = a.get("attribute_name", "")
        val = a.get("attribute_value", "")
        if key == "VAS_ATTR_REL_RD" or name in {"需求描述"}:
            if val:
                reqs.append(val)
        if key == "BEOR" or "需求背景" in name:
            if val:
                bgs.append(val)
    # fallback from excel fact table later if needed
    return {
        "orderNo": ono.upper(),
        "order": o,
        "atoms": atms,
        "attrs": attrs,
        "files": files,
        "events": events,
        "auditResult": audit,
        "rejectReason": reject,
        "requirements": uniq(reqs),
        "backgrounds": uniq(bgs),
        "sops": uniq([a.get("sop", "") for a in atms]),
        "scenes": uniq([a.get("scene_overview_name", "") for a in atms]),
        "serviceCodes": uniq([a.get("service_code", "") for a in atms]),
        "serviceNames": uniq([a.get("service_name", "") for a in atms]),
        "productName": o.get("product_name", ""),
    }


def attachment_status_for_case(vasc_bundles, texts: list[str]) -> tuple[str, list[dict]]:
    atts = []
    for b in vasc_bundles:
        for f in b["files"]:
            atts.append(
                {
                    "vascNo": b["orderNo"],
                    "attachmentName": f.get("file_name") or "unknown",
                    "attachmentType": f.get("file_type") or f.get("type") or "unknown",
                    "url": f.get("url") or "",
                    "attributeName": f.get("attribute_name") or "",
                    "attributeKey": f.get("attribute_key") or "",
                    "inputNode": f.get("input_node") or "unknown",
                    "serviceCode": f.get("service_code") or "",
                    "source": "oms.oms_va_execute_file",
                    "verification": "verified",
                }
            )
    if atts:
        return "verified", atts
    if text_mentions_attachment(*texts):
        return "text_mention_only", [
            {
                "attachmentName": "text_mention_only",
                "attachmentType": "unknown",
                "url": "",
                "source": "text_mention_in_chat_or_requirement_or_sop",
                "verification": "text_mention_only",
            }
        ]
    return "not_found_in_oms_va_execute_file", []


def case_quality_flags(case_type: str, bundles, has_chat: bool, conv: str) -> list[str]:
    flags = []
    audits = [b["auditResult"] for b in bundles]
    if has_chat and any(a == "通过" for a in audits):
        # heuristic: chat exists and pass -> possible chat completion path
        if any(not b["requirements"] for b in bundles) or (
            conv and ("补充" in conv or "再确认" in conv or "请提供" in conv or "?" in conv or "？" in conv)
        ):
            flags.append("possible_chat_completion_then_pass")
    if len(bundles) >= 2:
        if any(a == "退回" for a in audits) and any(a == "通过" for a in audits):
            flags.append("possible_resubmit_after_reject")
        if any(a == "取消" for a in audits) and any(a == "通过" for a in audits):
            flags.append("possible_resubmit_after_cancel")
    if case_type == "oms_direct_pass":
        flags.append("direct_pass_no_chat")
    if any(b["files"] for b in bundles):
        flags.append("has_verified_attachments")
    if has_chat and not any(b["requirements"] for b in bundles):
        flags.append("chat_present_but_oms_requirement_empty")
    return flags


def make_case(
    case_id: str,
    case_id_type: str,
    case_type: str,
    thread_ids,
    discussion_seqs,
    chat_names,
    discussion_dates,
    feishu_urls,
    conversation_raw,
    conversation_status,
    summary_for_index,
    bundles,
    extra_ids=None,
):
    extra_ids = extra_ids or {}
    texts = [conversation_raw or "", summary_for_index or ""]
    for b in bundles:
        texts.extend(b["requirements"])
        texts.extend(b["backgrounds"])
        texts.extend(b["sops"])
        for a in b["attrs"]:
            texts.append(a.get("attribute_value", ""))

    # collect related ids
    vascs = uniq([b["orderNo"] for b in bundles] + extra_ids.get("vasc", []))
    ebs, wis, wos, ms = [], [], [], []
    for b in bundles:
        blob = "\n".join(
            b["requirements"]
            + b["backgrounds"]
            + b["sops"]
            + [a.get("attribute_value", "") for a in b["attrs"]]
        )
        ids = extract_ids(blob)
        ebs += ids["eb"]
        wis += ids["wi"]
        wos += ids["wo"]
        ms += ids["m"]
    ids2 = extract_ids(conversation_raw or "")
    ebs = uniq(ebs + ids2["eb"] + extra_ids.get("eb", []))
    wis = uniq(wis + ids2["wi"] + extra_ids.get("wi", []))
    wos = uniq(wos + ids2["wo"] + extra_ids.get("wo", []))
    ms = uniq(ms + ids2["m"] + extra_ids.get("m", []))

    att_status, atts = attachment_status_for_case(bundles, texts)
    submitted = []
    for b in bundles:
        for a in b["attrs"]:
            submitted.append(
                {
                    "vascNo": b["orderNo"],
                    "fieldName": a.get("attribute_name") or "",
                    "fieldKey": a.get("attribute_key") or "",
                    "fieldValue": a.get("attribute_value") or "",
                    "inputNode": a.get("input_node") or "SUBMIT",
                    "serviceCode": a.get("service_code") or "",
                    "serviceSequence": a.get("service_sequence") or "",
                    "attrId": a.get("attr_id") or "",
                }
            )

    audit_results = [{"vascNo": b["orderNo"], "auditResult": b["auditResult"], "isAuditThrough": b["order"].get("is_audit_through", ""), "status": b["order"].get("status", "")} for b in bundles]
    reject_reasons = [{"vascNo": b["orderNo"], "rejectReason": b["rejectReason"]} for b in bundles if b["rejectReason"]]
    final_statuses = [{"vascNo": b["orderNo"], "status": b["order"].get("status", "")} for b in bundles]
    sops = [{"vascNo": b["orderNo"], "sop": s} for b in bundles for s in b["sops"] if s]
    reqs = [{"vascNo": b["orderNo"], "requirementDescription": r} for b in bundles for r in b["requirements"]]
    bgs = [{"vascNo": b["orderNo"], "requirementBackground": r} for b in bundles for r in b["backgrounds"]]

    return {
        "caseId": case_id,
        "caseIdType": case_id_type,
        "threadIds": uniq(thread_ids),
        "discussionSeqs": uniq(discussion_seqs),
        "chatNames": uniq(chat_names),
        "discussionDates": uniq(discussion_dates),
        "feishuUrls": uniq(feishu_urls),
        "conversationRaw": conversation_raw or "",
        "conversationRawStatus": conversation_status,
        "summaryForIndex": summary_for_index or "",
        "vascNos": vascs,
        "ebNos": ebs,
        "wiNos": wis,
        "woNos": wos,
        "mCodes": ms,
        "productNames": uniq([b["productName"] for b in bundles]),
        "serviceCodes": uniq([c for b in bundles for c in b["serviceCodes"]]),
        "serviceNames": uniq([c for b in bundles for c in b["serviceNames"]]),
        "sceneOverviewNames": uniq([c for b in bundles for c in b["scenes"]]),
        "requirementDescriptions": reqs,
        "requirementBackgrounds": bgs,
        "submittedFields": submitted,
        "uploadedAttachments": atts,
        "attachmentStatus": att_status,
        "sops": sops,
        "auditResults": audit_results,
        "rejectReasons": reject_reasons,
        "finalStatuses": final_statuses,
        "caseType": case_type,
        "caseQualityFlags": case_quality_flags(case_type, bundles, bool(thread_ids) or bool(conversation_raw), conversation_raw or ""),
        "humanLabelPlaceholder": LABEL_PLACEHOLDER,
    }


def main():
    print("loading caches...")
    orders = load_cache_csv("orders")
    atoms = load_cache_csv("atoms")
    traces = load_cache_csv("traces")
    files = load_cache_csv("files")
    attrs = load_cache_csv("attrs_submit")
    chat = load_chat()
    mapping = load_mapping()
    order_by_no, atoms_by_order, traces_by_order, files_by_order, attrs_by_order = build_oms_indexes(
        orders, atoms, traces, files, attrs
    )

    # mapping: discussionSeq -> orderNo; also threadId from chat via seq
    map_by_seq = defaultdict(list)
    for _, r in mapping.iterrows():
        seq = cell(r.get("discussionSeq"))
        ono = cell(r.get("orderNo")).upper()
        if seq and ono:
            map_by_seq[seq].append(ono)

    chat_by_thread = {}
    chat_by_seq = {}
    for _, r in chat.iterrows():
        tid = cell(r.get("讨论ID"))
        seq = cell(r.get("序号"))
        row = {
            "threadId": tid,
            "discussionSeq": seq,
            "chatName": cell(r.get("群名称")),
            "date": cell(r.get("日期")),
            "feishuUrl": cell(r.get("飞书链接")),
            "summary": cell(r.get("摘要")),
            "conversation": cell(r.get("对话详情")),
            "relatedNos": cell(r.get("关联单号")),
        }
        if tid:
            chat_by_thread[tid] = row
        if seq:
            chat_by_seq[seq] = row

    assigned_vascs = set()
    cases = []

    # 1) thread cases from chat discussions
    for tid, crow in chat_by_thread.items():
        seq = crow["discussionSeq"]
        vascs = uniq(map_by_seq.get(seq, []))
        # also extract from related + conversation
        ids = extract_ids(crow["relatedNos"] + "\n" + crow["conversation"] + "\n" + crow["summary"])
        vascs = uniq(vascs + ids["vasc"])
        bundles = []
        for v in vascs:
            b = vasc_bundle(v, order_by_no, atoms_by_order, traces_by_order, files_by_order, attrs_by_order)
            if b:
                bundles.append(b)
                assigned_vascs.add(v.upper())
        conv = crow["conversation"]
        status = "found" if conv else "not_found"
        case = make_case(
            case_id=f"thread:{tid}",
            case_id_type="thread",
            case_type="chat_driven",
            thread_ids=[tid],
            discussion_seqs=[seq],
            chat_names=[crow["chatName"]],
            discussion_dates=[crow["date"]],
            feishu_urls=[crow["feishuUrl"]],
            conversation_raw=conv,
            conversation_status=status,
            summary_for_index=crow["summary"],
            bundles=bundles,
            extra_ids=ids,
        )
        cases.append(case)

    # 2) remaining OMS orders -> eb or vasc cases
    for ono, o in order_by_no.items():
        if ono in assigned_vascs:
            continue
        b = vasc_bundle(ono, order_by_no, atoms_by_order, traces_by_order, files_by_order, attrs_by_order)
        if not b:
            continue
        # gather EB from attrs/sop/req
        blob = "\n".join(b["requirements"] + b["backgrounds"] + b["sops"] + [a.get("attribute_value", "") for a in b["attrs"]])
        ids = extract_ids(blob)
        if ids["eb"]:
            case_id = f"eb:{ids['eb'][0].upper()}"
            case_id_type = "eb"
        else:
            case_id = f"vasc:{ono}"
            case_id_type = "vasc"

        audit = b["auditResult"]
        has_sop = bool(b["sops"])
        has_req_or_att = bool(b["requirements"]) or bool(b["files"])
        if audit == "通过" and has_sop and has_req_or_att:
            ctype = "oms_direct_pass"
        else:
            ctype = "oms_other"

        # merge into existing eb case if same caseId already exists
        existing = next((c for c in cases if c["caseId"] == case_id), None)
        if existing:
            # merge vasc
            if ono not in [x.upper() for x in existing["vascNos"]]:
                # rebuild by extending - simpler append fields
                existing["vascNos"] = uniq(existing["vascNos"] + [ono])
                existing["productNames"] = uniq(existing["productNames"] + [b["productName"]])
                existing["serviceCodes"] = uniq(existing["serviceCodes"] + b["serviceCodes"])
                existing["serviceNames"] = uniq(existing["serviceNames"] + b["serviceNames"])
                existing["sceneOverviewNames"] = uniq(existing["sceneOverviewNames"] + b["scenes"])
                existing["requirementDescriptions"] += [{"vascNo": ono, "requirementDescription": r} for r in b["requirements"]]
                existing["requirementBackgrounds"] += [{"vascNo": ono, "requirementBackground": r} for r in b["backgrounds"]]
                existing["submittedFields"] += [
                    {
                        "vascNo": ono,
                        "fieldName": a.get("attribute_name") or "",
                        "fieldKey": a.get("attribute_key") or "",
                        "fieldValue": a.get("attribute_value") or "",
                        "inputNode": a.get("input_node") or "SUBMIT",
                        "serviceCode": a.get("service_code") or "",
                        "serviceSequence": a.get("service_sequence") or "",
                        "attrId": a.get("attr_id") or "",
                    }
                    for a in b["attrs"]
                ]
                existing["sops"] += [{"vascNo": ono, "sop": s} for s in b["sops"] if s]
                existing["auditResults"] += [{"vascNo": ono, "auditResult": b["auditResult"], "isAuditThrough": b["order"].get("is_audit_through", ""), "status": b["order"].get("status", "")}]
                if b["rejectReason"]:
                    existing["rejectReasons"] += [{"vascNo": ono, "rejectReason": b["rejectReason"]}]
                existing["finalStatuses"] += [{"vascNo": ono, "status": b["order"].get("status", "")}]
                if b["files"]:
                    for f in b["files"]:
                        existing["uploadedAttachments"].append(
                            {
                                "vascNo": ono,
                                "attachmentName": f.get("file_name") or "unknown",
                                "attachmentType": f.get("file_type") or f.get("type") or "unknown",
                                "url": f.get("url") or "",
                                "attributeName": f.get("attribute_name") or "",
                                "attributeKey": f.get("attribute_key") or "",
                                "inputNode": f.get("input_node") or "unknown",
                                "serviceCode": f.get("service_code") or "",
                                "source": "oms.oms_va_execute_file",
                                "verification": "verified",
                            }
                        )
                    existing["attachmentStatus"] = "verified"
                assigned_vascs.add(ono)
            continue

        case = make_case(
            case_id=case_id,
            case_id_type=case_id_type,
            case_type=ctype,
            thread_ids=[],
            discussion_seqs=[],
            chat_names=[],
            discussion_dates=[],
            feishu_urls=[],
            conversation_raw="",
            conversation_status="not_found",
            summary_for_index="",
            bundles=[b],
            extra_ids=ids,
        )
        cases.append(case)
        assigned_vascs.add(ono)

    # ensure caseId unique - if duplicate thread somehow
    id_counts = Counter(c["caseId"] for c in cases)
    dups = [k for k, v in id_counts.items() if v > 1]
    if dups:
        # suffix duplicates
        seen = Counter()
        for c in cases:
            seen[c["caseId"]] += 1
            if id_counts[c["caseId"]] > 1 and seen[c["caseId"]] > 1:
                c["caseId"] = f"{c['caseId']}#dup{seen[c['caseId']]}"

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "sourceFiles": [
            str(OMS_XLSX),
            str(CHAT_XLSX),
            "oms.oms_va_order / oms_va_atom / oms_va_atom_attr / oms_va_order_trace / oms_va_execute_file",
        ],
        "omsQueryWindow": {
            "orderDateFrom": "2026-04-21 00:00:00",
            "orderDateTo": "2026-08-01 00:00:00",
            "timezone": "Asia/Shanghai",
        },
        "caseIdPriority": ["threadId", "EB", "VASC"],
        "notes": [
            "探索数据集，不是正式规则/Eval/SOP 资产",
            "conversationRaw 来自原始群聊 讨论明细.对话详情；summaryForIndex 不是原文",
            "附件真实来源 oms.oms_va_execute_file；text_mention_only 不是已上传事实",
            "submittedFields 当前拉取 INPUT_NODE=SUBMIT 的原子属性",
        ],
        "generatedAt": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "omsOrderCount": int(len(orders)),
        "caseCount": len(cases),
    }
    payload = {"meta": meta, "cases": cases}
    (OUT / "case_level_dataset.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote json cases", len(cases))
    (OUT / "_cases_built.flag").write_text(str(len(cases)), encoding="utf-8")


if __name__ == "__main__":
    main()
