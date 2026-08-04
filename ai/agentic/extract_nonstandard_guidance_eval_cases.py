#!/usr/bin/env python3
"""Extract candidate eval cases for non-standard in-page VAS guidance.

This prototype intentionally avoids enriching cases with system data that is
not present in the source CSV. Page context, scoped VASC lists, audit outcome,
fees, and final service support status must be injected or reviewed later.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


DEFAULT_INPUT = Path("agentic/qa-gen_base.csv")
DEFAULT_OUTPUT_DIR = Path("agentic/outputs/nonstandard_guidance_eval_cases")

TEXT_FIELDS = [
    "question",
    "question_mock",
    "possible_scenarios",
    "solution_human",
    "sys_solution_final",
    "sys_summary",
    "commands",
    "tags",
    "category",
    "categories",
    "categories_od",
]

BRANCHES = {
    "2d": "2d_standard_value_added_correction",
    "2a": "2a_named_nonstandard_service_direct_select",
    "2b": "2b_other_service_demand_sop",
}

STANDARD_TERMS = [
    "原单上架",
    "新单上架",
    "直接上架",
    "补贴原商品条码",
    "补充原商品条码",
    "更换新商品条码",
    "补贴包裹条码",
    "更换包裹条码",
    "换标",
    "贴标",
    "换包装",
    "更换商品包装",
    "商品开箱拍照",
    "异常包裹开箱拍照",
    "上架前销毁",
    "库内销毁",
    "上架前自提",
]

NAMED_NONSTANDARD_TERMS = [
    "入库非标拍照或提供视频",
    "入库-异常包裹开箱拍照",
    "入库非标增值（特批）",
    "入库非标增值(特批)",
    "库内非标增值（免审核）",
    "库内非标增值（需审核）",
    "库内非标增值（特批）",
    "出库非标增值（特批）",
    "包裹串仓异常调拨",
    "上架前自提（无需WINIT打托）",
    "上架前自提（需WINIT打托）",
]

OTHER_SERVICE_TERMS = [
    "入库其他服务需求",
    "库内其他服务需求",
    "出库其他服务需求",
    "其他服务需求",
    "其他特殊需求",
    "特殊服务需求",
]

ATTACHMENT_TERMS = [
    "附件",
    "上传",
    "文件",
    "模板",
    "表格",
    "图片",
    "照片",
    "拍照",
    "视频",
    "箱单",
    "SOP",
    "操作说明",
]

RELEVANCE_TERMS = [
    "非标",
    "增值",
    "异常单",
    "入库",
    "库内",
    "出库",
    "上架",
    "条码",
    "SKU",
    "包裹",
    "商品",
    "销毁",
    "自提",
    "服务需求",
] + STANDARD_TERMS + NAMED_NONSTANDARD_TERMS + OTHER_SERVICE_TERMS

IMPORTANT_SOURCE_FIELDS = [
    "question",
    "possible_scenarios",
    "sys_summary",
    "sys_solution_final",
]


def compact(value: str, limit: int = 900) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip() + "..."


def mask_sensitive(text: str) -> str:
    text = text or ""
    text = re.sub(r"https?://\S+", "<URL>", text, flags=re.I)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "<邮箱>", text)
    text = re.sub(r"(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)", "<手机号>", text)
    text = re.sub(r"\bRM[A-Z0-9]{4,}\b", "<退货条码>", text, flags=re.I)
    text = re.sub(r"\b(?:WI|WO|RT|EF|OW|OSF|VASC)[A-Z0-9-]{6,}\b", "<单号>", text, flags=re.I)
    text = re.sub(r"\b[A-Z]{2,}[A-Z0-9-]{8,}\b", "<编号>", text)
    text = re.sub(r"\b\d{10,}\b", "<长数字编号>", text)
    text = re.sub(r"(SKU|sku)[：:\s-]*[A-Za-z0-9_-]{4,}", r"\1 <SKU_1>", text)
    text = re.sub(r"([A-Za-z]:\\|/)[^\s，。；,;]+", "<本地路径>", text)
    return text


def contains_any(text: str, terms: list[str]) -> list[str]:
    low = text.lower()
    return [term for term in terms if term.lower() in low]


def classify_branch(text: str) -> tuple[str | None, list[str]]:
    other_hits = contains_any(text, OTHER_SERVICE_TERMS)
    named_hits = contains_any(text, NAMED_NONSTANDARD_TERMS)
    standard_hits = contains_any(text, STANDARD_TERMS)

    if other_hits or ("SOP" in text and "非标" in text and "需求" in text):
        return BRANCHES["2b"], other_hits or ["SOP + 非标需求"]
    if named_hits:
        return BRANCHES["2a"], named_hits
    if standard_hits and ("非标" in text or "增值" in text or "异常单" in text):
        return BRANCHES["2d"], standard_hits
    if "非标" in text and ("拍照" in text or "视频" in text or "自提" in text):
        return BRANCHES["2a"], contains_any(text, ["拍照", "视频", "自提"])
    return None, []


def relevance_score(row: dict[str, str], text: str, branch: str | None) -> int:
    score = 0
    category = row.get("category", "") + row.get("categories", "") + row.get("categories_od", "")
    if any(term in category for term in ["入库", "库存", "出库", "退货"]):
        score += 8
    if branch:
        score += 20
    score += min(25, len(set(contains_any(text, RELEVANCE_TERMS))) * 2)
    if "非标" in text:
        score += 12
    if "增值" in text:
        score += 8
    if "异常单" in text:
        score += 7
    if "客户如咨询" in text or "客户" in text:
        score += 3
    if len(row.get("question", "")) > 30:
        score += 3
    if contains_any(text, ATTACHMENT_TERMS):
        score += 4
    return score


def evidence_snippets(row: dict[str, str]) -> list[dict[str, str]]:
    snippets: list[dict[str, str]] = []
    for field in IMPORTANT_SOURCE_FIELDS:
        value = compact(mask_sensitive(row.get(field, "")), 500)
        if value:
            snippets.append({"sourceField": field, "text": value})
    return snippets[:4]


def attachment_check(text: str) -> tuple[list[str], dict[str, Any]]:
    hits = contains_any(text, ATTACHMENT_TERMS)
    if not hits:
        return [], {
            "status": "not_checked",
            "issues": ["源记录未提供附件元数据，且正文未明显提到附件/上传。"],
            "suggestions": ["后续接入真实客服会话或工单附件表后再检查。"],
        }

    requirements = [
        f"候选信号：源文本提到 {', '.join(sorted(set(hits)))}；需人工确认是否属于该服务项/SOP 的附件要求。"
    ]
    check = {
        "status": "warning",
        "issues": [
            "CSV 未提供附件列表、文件名、文件类型、上传时间或 URL 字段，不能判断客户是否实际上传。",
            "未经过飞书群聊 TOP3 人工确认，不能写成已支持的附件校验规则。",
        ],
        "suggestions": [
            "补充工单附件表或客服原始会话附件元数据。",
            "人工核对附件文件名/备注是否包含脱敏单号、SKU 或 SOP 所需字段。",
        ],
    }
    return requirements, check


def missing_fields(text: str, attachment_hits: list[str]) -> list[str]:
    fields: list[str] = []
    if "单号" in text or "订单" in text or "入库单" in text or "出库单" in text:
        fields.append("related_order_or_exception_no")
    if "SKU" in text.upper() or "商品" in text:
        fields.append("sku_or_product_scope")
    if "包裹" in text or "条码" in text:
        fields.append("package_or_barcode_scope")
    if "仓库" in text or "目的仓" in text:
        fields.append("warehouse_or_psc")
    if attachment_hits:
        fields.append("attachment_metadata")
    if "SOP" in text or "操作" in text or "需求" in text:
        fields.append("operation_steps_or_sop")
    return sorted(set(fields))


def extract_service_from_evidence(route: str, hits: list[str]) -> tuple[dict[str, str], dict[str, str]]:
    if not hits:
        return {}, {}
    name = hits[0]
    if route == BRANCHES["2d"]:
        return {"nameFromEvidence": name, "confidence": "candidate_only"}, {}
    if route in {BRANCHES["2a"], BRANCHES["2b"]}:
        return {}, {"nameFromEvidence": name, "confidence": "candidate_only"}
    return {}, {}


def build_case(row: dict[str, str], route: str, route_hits: list[str], rank: int) -> dict[str, Any]:
    qid = row.get("qid", "").strip() or f"row_{rank}"
    text = "\n".join(row.get(field, "") or "" for field in TEXT_FIELDS)
    masked_question = compact(mask_sensitive(row.get("question", "")), 1200)
    attachment_requirements, attachment_check_obj = attachment_check(text)
    attachment_hits = contains_any(text, ATTACHMENT_TERMS)
    selected_vasc, selected_service = extract_service_from_evidence(route, route_hits)

    needs_enrichment = [
        "pageContext: 需要前端传入当前异常单页、增值产品页或下单页上下文。",
        "exceptionContext: 需要异常单号、异常编码、异常名称、异常对象、入库/出库/库内节点。",
        "systemScopedVascList: 需要页面或接口返回的当前可选 VASC/服务项列表。",
        "currentPageValues: 需要客户当前已选产品、服务项、已填字段和已上传附件状态。",
    ]
    evidence_gap = [
        "qa-gen_base.csv 是 QA/知识库形态导出，不包含逐轮客服/客户角色日志。",
        "源记录未提供真实附件元数据；附件检查只能作为候选信号。",
        "源记录不包含费用、审核结果、当前页面可选 VASC 列表或最终提交成功状态。",
    ]
    if not row.get("possible_scenarios"):
        evidence_gap.append("possible_scenarios 为空或未提供，缺少客户多轮补充表达。")

    return {
        "caseId": f"csdb-nonstandard-guide-{qid}",
        "sourceType": "customer_service_db",
        "sourceRef": f"agentic/qa-gen_base.csv#qid={qid}",
        "evidenceSnippets": evidence_snippets(row),
        "needsEnrichment": needs_enrichment,
        "evidenceGap": evidence_gap,
        "humanReviewStatus": "pending",
        "testCase": {
            "pageContext": {},
            "exceptionContext": {},
            "systemScopedVascList": [],
            "currentPageValues": {},
            "customerInput": masked_question,
            "conversationHistory": [
                {
                    "role": "customer",
                    "content": masked_question,
                    "sourceField": "question",
                }
            ],
            "expected": {
                "route": route,
                "selectedVasc": selected_vasc,
                "selectedService": selected_service,
                "missingFields": missing_fields(text, attachment_hits),
                "confirmationSummary": f"候选确认：{compact(masked_question, 220)}",
                "fieldSuggestions": {},
                "attachmentRequirements": attachment_requirements,
                "attachmentCheck": attachment_check_obj,
            },
            "forbiddenOutputs": [
                "不得声称该候选已经进入金标集。",
                "不得补写源记录没有的完整单号、SKU、客户名、联系方式、地址或附件 URL。",
                "不得凭空输出 VASC 编码、服务项编码、费用、审核通过/驳回结论。",
                "不得把附件候选信号写成已支持规则；需 TOP3 人工确认后再固化。",
                "不得把非标/其他服务需求作为所有特殊需求的默认兜底，应先排除标准 VASC/明确原子。",
            ],
        },
    }


def iter_candidates(input_path: Path) -> list[tuple[int, str, dict[str, Any]]]:
    candidates: list[tuple[int, str, dict[str, Any]]] = []
    with input_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            text = "\n".join(row.get(field, "") or "" for field in TEXT_FIELDS)
            route, route_hits = classify_branch(text)
            score = relevance_score(row, text, route)
            if not route or score < 30:
                continue
            case = build_case(row, route, route_hits, idx)
            case["_meta"] = {
                "score": score,
                "category": row.get("category", ""),
                "routeEvidenceTerms": route_hits,
            }
            candidates.append((score, route, case))
    candidates.sort(key=lambda item: (-item[0], item[2]["caseId"]))
    return candidates


def select_balanced(candidates: list[tuple[int, str, dict[str, Any]]], limit: int) -> list[dict[str, Any]]:
    target_per_route = max(1, limit // 3)
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for _, route, case in candidates:
        buckets[route].append(case)

    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for route in BRANCHES.values():
        for case in buckets.get(route, [])[:target_per_route]:
            selected.append(case)
            seen.add(case["caseId"])

    for _, _, case in candidates:
        if len(selected) >= limit:
            break
        if case["caseId"] not in seen:
            selected.append(case)
            seen.add(case["caseId"])

    selected.sort(key=lambda case: (-case["_meta"]["score"], case["caseId"]))
    return selected[:limit]


def write_outputs(cases: list[dict[str, Any]], output_dir: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "candidate_eval_cases.json"
    jsonl_path = output_dir / "candidate_eval_cases.jsonl"
    report_path = output_dir / "extraction_report.md"

    export_cases = []
    for case in cases:
        clean_case = dict(case)
        clean_case.pop("_meta", None)
        export_cases.append(clean_case)

    json_path.write_text(json.dumps(export_cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with jsonl_path.open("w", encoding="utf-8", newline="\n") as f:
        for case in export_cases:
            f.write(json.dumps(case, ensure_ascii=False) + "\n")

    route_counts = Counter(case["testCase"]["expected"]["route"] for case in export_cases)
    attachment_counts = Counter(
        case["testCase"]["expected"]["attachmentCheck"]["status"] for case in export_cases
    )
    top_rows = "\n".join(
        f"| {case['caseId']} | {case['_meta']['score']} | {case['testCase']['expected']['route']} | {case['_meta']['category']} |"
        for case in cases[:20]
    )
    report = f"""# 非标页内嵌智能引导候选评测用例抽取报告

