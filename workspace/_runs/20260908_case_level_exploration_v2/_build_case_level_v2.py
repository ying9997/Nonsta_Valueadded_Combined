# coding: utf-8
"""Case-level exploration v2: build dataset + profile + samples."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from copy import deepcopy
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
ATT_MENTION_RE = re.compile(
    r"附件|上传|图片|照片|标签文件|见附图|见截图|\.pdf\b|\.xlsx?\b|\.jpe?g\b|\.png\b",
    re.I,
)

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
    out, seen = [], set()
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
    return any(bool(ATT_MENTION_RE.search(t or "")) for t in texts)


def load_cache_csv(name: str) -> pd.DataFrame:
    path = CACHE / f"{name}.csv"
    df = pd.read_csv(path, dtype=object)
    return df.fillna("")


def fence(text: str) -> str:
    body = (text or "（空）").replace("\r\n", "\n")
    m = "````" if "```" in body else "```"
    return f"{m}text\n{body}\n{m}"


def build_indexes():
    orders = load_cache_csv("orders")
    atoms = load_cache_csv("atoms")
    traces = load_cache_csv("traces")
    files = load_cache_csv("files")
    attrs = load_cache_csv("attrs_submit")

    order_by_no = {}
    for _, r in orders.iterrows():
        order_by_no[cell(r["order_no"]).upper()] = {c: cell(r[c]) for c in orders.columns}

    atoms_by = defaultdict(list)
    for _, r in atoms.iterrows():
        atoms_by[cell(r["order_no"]).upper()].append({c: cell(r[c]) for c in atoms.columns})

    traces_by = defaultdict(list)
    for _, r in traces.iterrows():
        traces_by[cell(r["order_no"]).upper()].append({c: cell(r[c]) for c in traces.columns})

    files_by = defaultdict(list)
    for _, r in files.iterrows():
        files_by[cell(r["order_no"]).upper()].append({c: cell(r[c]) for c in files.columns})

    attrs_by = defaultdict(list)
    for _, r in attrs.iterrows():
        attrs_by[cell(r["order_no"]).upper()].append({c: cell(r[c]) for c in attrs.columns})

    return orders, atoms, traces, files, attrs, order_by_no, atoms_by, traces_by, files_by, attrs_by


def vasc_bundle(ono, order_by_no, atoms_by, traces_by, files_by, attrs_by):
    o = order_by_no.get(ono.upper())
    if not o:
        return None
    events = traces_by.get(ono.upper(), [])
    audit, reject = classify_audit(o.get("is_audit_through", ""), o.get("status", ""), events)
    atms = atoms_by.get(ono.upper(), [])
    attrs = attrs_by.get(ono.upper(), [])
    files = files_by.get(ono.upper(), [])
    reqs, bgs = [], []
    for a in attrs:
        key, name, val = a.get("attribute_key", ""), a.get("attribute_name", ""), a.get("attribute_value", "")
        if val and (key == "VAS_ATTR_REL_RD" or name == "需求描述"):
            reqs.append(val)
        if val and (key == "BEOR" or "需求背景" in name):
            bgs.append(val)
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


def attachment_for(bundles, texts):
    atts = []
    for b in bundles:
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
                    "created": f.get("created") or "",
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


def quality_flags(case_type, bundles, has_chat, conv):
    flags = []
    audits = [b["auditResult"] for b in bundles]
    if has_chat and any(a == "通过" for a in audits):
        if any(not b["requirements"] for b in bundles) or (
            conv
            and any(x in conv for x in ["补充", "请提供", "再确认", "？", "?", "上传", "不清楚"])
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
    case_id,
    case_id_type,
    case_type,
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
        texts.extend(b["requirements"] + b["backgrounds"] + b["sops"])
        texts.extend(a.get("attribute_value", "") for a in b["attrs"])

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
    ids2 = extract_ids((conversation_raw or "") + "\n" + (summary_for_index or ""))
    ebs = uniq(ebs + ids2["eb"] + extra_ids.get("eb", []))
    wis = uniq(wis + ids2["wi"] + extra_ids.get("wi", []))
    wos = uniq(wos + ids2["wo"] + extra_ids.get("wo", []))
    ms = uniq(ms + ids2["m"] + extra_ids.get("m", []))

    att_status, atts = attachment_for(bundles, texts)
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
        "serviceCodes": uniq(c for b in bundles for c in b["serviceCodes"]),
        "serviceNames": uniq(c for b in bundles for c in b["serviceNames"]),
        "sceneOverviewNames": uniq(c for b in bundles for c in b["scenes"]),
        "requirementDescriptions": [
            {"vascNo": b["orderNo"], "requirementDescription": r} for b in bundles for r in b["requirements"]
        ],
        "requirementBackgrounds": [
            {"vascNo": b["orderNo"], "requirementBackground": r} for b in bundles for r in b["backgrounds"]
        ],
        "submittedFields": submitted,
        "uploadedAttachments": atts,
        "attachmentStatus": att_status,
        "sops": [{"vascNo": b["orderNo"], "sop": s} for b in bundles for s in b["sops"] if s],
        "auditResults": [
            {
                "vascNo": b["orderNo"],
                "auditResult": b["auditResult"],
                "isAuditThrough": b["order"].get("is_audit_through", ""),
                "status": b["order"].get("status", ""),
            }
            for b in bundles
        ],
        "rejectReasons": [
            {"vascNo": b["orderNo"], "rejectReason": b["rejectReason"]} for b in bundles if b["rejectReason"]
        ],
        "finalStatuses": [{"vascNo": b["orderNo"], "status": b["order"].get("status", "")} for b in bundles],
        "caseType": case_type,
        "caseQualityFlags": quality_flags(
            case_type, bundles, bool(thread_ids) or bool(conversation_raw), conversation_raw or ""
        ),
        "humanLabelPlaceholder": deepcopy(LABEL_PLACEHOLDER),
        "questionsForHumanLabeling": HUMAN_QUESTIONS,
    }


def merge_bundle_into_case(existing, b):
    ono = b["orderNo"]
    if ono.upper() in {x.upper() for x in existing["vascNos"]}:
        return
    existing["vascNos"] = uniq(existing["vascNos"] + [ono])
    existing["productNames"] = uniq(existing["productNames"] + [b["productName"]])
    existing["serviceCodes"] = uniq(existing["serviceCodes"] + b["serviceCodes"])
    existing["serviceNames"] = uniq(existing["serviceNames"] + b["serviceNames"])
    existing["sceneOverviewNames"] = uniq(existing["sceneOverviewNames"] + b["scenes"])
    existing["requirementDescriptions"] += [
        {"vascNo": ono, "requirementDescription": r} for r in b["requirements"]
    ]
    existing["requirementBackgrounds"] += [
        {"vascNo": ono, "requirementBackground": r} for r in b["backgrounds"]
    ]
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
    existing["auditResults"] += [
        {
            "vascNo": ono,
            "auditResult": b["auditResult"],
            "isAuditThrough": b["order"].get("is_audit_through", ""),
            "status": b["order"].get("status", ""),
        }
    ]
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
                    "created": f.get("created") or "",
                    "source": "oms.oms_va_execute_file",
                    "verification": "verified",
                }
            )
        existing["attachmentStatus"] = "verified"
        # remove text_mention_only placeholder if present
        existing["uploadedAttachments"] = [
            a for a in existing["uploadedAttachments"] if a.get("verification") == "verified"
        ]


def build_cases(order_by_no, atoms_by, traces_by, files_by, attrs_by):
    chat = pd.read_excel(CHAT_XLSX, sheet_name="讨论明细", dtype=object).fillna("")
    mapping = pd.read_excel(OMS_XLSX, sheet_name="讨论-增值单映射", dtype=object).fillna("")

    map_by_seq = defaultdict(list)
    for _, r in mapping.iterrows():
        seq, ono = cell(r.get("discussionSeq")), cell(r.get("orderNo")).upper()
        if seq and ono:
            map_by_seq[seq].append(ono)

    chat_by_thread = {}
    for _, r in chat.iterrows():
        tid = cell(r.get("讨论ID"))
        if not tid:
            continue
        chat_by_thread[tid] = {
            "threadId": tid,
            "discussionSeq": cell(r.get("序号")),
            "chatName": cell(r.get("群名称")),
            "date": cell(r.get("日期")),
            "feishuUrl": cell(r.get("飞书链接")),
            "summary": cell(r.get("摘要")),
            "conversation": cell(r.get("对话详情")),
            "relatedNos": cell(r.get("关联单号")),
        }

    assigned = set()
    cases = []
    case_index = {}

    for tid, crow in chat_by_thread.items():
        seq = crow["discussionSeq"]
        ids = extract_ids(crow["relatedNos"] + "\n" + crow["conversation"] + "\n" + crow["summary"])
        vascs = uniq(map_by_seq.get(seq, []) + ids["vasc"])
        bundles = []
        for v in vascs:
            b = vasc_bundle(v, order_by_no, atoms_by, traces_by, files_by, attrs_by)
            if b:
                bundles.append(b)
                assigned.add(v.upper())
        conv = crow["conversation"]
        c = make_case(
            f"thread:{tid}",
            "thread",
            "chat_driven",
            [tid],
            [seq],
            [crow["chatName"]],
            [crow["date"]],
            [crow["feishuUrl"]],
            conv,
            "found" if conv else "not_found",
            crow["summary"],
            bundles,
            ids,
        )
        cases.append(c)
        case_index[c["caseId"]] = c

    # remaining OMS orders
    for ono in sorted(order_by_no.keys()):
        if ono in assigned:
            continue
        b = vasc_bundle(ono, order_by_no, atoms_by, traces_by, files_by, attrs_by)
        if not b:
            continue
        blob = "\n".join(
            b["requirements"] + b["backgrounds"] + b["sops"] + [a.get("attribute_value", "") for a in b["attrs"]]
        )
        ids = extract_ids(blob)
        if ids["eb"]:
            case_id, case_id_type = f"eb:{ids['eb'][0].upper()}", "eb"
        else:
            case_id, case_id_type = f"vasc:{ono}", "vasc"

        audit = b["auditResult"]
        has_sop = bool(b["sops"])
        has_req_or_att = bool(b["requirements"]) or bool(b["files"])
        ctype = "oms_direct_pass" if (audit == "通过" and has_sop and has_req_or_att) else "oms_other"

        if case_id in case_index:
            merge_bundle_into_case(case_index[case_id], b)
            assigned.add(ono)
            continue

        c = make_case(
            case_id,
            case_id_type,
            ctype,
            [],
            [],
            [],
            [],
            [],
            "",
            "not_found",
            "",
            [b],
            ids,
        )
        # if merging into existing chat case via EB? rare; skip
        cases.append(c)
        case_index[case_id] = c
        assigned.add(ono)

    # unique check / fix
    counts = Counter(c["caseId"] for c in cases)
    seen = Counter()
    for c in cases:
        seen[c["caseId"]] += 1
        if counts[c["caseId"]] > 1 and seen[c["caseId"]] > 1:
            c["caseId"] = f"{c['caseId']}#dup{seen[c['caseId']]}"

    return cases, chat_by_thread, mapping


def to_excel_row(c: dict) -> dict:
    def j(v):
        return json.dumps(v, ensure_ascii=False)

    return {
        "caseId": c["caseId"],
        "caseIdType": c["caseIdType"],
        "threadIds": j(c["threadIds"]),
        "discussionSeqs": j(c["discussionSeqs"]),
        "chatNames": j(c["chatNames"]),
        "discussionDates": j(c["discussionDates"]),
        "feishuUrls": j(c["feishuUrls"]),
        "conversationRaw": c["conversationRaw"],
        "conversationRawStatus": c["conversationRawStatus"],
        "summaryForIndex": c["summaryForIndex"],
        "vascNos": j(c["vascNos"]),
        "ebNos": j(c["ebNos"]),
        "wiNos": j(c["wiNos"]),
        "woNos": j(c["woNos"]),
        "mCodes": j(c["mCodes"]),
        "productNames": j(c["productNames"]),
        "serviceCodes": j(c["serviceCodes"]),
        "serviceNames": j(c["serviceNames"]),
        "sceneOverviewNames": j(c["sceneOverviewNames"]),
        "requirementDescriptions": j(c["requirementDescriptions"]),
        "requirementBackgrounds": j(c["requirementBackgrounds"]),
        "submittedFieldsJson": j(c["submittedFields"]),
        "uploadedAttachmentsJson": j(c["uploadedAttachments"]),
        "attachmentStatus": c["attachmentStatus"],
        "sops": j(c["sops"]),
        "auditResults": j(c["auditResults"]),
        "rejectReasons": j(c["rejectReasons"]),
        "finalStatuses": j(c["finalStatuses"]),
        "caseType": c["caseType"],
        "caseQualityFlags": j(c["caseQualityFlags"]),
    }


def sample_cases(cases: list[dict]) -> list[dict]:
    # Top 10 scenes by frequency across cases
    scene_cnt = Counter()
    for c in cases:
        scenes = c["sceneOverviewNames"] or ["(空/未知)"]
        for s in scenes:
            scene_cnt[s or "(空/未知)"] += 1
    top_scenes = [s for s, _ in scene_cnt.most_common(10)]

    picked = []
    used = set()

    def take(c, why, slot):
        if c["caseId"] in used:
            return False
        used.add(c["caseId"])
        item = deepcopy(c)
        item["whyThisSample"] = why
        item["sampleSlot"] = slot
        picked.append(item)
        return True

    for scene in top_scenes:
        pool = [c for c in cases if scene in (c["sceneOverviewNames"] or ["(空/未知)"]) or (scene == "(空/未知)" and not c["sceneOverviewNames"])]
        chat = [c for c in pool if c["caseType"] == "chat_driven" and c["conversationRawStatus"] == "found"]
        direct = [c for c in pool if c["caseType"] == "oms_direct_pass"]
        rejectish = [
            c
            for c in pool
            if any(a.get("auditResult") == "退回" for a in c["auditResults"])
            or any(
                any(k in (r.get("rejectReason") or "") for k in ["需求描述不清晰", "仓库暂时无法", "标准增值", "场景不符"])
                for r in c["rejectReasons"]
            )
        ]
        # prefer multi-vasc chat
        chat_ranked = sorted(chat, key=lambda c: (-len(c["vascNos"]), -len(c["conversationRaw"]), c["caseId"]))
        if chat_ranked:
            take(chat_ranked[0], f"场景「{scene}」chat_driven：有完整群聊，观察补全链路", "chat_driven")
        if rejectish:
            r = sorted(rejectish, key=lambda c: (-len(c["rejectReasons"]), c["caseId"]))[0]
            take(r, f"场景「{scene}」退回/取消相关：观察 unsupported / 转标准 / 仓库无法支持", "reject_or_cancel")
        # boundary / third
        rest = [c for c in pool if c["caseId"] not in used]
        rest = sorted(
            rest,
            key=lambda c: (
                0 if "possible_chat_completion_then_pass" in c["caseQualityFlags"] else 1,
                0 if c["attachmentStatus"] == "verified" else 1,
                -len(c["sops"]),
                c["caseId"],
            ),
        )
        if rest:
            take(rest[0], f"场景「{scene}」边界/补充样本", "boundary")
        # if still <3 and direct available
        for d in sorted(direct, key=lambda c: (-len(c.get("submittedFields") or []), c["caseId"])):
            if sum(1 for p in picked if scene in (p["sceneOverviewNames"] or ["(空/未知)"]) or (scene == "(空/未知)" and not p["sceneOverviewNames"])) >= 3:
                break
            take(d, f"场景「{scene}」补足", "补足")

    # extra 10 oms_direct_pass
    directs = [
        c
        for c in cases
        if c["caseType"] == "oms_direct_pass" and c["caseId"] not in used and c["sops"] and not c["threadIds"]
    ]
    directs = sorted(
        directs,
        key=lambda c: (
            0 if c["attachmentStatus"] == "verified" else 1,
            0 if c["requirementDescriptions"] else 1,
            -len(c.get("submittedFields") or []),
            c["caseId"],
        ),
    )
    for c in directs[:10]:
        take(c, "oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate", "oms_direct_pass")

    return picked, top_scenes


def write_readable(samples, top_scenes, notes):
    lines = []
    a = lines.append
    a("# Case-level 人工标注辅助样本（v2）")
    a("")
    a("- 本文件是探索/标注辅助，**不是**正式 eval / 规则 / SOP 资产。")
    a(f"- 样本数：{len(samples)}")
    a(f"- Top 场景：{', '.join(top_scenes)}")
    for n in notes:
        a(f"- 备注：{n}")
    a("")
    for i, s in enumerate(samples, 1):
        a(f"## S{i:03d} · `{s['caseId']}`")
        a("")
        a(f"- caseType：`{s['caseType']}` / caseIdType：`{s['caseIdType']}`")
        a(f"- 抽样槽位：{s.get('sampleSlot')}；原因：{s.get('whyThisSample')}")
        a(f"- VASC：{', '.join(s['vascNos']) or '（无）'}")
        a(f"- EB：{', '.join(s['ebNos']) or '（无）'}；WI：{', '.join(s['wiNos']) or '（无）'}；WO：{', '.join(s['woNos']) or '（无）'}；M：{', '.join(s['mCodes']) or '（无）'}")
        a(f"- 场景：{', '.join(s['sceneOverviewNames']) or '（空/未知）'}")
        a(f"- 服务：{', '.join(s['serviceNames']) or '（空）'}")
        a(f"- attachmentStatus：`{s['attachmentStatus']}`")
        a(f"- caseQualityFlags：{json.dumps(s['caseQualityFlags'], ensure_ascii=False)}")
        a(f"- 审核结果：{json.dumps(s['auditResults'], ensure_ascii=False)}")
        a(f"- 退回原因：{json.dumps(s['rejectReasons'], ensure_ascii=False)}")
        a("")
        a("### 完整群聊原文")
        a("")
        a(f"- conversationRawStatus：`{s['conversationRawStatus']}`")
        a("")
        if s["conversationRawStatus"] == "found" and s["conversationRaw"]:
            a(fence(s["conversationRaw"]))
        else:
            a("（无群聊原文 / not_found）")
        a("")
        a("### summaryForIndex（仅索引，不是原文）")
        a("")
        a(fence(s.get("summaryForIndex") or "（空）"))
        a("")
        a("### OMS 需求描述")
        a("")
        a(fence(json.dumps(s["requirementDescriptions"], ensure_ascii=False, indent=2)))
        a("")
        a("### 实际填写字段 submittedFields")
        a("")
        a(fence(json.dumps(s["submittedFields"], ensure_ascii=False, indent=2)))
        a("")
        a("### 上传附件 uploadedAttachments")
        a("")
        a(fence(json.dumps(s["uploadedAttachments"], ensure_ascii=False, indent=2)))
        a("")
        a("### SOP 原文")
        a("")
        a(fence(json.dumps(s["sops"], ensure_ascii=False, indent=2)))
        a("")
        a("### 需要人工判断的问题")
        a("")
        for q in s.get("questionsForHumanLabeling") or HUMAN_QUESTIONS:
            a(f"- {q}")
        a("")
        a("### humanLabelPlaceholder")
        a("")
        a("```json")
        a(json.dumps(s["humanLabelPlaceholder"], ensure_ascii=False, indent=2))
        a("```")
        a("")
        a("---")
        a("")
    (OUT / "sample-cases-readable.md").write_text("\n".join(lines), encoding="utf-8")


def write_profile(cases, orders, files, attrs, samples, checks):
    ctype = Counter(c["caseType"] for c in cases)
    cidt = Counter(c["caseIdType"] for c in cases)
    conv = Counter(c["conversationRawStatus"] for c in cases)
    att = Counter(c["attachmentStatus"] for c in cases)
    chat_hit_vasc = set()
    for c in cases:
        if c["caseType"] == "chat_driven":
            chat_hit_vasc.update(x.upper() for x in c["vascNos"])

    sop_cases = sum(1 for c in cases if c["sops"])
    submitted_cases = sum(1 for c in cases if c["submittedFields"])
    direct_pass = ctype.get("oms_direct_pass", 0)

    quality = [
        ("OMS全量非标增值单量", len(orders), "vas_type=NON_STANDARD_VASC, is_delete=N, 2026-04-21~2026-08-01"),
        ("群聊命中VASC单量(去重)", len(chat_hit_vasc), "出现在 chat_driven case 的 vascNos"),
        ("case总数", len(cases), "一行一个 case"),
        ("thread case数", cidt.get("thread", 0), "caseId=thread:<threadId>"),
        ("EB case数", cidt.get("eb", 0), "caseId=eb:<EB>"),
        ("VASC-only case数", cidt.get("vasc", 0), "caseId=vasc:<VASC>"),
        ("conversationRaw found", conv.get("found", 0), "来自讨论明细.对话详情"),
        ("conversationRaw not_found", conv.get("not_found", 0), ""),
        ("有submittedFields的case数", submitted_cases, "INPUT_NODE=SUBMIT 属性"),
        ("verified附件case数", att.get("verified", 0), "oms_va_execute_file 命中"),
        ("text_mention_only case数", att.get("text_mention_only", 0), "文本提及但无文件表记录"),
        ("not_found_in_oms_va_execute_file case数", att.get("not_found_in_oms_va_execute_file", 0), ""),
        ("直接通过且无群聊case数", direct_pass, "oms_direct_pass"),
        ("SOP覆盖率(case)", round(sop_cases / len(cases), 4) if cases else 0, "至少一条 SOP"),
        ("OMS execute_file行数", len(files), "窗口内"),
        ("OMS SUBMIT attr行数", len(attrs), "窗口内"),
        ("抽样样本数", len(samples), "sample-cases-readable.md"),
    ]

    lines = []
    a = lines.append
    a("# Case-level 数据画像（探索 v2）")
    a("")
    a(f"- 生成时间：`{datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')}`")
    a("- **本阶段是探索数据集，不是最终规则 / Eval / SOP / workflow 资产。**")
    a("- caseId 优先级：`threadId > EB异常单号 > VASC单号`")
    a("- `conversationRaw` 来源：原始群聊 Excel `讨论明细.对话详情`")
    a("- `summaryForIndex` **不是**群聊原文，仅索引摘要")
    a("- 附件真实来源：OMS `oms.oms_va_execute_file`（关联 `oms_va_atom_attr`）")
    a("- `text_mention_only` **不是**已上传事实")
    a("- `oms_direct_pass` 从 OMS 全量约 3962 单中补充的无群聊直接通过样本")
    a("")
    a("## 自检结果")
    a("")
    a("| check | result |")
    a("|---|---|")
    for k, v in checks.items():
        a(f"| {k} | {v} |")
    a("")
    a("## 质量摘要")
    a("")
    a("| metric | value | note |")
    a("|---|---|---|")
    for m, v, n in quality:
        a(f"| {m} | {v} | {n} |")
    a("")
    a("## caseType 分布")
    a("")
    a("| caseType | 数量 |")
    a("|---|---:|")
    for k, n in ctype.most_common():
        a(f"| {k} | {n} |")
    a("")
    a("## caseIdType 分布")
    a("")
    a("| caseIdType | 数量 |")
    a("|---|---:|")
    for k, n in cidt.most_common():
        a(f"| {k} | {n} |")
    a("")
    a("## conversationRawStatus / attachmentStatus")
    a("")
    a("| conversationRawStatus | 数量 |")
    a("|---|---:|")
    for k, n in conv.most_common():
        a(f"| {k} | {n} |")
    a("")
    a("| attachmentStatus | 数量 |")
    a("|---|---:|")
    for k, n in att.most_common():
        a(f"| {k} | {n} |")
    a("")
    a("## 主要数据缺口 / 需人工核准")
    a("")
    a("1. 群聊-VASC 映射依赖飞书讨论命中表；未命中讨论的 OMS 单不会进入 `chat_driven`。")
    a("2. EB case 合并仅基于文本抽取的 EB 号，可能漏并或误并，需人工抽查。")
    a("3. `possible_chat_completion_then_pass` / `possible_resubmit_*` 为启发式，不是金标。")
    a("4. SUBMIT 属性已截断至 4000 字符（导出时），超长字段需回 OMS 原表核对。")
    a("5. 客户姓名等敏感字段在可读样本中尽量少展示；完整字段在数据集内，注意权限。")
    a("6. 未生成正式 scene_rule / eval_cases / sop_case_library / workflow 规则。")
    a("")
    a("## 下一步人工标注")
    a("")
    a("对 `sample-cases-readable.md` 中每条样本填写 `humanLabelPlaceholder` 的 pipeline trace。")
    a("")

    (OUT / "data-profile.md").write_text("\n".join(lines), encoding="utf-8")

    # excel quality sheet
    qdf = pd.DataFrame([{"metric": m, "value": v, "note": n} for m, v, n in quality])
    return qdf, {
        "caseType": dict(ctype),
        "caseIdType": dict(cidt),
        "conversationRawStatus": dict(conv),
        "attachmentStatus": dict(att),
        "directPass": direct_pass,
        "caseCount": len(cases),
        "chatHitVasc": len(chat_hit_vasc),
        "sopCoverage": round(sop_cases / len(cases), 4) if cases else 0,
    }


def run_checks(cases, samples):
    checks = {}
    checks["json_case_count"] = len(cases)
    checks["caseId_unique"] = len(cases) == len({c["caseId"] for c in cases})
    verified = [c for c in cases if c["attachmentStatus"] == "verified" and c["uploadedAttachments"]]
    checks["verified_attachments_nonempty_examples"] = len(verified) >= 5
    chat_ok = [c for c in cases if c["caseType"] == "chat_driven" and c["conversationRaw"]]
    checks["chat_driven_conversation_nonempty_examples"] = len(chat_ok) >= 5
    direct_ok = [
        c
        for c in cases
        if c["caseType"] == "oms_direct_pass" and not c["threadIds"] and c["sops"] and c["conversationRawStatus"] == "not_found"
    ]
    checks["oms_direct_pass_no_chat_with_sop_examples"] = len(direct_ok) >= 5
    checks["sample_count"] = len(samples)
    checks["no_formal_assets_generated"] = True
    # spot examples
    checks["spot_verified_caseIds"] = [c["caseId"] for c in verified[:5]]
    checks["spot_chat_caseIds"] = [c["caseId"] for c in chat_ok[:5]]
    checks["spot_direct_caseIds"] = [c["caseId"] for c in direct_ok[:5]]
    return checks


def main():
    print("loading OMS cache...")
    orders, atoms, traces, files, attrs, order_by_no, atoms_by, traces_by, files_by, attrs_by = build_indexes()
    print("orders", len(orders), "atoms", len(atoms), "traces", len(traces), "files", len(files), "attrs", len(attrs))
    print("building cases...")
    cases, chat_by_thread, mapping = build_cases(order_by_no, atoms_by, traces_by, files_by, attrs_by)
    print("cases", len(cases), "threads", len(chat_by_thread))

    meta = {
        "sourceFiles": [
            str(OMS_XLSX).replace("\\", "/"),
            str(CHAT_XLSX).replace("\\", "/"),
            "oms.oms_va_order",
            "oms.oms_va_atom",
            "oms.oms_va_atom_attr",
            "oms.oms_va_order_trace",
            "oms.oms_va_execute_file",
        ],
        "omsQueryWindow": {
            "orderDateFrom": "2026-04-21 00:00:00",
            "orderDateTo": "2026-08-01 00:00:00",
            "timezone": "Asia/Shanghai",
        },
        "caseIdPriority": ["threadId", "EB", "VASC"],
        "notes": [
            "探索数据集，不是正式规则/Eval/SOP/workflow 资产",
            "conversationRaw 来自讨论明细.对话详情；summaryForIndex 不是原文",
            "附件以 oms_va_execute_file 为准；text_mention_only 不是已上传事实",
            "oms_direct_pass 来自 OMS 全量 NON_STANDARD_VASC 补充",
            "submittedFields 为 INPUT_NODE=SUBMIT 属性（导出时 value 截断 4000）",
        ],
        "generatedAt": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "omsOrderCount": len(orders),
        "caseCount": len(cases),
    }
    payload = {"meta": meta, "cases": cases}
    json_path = OUT / "case_level_dataset.json"
    json_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print("wrote", json_path)

    samples, top_scenes = sample_cases(cases)
    notes = [
        f"Top10 场景抽样 + 额外 oms_direct_pass；实际样本 {len(samples)} 条",
    ]
    write_readable(samples, top_scenes, notes)
    print("wrote sample-cases-readable.md", len(samples))

    checks = run_checks(cases, samples)
    qdf, summary = write_profile(cases, orders, files, attrs, samples, checks)

    # excel
    rows = [to_excel_row(c) for c in cases]
    df = pd.DataFrame(rows)
    xlsx_path = OUT / "case_level_dataset.xlsx"
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as w:
        df.to_excel(w, sheet_name="case_level_dataset", index=False)
        qdf.to_excel(w, sheet_name="data_quality_summary", index=False)
    print("wrote", xlsx_path, "rows", len(df))

    # verify excel readable / json parseable
    _ = pd.read_excel(xlsx_path, sheet_name="case_level_dataset", nrows=5)
    _ = json.loads(json_path.read_text(encoding="utf-8"))
    checks["excel_readable"] = True
    checks["json_parseable"] = True
    checks["excel_main_rows"] = len(df)

    # rewrite profile with final checks
    write_profile(cases, orders, files, attrs, samples, checks)

    summary_out = {
        "outDir": str(OUT),
        "files": [
            "case_level_dataset.xlsx",
            "case_level_dataset.json",
            "data-profile.md",
            "sample-cases-readable.md",
        ],
        "summary": summary,
        "checks": checks,
        "sampleCount": len(samples),
        "topScenes": top_scenes,
    }
    (OUT / "_run_summary.json").write_text(json.dumps(summary_out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary_out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
