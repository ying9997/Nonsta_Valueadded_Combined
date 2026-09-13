# coding: utf-8
"""Re-split cases: 入库 / 库内 / 出库 / 尾程 / 其他."""
from __future__ import annotations

import json
import re
from collections import Counter
from copy import deepcopy
from pathlib import Path

import pandas as pd

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2")
SPLIT = OUT / "by_flow"
SPLIT.mkdir(parents=True, exist_ok=True)
CACHE = OUT / "_oms_cache"

FLOWS = ("入库", "库内", "出库", "尾程", "其他")


def cell(v) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s.lower() in {"nan", "none", "null"} else s


def classify_scene(scene: str) -> str | None:
    s = cell(scene)
    if s.startswith("【入库】"):
        return "入库"
    if s.startswith("【库内】"):
        return "库内"
    if s.startswith("【出库】"):
        return "出库"
    if s.startswith("【尾程】"):
        return "尾程"
    return None


def classify_va_source(src: str) -> str | None:
    u = cell(src).upper()
    if u == "INBOUND":
        return "入库"
    if u == "INHOUSE":
        return "库内"
    if u in {"OUTBOUND", "REVA"}:
        return "出库"
    if u == "UNUSUAL":
        return "其他"
    return None


def classify_text_blob(blob: str) -> str | None:
    t = blob or ""
    hits = []
    if re.search(r"尾程|清关|面单|承运|快递询价", t):
        hits.append("尾程")
    if re.search(r"入库|上架|WI\d+", t):
        hits.append("入库")
    if re.search(r"库内|货权|盘点|拆分SKU|良品|不良", t):
        hits.append("库内")
    if re.search(r"出库|WO\d+", t):
        hits.append("出库")
    if not hits:
        return None
    return Counter(hits).most_common(1)[0][0]


def classify_case(c: dict, va_by_order: dict) -> tuple[str, list[str]]:
    votes = Counter()
    flags = []

    # UNUSUAL 单独进「其他」（用户确认）
    unusual_nos = []
    for ono in c.get("vascNos") or []:
        src = va_by_order.get(cell(ono).upper(), "")
        if src.upper() == "UNUSUAL":
            unusual_nos.append(ono)
    if unusual_nos and len(unusual_nos) == len(c.get("vascNos") or []):
        return "其他", ["va_source=UNUSUAL→其他"]
    if unusual_nos:
        flags.append("partial_UNUSUAL_mixed_case")

    for s in c.get("sceneOverviewNames") or []:
        flow = classify_scene(s)
        if flow:
            votes[flow] += 3

    for ono in c.get("vascNos") or []:
        src = va_by_order.get(cell(ono).upper(), "")
        if src.upper() == "UNUSUAL":
            votes["其他"] += 2
            continue
        flow = classify_va_source(src)
        if flow:
            votes[flow] += 2

    blob = " ".join(
        (c.get("serviceNames") or [])
        + (c.get("productNames") or [])
        + [x.get("requirementDescription", "") for x in (c.get("requirementDescriptions") or [])]
    )
    flow = classify_text_blob(blob)
    if flow:
        votes[flow] += 1

    flow2 = classify_text_blob((c.get("summaryForIndex") or "") + "\n" + (c.get("conversationRaw") or "")[:2000])
    if flow2:
        votes[flow2] += 1

    if not votes:
        return "其他", flags + ["cannot_classify→其他"]

    best = votes.most_common()
    top_score = best[0][1]
    tops = [k for k, v in best if v == top_score]
    if len(tops) > 1:
        # 交叉场景不单独复核：稳定次序破局
        flags.append(f"multi_flow_tie:{'/'.join(tops)}→resolved")
        for pref in FLOWS:
            if pref in tops:
                return pref, flags
    return best[0][0], flags


