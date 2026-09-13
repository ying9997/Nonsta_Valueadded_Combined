# coding: utf-8
"""Split case_level_dataset into 入库 / 库内 / 出库."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path

import pandas as pd

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2")
SPLIT = OUT / "by_flow"
SPLIT.mkdir(parents=True, exist_ok=True)
CACHE = OUT / "_oms_cache"

FLOWS = ("入库", "库内", "出库")


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
        return "出库"  # 尾程并入出库
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
        return "入库"  # 异常单多数挂入库链路；在 flags 里保留 unusual
    return None


def classify_text_blob(blob: str) -> str | None:
    t = blob or ""
    # order matters: more specific first
    hits = []
    if re.search(r"入库|上架|WI\d+", t):
        hits.append("入库")
    if re.search(r"库内|货权|盘点|拆分SKU|良品|不良", t):
        hits.append("库内")
    if re.search(r"出库|WO\d+|尾程|面单|清关|快递", t):
        hits.append("出库")
    if not hits:
        return None
    return Counter(hits).most_common(1)[0][0]


def classify_case(c: dict, va_by_order: dict) -> tuple[str, list[str]]:
    votes = Counter()
    flags = []

    scenes = c.get("sceneOverviewNames") or []
    for s in scenes:
        flow = classify_scene(s)
        if flow:
            votes[flow] += 3  # scene 权重大
            if cell(s).startswith("【尾程】"):
                flags.append("尾程并入出库")

    for ono in c.get("vascNos") or []:
        src = va_by_order.get(cell(ono).upper(), "")
        flow = classify_va_source(src)
        if flow:
            votes[flow] += 2
            if src.upper() == "UNUSUAL":
                flags.append("va_source=UNUSUAL→入库启发式")

    # service / product hints
    blob = " ".join(
        (c.get("serviceNames") or [])
        + (c.get("productNames") or [])
        + [x.get("requirementDescription", "") for x in (c.get("requirementDescriptions") or [])]
    )
    flow = classify_text_blob(blob)
    if flow:
        votes[flow] += 1

    # chat summary/conversation weak signal
    flow2 = classify_text_blob((c.get("summaryForIndex") or "") + "\n" + (c.get("conversationRaw") or "")[:2000])
    if flow2:
        votes[flow2] += 1

    if not votes:
        flags.append("cannot_classify_flow→出库兜底需人工")
        return "出库", flags  # last resort; marked for review

    # tie-break: 入库 > 库内 > 出库 by business priority? better: highest score then stable order
    best = votes.most_common()
    top_score = best[0][1]
    tops = [k for k, v in best if v == top_score]
    if len(tops) > 1:
        flags.append(f"multi_flow_tie:{'/'.join(tops)}")
        # prefer scene-driven order 入库,库内,出库
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
        "needReviewFlags": sum(1 for c in cases if any("需人工" in f or "tie" in f or "兜底" in f for f in (c.get("flowClassifyFlags") or []))),
    }


def main():
    payload = json.loads((OUT / "case_level_dataset.json").read_text(encoding="utf-8"))
    cases = payload["cases"]
    orders = pd.read_csv(CACHE / "orders.csv", dtype=object).fillna("")
    va_by_order = {cell(r.order_no).upper(): cell(r.va_source) for _, r in orders.iterrows()}

    buckets = {k: [] for k in FLOWS}
    for c in cases:
        flow, flags = classify_case(c, va_by_order)
        cc = deepcopy(c)
        cc["flowBucket"] = flow
        cc["flowClassifyFlags"] = flags + list(c.get("caseQualityFlags") or [])
        # keep original quality flags separate too
        cc["flowClassifyFlags"] = flags
        buckets[flow].append(cc)

    # write per-flow outputs
    overview_lines = [
        "# Case 按作业环节拆分（入库 / 库内 / 出库）",
        "",
        "## thread 口径说明",
        "",
        "- **一条 thread = 一条群聊讨论线程（一个 `讨论ID` / `threadId`）= 一个 case。**",
        "- 不是把所有对话汇总成一条；同一业务若有多段独立讨论，会是多个 `thread:` case。",
        "- 一个 thread case 下可以挂多个 VASC / EB / WI。",
        "",
        "## 拆分规则（优先级）",
        "",
        "1. `sceneOverviewNames` 前缀：`【入库】` / `【库内】` / `【出库】`",
        "2. `【尾程】` **并入出库**（并打 flag：`尾程并入出库`）",
        "3. OMS `va_source`：INBOUND→入库，INHOUSE→库内，OUTBOUND/REVA→出库，UNUSUAL→入库（启发式）",
        "4. 服务名/需求/群聊摘要关键词弱投票",
        "5. 仍无法判断 → 暂时归入出库，并标记 `cannot_classify_flow→出库兜底需人工`",
        "",
        f"- 源 case 总数：{len(cases)}",
        f"- 拆分输出目录：`{SPLIT}`",
        "",
        "| flow | case数 | thread | oms_direct_pass | verified附件 | conversation found |",
        "|---|---:|---:|---:|---:|---:|",
    ]

    index = {"sourceCaseCount": len(cases), "flows": {}}

    for flow in FLOWS:
        subset = buckets[flow]
        meta = deepcopy(payload["meta"])
        meta["flowBucket"] = flow
        meta["splitNote"] = "按入库/库内/出库拆分的探索子集；非正式资产"
        meta["caseCount"] = len(subset)
        out_json = {
            "meta": meta,
            "cases": subset,
        }
        jp = SPLIT / f"case_level_dataset_{flow}.json"
        jp.write_text(json.dumps(out_json, ensure_ascii=False), encoding="utf-8")

        rows = [to_excel_row(c) for c in subset]
        df = pd.DataFrame(rows)
        xp = SPLIT / f"case_level_dataset_{flow}.xlsx"
        with pd.ExcelWriter(xp, engine="openpyxl") as w:
            df.to_excel(w, sheet_name="case_level_dataset", index=False)
            q = summarize(subset)
            pd.DataFrame(
                [{"metric": k, "value": json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else v} for k, v in q.items()]
            ).to_excel(w, sheet_name="data_quality_summary", index=False)

        # lightweight readable samples: up to 8 per flow
        sample_md = SPLIT / f"sample-cases-readable_{flow}.md"
        samples = []
        # prefer chat multi-vasc, direct pass, reject
        chat = sorted(
            [c for c in subset if c["caseType"] == "chat_driven" and c["conversationRaw"]],
            key=lambda c: (-len(c.get("vascNos") or []), -len(c.get("conversationRaw") or "")),
        )
        direct = [c for c in subset if c["caseType"] == "oms_direct_pass"]
        reject = [c for c in subset if c.get("rejectReasons")]
        for pool, n in ((chat, 3), (direct, 3), (reject, 2)):
            for c in pool:
                if c["caseId"] in {s["caseId"] for s in samples}:
                    continue
                samples.append(c)
                if len([s for s in samples if True]) >= sum((3, 3, 2)[: (3 if pool is chat else 6 if pool is direct else 8)]):
                    pass
            # simpler cap later
        # unique cap 8
        seen = set()
        picked = []
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

        lines = [f"# {flow} 抽样可读稿（探索拆分）", "", f"- case 子集规模：{len(subset)}", f"- 本文件抽样：{len(picked)}", ""]
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
        sample_md.write_text("\n".join(lines), encoding="utf-8")

        q = summarize(subset)
        index["flows"][flow] = {
            "caseCount": q["caseCount"],
            "summary": q,
            "files": [
                str(jp.name),
                str(xp.name),
                str(sample_md.name),
            ],
        }
        overview_lines.append(
            f"| {flow} | {q['caseCount']} | {q['caseType'].get('chat_driven',0)} | {q['caseType'].get('oms_direct_pass',0)} | {q['attachmentStatus'].get('verified',0)} | {q['conversationRawStatus'].get('found',0)} |"
        )

    # flag stats
    flag_cnt = Counter()
    for flow in FLOWS:
        for c in buckets[flow]:
            for f in c.get("flowClassifyFlags") or []:
                flag_cnt[f] += 1
    overview_lines += [
        "",
        "## 分类 flag 统计",
        "",
        "| flag | 次数 |",
        "|---|---:|",
    ]
    for k, n in flag_cnt.most_common():
        overview_lines.append(f"| {k} | {n} |")
    overview_lines += [
        "",
        "## 文件清单",
        "",
        "- `case_level_dataset_入库.json` / `.xlsx`",
        "- `case_level_dataset_库内.json` / `.xlsx`",
        "- `case_level_dataset_出库.json` / `.xlsx`",
        "- `sample-cases-readable_*.md`",
        "",
        "完整原文仍以各 JSON 为准（Excel 可能截断超长单元格）。",
        "",
    ]
    (SPLIT / "README.md").write_text("\n".join(overview_lines), encoding="utf-8")
    (SPLIT / "_split_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