## 产物

- `candidate_eval_cases.json`: JSON 数组，供人工复核和后续导入。
- `candidate_eval_cases.jsonl`: JSONL，每行一个候选用例。

## 统计

- 候选输出数：{len(export_cases)}
- 分支分布：{dict(route_counts)}
- 附件检查状态分布：{dict(attachment_counts)}

## 口径

- 来源：`agentic/qa-gen_base.csv`。
- 所有用例 `humanReviewStatus` 均为 `pending`。
- `systemScopedVascList`、页面上下文、费用、审核结论、附件真实校验结果均不从 CSV 补造。
- 附件相关内容仅作为候选信号，未经过飞书群聊 TOP3 人工确认前不得写成已支持规则。

## Top 20

| caseId | score | route | category |
|---|---:|---|---|
{top_rows}
"""
    report_path.write_text(report, encoding="utf-8")

    return {
        "json": str(json_path),
        "jsonl": str(jsonl_path),
        "report": str(report_path),
        "count": len(export_cases),
        "routeCounts": dict(route_counts),
        "attachmentCounts": dict(attachment_counts),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--limit", type=int, default=60)
    args = parser.parse_args()

    candidates = iter_candidates(args.input)
    selected = select_balanced(candidates, args.limit)
    summary = write_outputs(selected, args.output_dir)
    summary["candidatePoolSize"] = len(candidates)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