def to_excel_row(c: dict) -> dict:
    def j(v):
        return json.dumps(v, ensure_ascii=False)

    return {
        "caseId": c["caseId"],
        "caseIdType": c["caseIdType"],
        "flowBucket": c.get("flowBucket"),
        "flowClassifyFlags": j(c.get("flowClassifyFlags") or []),
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


def summarize(cases: list[dict]) -> dict:
    return {
        "caseCount": len(cases),
        "caseType": dict(Counter(c["caseType"] for c in cases)),
        "caseIdType": dict(Counter(c["caseIdType"] for c in cases)),
        "conversationRawStatus": dict(Counter(c["conversationRawStatus"] for c in cases)),
        "attachmentStatus": dict(Counter(c["attachmentStatus"] for c in cases)),
        "uniqueVasc": len({v.upper() for c in cases for v in (c.get("vascNos") or [])}),
        "threadCases": sum(1 for c in cases if c["caseIdType"] == "thread"),
    }


def write_samples(flow: str, subset: list[dict], path: Path):
    chat = sorted(
        [c for c in subset if c["caseType"] == "chat_driven" and c.get("conversationRaw")],
        key=lambda c: (-len(c.get("vascNos") or []), -len(c.get("conversationRaw") or "")),
    )
    direct = [c for c in subset if c["caseType"] == "oms_direct_pass"]
    reject = [c for c in subset if c.get("rejectReasons")]
    seen, picked = set(), []
    for pool in (chat, direct, reject, subset):
        for c in pool:
            if c["caseId"] in seen:
                continue
            seen.add(c["caseId"])
            picked.append(c)
            if len(picked) >= 8:
                break
        if len(picked) >= 8:
            break

    lines = [f"# {flow} 抽样可读稿（探索拆分 v2）", "", f"- case 子集：{len(subset)}", f"- 本文件抽样：{len(picked)}", ""]
    for i, s in enumerate(picked, 1):
        lines += [
            f"## S{i:02d} · `{s['caseId']}`",
            "",
            f"- flowBucket：`{flow}`",
            f"- caseType：`{s['caseType']}`",
            f"- VASC：{', '.join(s.get('vascNos') or []) or '（无）'}",
            f"- 场景：{', '.join(s.get('sceneOverviewNames') or []) or '（空）'}",
            f"- attachmentStatus：`{s.get('attachmentStatus')}`",
            f"- classifyFlags：{json.dumps(s.get('flowClassifyFlags') or [], ensure_ascii=False)}",
            "",
            "### conversationRaw",
            "",
            "```text",
            (s.get("conversationRaw") or "（空）")[:8000],
            "```",
            "",
            "### SOP",
            "",
            "```json",
            json.dumps(s.get("sops") or [], ensure_ascii=False, indent=2)[:5000],
            "```",
            "",
            "---",
            "",
        ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    # clean old 3-way files names that conflict conceptually
    for p in SPLIT.glob("case_level_dataset_*.json"):
        p.unlink(missing_ok=True)
    for p in SPLIT.glob("case_level_dataset_*.xlsx"):
        p.unlink(missing_ok=True)
    for p in SPLIT.glob("sample-cases-readable_*.md"):
        p.unlink(missing_ok=True)

    payload = json.loads((OUT / "case_level_dataset.json").read_text(encoding="utf-8"))
    cases = payload["cases"]
    orders = pd.read_csv(CACHE / "orders.csv", dtype=object).fillna("")
    va_by_order = {cell(r.order_no).upper(): cell(r.va_source) for _, r in orders.iterrows()}

    buckets = {k: [] for k in FLOWS}
    for c in cases:
        flow, flags = classify_case(c, va_by_order)
        cc = deepcopy(c)
        cc["flowBucket"] = flow
        cc["flowClassifyFlags"] = flags
        buckets[flow].append(cc)

    overview = [
        "# Case 按作业环节拆分 v2（入库 / 库内 / 出库 / 尾程 / 其他）",
        "",
        "## 已确认口径",
        "",
        "- **尾程单独成桶**，不并入出库",
        "- **UNUSUAL 归「其他」**，不归入库",
        "- 交叉场景 tie **不单独拎出人工复核**；按稳定优先级打破平局：入库 > 库内 > 出库 > 尾程 > 其他",
        "",
        "## thread 口径",
        "",
        "- 一条 thread = 一个讨论ID = 一个 case（不是全对话汇总）",
        "",
        f"- 源 case 总数：{len(cases)}",
        f"- 输出目录：`{SPLIT}`",
        "",
        "| flow | case数 | thread(chat_driven) | oms_direct_pass | verified附件 | conversation found |",
        "|---|---:|---:|---:|---:|---:|",
    ]

    index = {"sourceCaseCount": len(cases), "rules": {
        "尾程": "单独",
        "UNUSUAL": "其他",
        "tie": "不单独复核，稳定破局",
    }, "flows": {}}

    flag_cnt = Counter()
    for flow in FLOWS:
        subset = buckets[flow]
        for c in subset:
            for f in c.get("flowClassifyFlags") or []:
                flag_cnt[f] += 1

        meta = deepcopy(payload["meta"])
        meta["flowBucket"] = flow
        meta["splitNote"] = "按入库/库内/出库/尾程/其他拆分；非正式资产"
        meta["caseCount"] = len(subset)
        out_json = {"meta": meta, "cases": subset}
        jp = SPLIT / f"case_level_dataset_{flow}.json"
        jp.write_text(json.dumps(out_json, ensure_ascii=False), encoding="utf-8")

        df = pd.DataFrame([to_excel_row(c) for c in subset])
        xp = SPLIT / f"case_level_dataset_{flow}.xlsx"
        with pd.ExcelWriter(xp, engine="openpyxl") as w:
            df.to_excel(w, sheet_name="case_level_dataset", index=False)
            q = summarize(subset)
            pd.DataFrame(
                [{"metric": k, "value": json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else v} for k, v in q.items()]
            ).to_excel(w, sheet_name="data_quality_summary", index=False)

        sp = SPLIT / f"sample-cases-readable_{flow}.md"
        write_samples(flow, subset, sp)

        q = summarize(subset)
        index["flows"][flow] = {"caseCount": q["caseCount"], "summary": q, "files": [jp.name, xp.name, sp.name]}
        overview.append(
            f"| {flow} | {q['caseCount']} | {q['caseType'].get('chat_driven', 0)} | {q['caseType'].get('oms_direct_pass', 0)} | {q['attachmentStatus'].get('verified', 0)} | {q['conversationRawStatus'].get('found', 0)} |"
        )

    overview += ["", "## flag 统计", "", "| flag | 次数 |", "|---|---:|"]
    for k, n in flag_cnt.most_common(30):
        overview.append(f"| {k} | {n} |")
    overview += [
        "",
        "## 文件",
        "",
        "- `case_level_dataset_入库/库内/出库/尾程/其他.json|.xlsx`",
        "- `sample-cases-readable_*.md`",
        "",
        "完整原文以 JSON 为准。",
        "",
    ]
    (SPLIT / "README.md").write_text("\n".join(overview), encoding="utf-8")
    (SPLIT / "_split_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(index["flows"][f]["caseCount"] for f in FLOWS)
    print(json.dumps({"total": total, "flows": {f: index["flows"][f]["caseCount"] for f in FLOWS}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
