"""
AI 客服增值推荐 — P0 测试造数需求生成

从 scenario_bridge + manual_top30 筛选 P0 场景（verified_vas 非空 + ADD_VALUE_ACTION_CLASS），
批量查询 PMS attrList，输出 vas_attrs_catalog_p0.json 及结构化用例 JSON。

用法:
  python generate_test_seed_requirements.py
  python generate_test_seed_requirements.py --attrs-only
  python generate_test_seed_requirements.py --skip-attrs
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any

import requests
import urllib3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLAN_EVENT_DIR = os.path.dirname(SCRIPT_DIR)
if PLAN_EVENT_DIR not in sys.path:
    sys.path.insert(0, PLAN_EVENT_DIR)

from query_plan_event_detail import query_detail_subtables
from query_plan_events import _load_cookies_into_session, refresh_csrf_from_page

urllib3.disable_warnings()

OUTPUT_DIR = os.path.join(SCRIPT_DIR, "output")
UPSTREAM_OUTPUT_DIR = os.path.join(PLAN_EVENT_DIR, "output")

PMS_REFERER_VAS = "https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService"

# 出库节点异常不在 P0（如 B07 SKU 尺重）
OUTBOUND_EXCEPTION_NODES = frozenset({"OUT_BOUND", "OUT_WAREHOUSE", "DELIVERY"})
OUTBOUND_SG_PREFIXES = ("B07", "B08")

VASC_PRODUCT_NAMES: dict[str, str] = {
    "VASC202407031503503": "原单上架",
    "VASC202407012141008": "新单上架（WINIT创建入库单）",
    "VASC202407031507376": "（入库异常处理常用套餐）",
    "VASC202407161056217": "（入库异常处理常用套餐）",
    "VASC202409121753076": "（入库异常处理常用套餐）",
}

# 造数档位：异常页（待处理）+ 增值订单页（已下单并完成）
SEED_PROFILE_META: dict[str, dict[str, Any]] = {
    "pre_vas": {
        "label": "异常待处理（AI 推荐入口）",
        "pages": ["异常单列表/详情"],
        "description": "仅有 WI + EB，客户尚未下增值单；用于 AI 推荐验证",
        "vasc_required": False,
    },
    "post_vas": {
        "label": "异常已处理 + 增值单已完成",
        "pages": ["异常单列表/详情", "增值订单列表/详情"],
        "description": "WI + EB + VASC 全链路；EB 已关联增值单并关闭，增值订单页可查到已完成单据",
        "vasc_required": True,
    },
}

VASC_REFERENCE_SAMPLE = os.path.join(
    UPSTREAM_OUTPUT_DIR, "vas_VASC000000296745.json"
)

# TC-P0-10：对齐生产样本 VASC000000296745 的多原子组合
COMPLEX_CASE_REF = {
    "case_id": "TC-P0-10",
    "scenario_id": "inbound_包裹包装异常_A包裹质量异常",
    "pms_event_code": "B0102E23",
    "verified_vas_event_codes": ["OW01V1561", "OW01V1558"],
    "verified_vasc_codes_hint": [
        "VASC202407031503503",
        "VASC202407031507376",
        "VASC202409121753076",
    ],
    "notes": "多原子组合参考样例，对齐生产样本 VASC000000296745",
    "reference_vasc_order": "VASC000000296745",
}

NEGATIVE_CASES = [
    {
        "case_id": "TC-NEG-01",
        "scenario_id": "inbound_包裹包装异常_A包裹质量异常",
        "pms_event_code": "B01E02",
        "event_name_hint": "包裹包装异常(无需客户下增值单)",
        "expect_no_vasc": True,
        "must_not_recommend": [{"serviceCode": "OW01V1561", "reason": "知悉类分支，无需客户下增值单"}],
    },
    {
        "case_id": "TC-NEG-02",
        "scenario_id": "inbound_商品尺重异常",
        "pms_event_code": "B0402E11",
        "event_name_hint": "商品尺重异常",
        "expect_no_vasc": True,
        "must_not_recommend": [],
    },
]


def _load(path: str) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _save(path: str, data: Any) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build_pms_std_index(plan: dict) -> dict[str, dict]:
    return {
        r["eventCode"]: r
        for r in plan.get("standardException", {}).get("rows", [])
        if r.get("eventCode")
    }


def build_pms_vas_index(plan: dict) -> dict[str, dict]:
    return {
        r["eventCode"]: r
        for r in plan.get("valueAddedService", {}).get("rows", [])
        if r.get("eventCode")
    }


def _is_outbound_exception(pms_row: dict) -> bool:
    node = pms_row.get("exceptionNode") or ""
    if node in OUTBOUND_EXCEPTION_NODES:
        return True
    sg = pms_row.get("sgCode") or ""
    first_sg = sg.split(",")[0].strip() if sg else ""
    code = pms_row.get("eventCode") or ""
    if first_sg.startswith(OUTBOUND_SG_PREFIXES):
        return True
    if code.startswith(OUTBOUND_SG_PREFIXES):
        return True
    return False


def _parse_vasc_codes(vasc_field: str | None) -> list[str]:
    if not vasc_field:
        return []
    return [c.strip() for c in re.split(r"[,，]", vasc_field) if c.strip()]


def _parse_pulldown_values(pulldown: str | None) -> list[dict[str, str]]:
    """解析 PMS pulldownValue：CODE=中文;CODE2=中文2"""
    if not pulldown:
        return []
    items: list[dict[str, str]] = []
    for part in re.split(r"[;；]", pulldown):
        part = part.strip()
        if not part:
            continue
        if "=" in part:
            code, _, label = part.partition("=")
            items.append({"code": code.strip(), "label": label.strip()})
        else:
            items.append({"code": part, "label": part})
    return items


def _extract_allowed_from_node_rels(row: dict) -> list[dict[str, str]]:
    """PMS attrList 允许值常在 nodeRelVos[].nodeVos[] 中。"""
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for rel in row.get("nodeRelVos") or []:
        for node in rel.get("nodeVos") or []:
            code = (node.get("node") or "").strip()
            if not code or code in seen:
                continue
            seen.add(code)
            items.append({
                "code": code,
                "label": (node.get("nodeName") or code).strip(),
            })
    return items


def normalize_attr_row(row: dict) -> dict[str, Any]:
    allowed = _parse_pulldown_values(row.get("pulldownValue"))
    if not allowed:
        allowed = _extract_allowed_from_node_rels(row)
    return {
        "attributeKeyOriginal": (
            row.get("attributeKeyOriginal") or row.get("attrCode") or row.get("attributeKey")
        ),
        "attributeName": row.get("attributeName") or row.get("attrName"),
        "isRequired": (row.get("isRequired") or "N") == "Y",
        "showType": row.get("showType"),
        "inputNode": row.get("inputNode"),
        "allowedValues": allowed,
        "defaultValue": row.get("defaultValue") or row.get("defaultValues"),
        "unit": row.get("unit"),
    }


def filter_p0_candidates(
    bridge: dict,
    manual: dict,
    pms_std: dict[str, dict],
    *,
    max_cases: int = 9,
) -> list[dict[str, Any]]:
    """
    从 manual_top30 + scenario_bridge 筛选 P0：
    - verified_vas_event_codes 非空
    - 主 PMS eventCode 的 eventAttr = ADD_VALUE_ACTION_CLASS
    - 排除出库节点异常
    """
    bridge_by_id = {b["scenario_id"]: b for b in bridge.get("bridges", [])}
    manual_order = {v["scenario_id"]: i for i, v in enumerate(manual.get("verifications", []))}

    candidates: list[dict[str, Any]] = []
    seen_primary: set[str] = set()

    for ver in manual.get("verifications", []):
        vas_codes = ver.get("verified_vas_event_codes") or []
        if not vas_codes:
            continue

        pms_codes = ver.get("verified_pms_event_codes") or []
        if not pms_codes:
            continue

        primary_code = pms_codes[0]
        if primary_code in seen_primary:
            continue

        pms_row = pms_std.get(primary_code)
        if not pms_row:
            continue
        if pms_row.get("eventAttr") != "ADD_VALUE_ACTION_CLASS":
            continue
        if _is_outbound_exception(pms_row):
            continue

        bridge_entry = bridge_by_id.get(ver["scenario_id"], {})
        vasc_hint = ver.get("verified_vasc_codes_hint") or []
        if not vasc_hint:
            vasc_hint = _parse_vasc_codes(pms_row.get("vascCode"))

        candidates.append({
            "scenario_id": ver["scenario_id"],
            "kb_title": bridge_entry.get("kb_title") or ver["scenario_id"],
            "is_high_priority": bridge_entry.get("is_high_priority", False),
            "manual_rank": manual_order.get(ver["scenario_id"], 999),
            "verification_status": ver.get("verification_status", "confirmed"),
            "verification_notes": ver.get("notes", ""),
            "pms_event_code": primary_code,
            "pms_event_name": pms_row.get("eventName"),
            "pms_event_attr": pms_row.get("eventAttr"),
            "exception_node": pms_row.get("exceptionNode"),
            "event_define": (pms_row.get("eventDefine") or "")[:300],
            "verified_pms_event_codes": pms_codes,
            "verified_vas_event_codes": vas_codes,
            "verified_vasc_codes_hint": vasc_hint,
            "recommended_vas_kb": bridge_entry.get("recommended_vas_kb") or [],
        })
        seen_primary.add(primary_code)

    candidates.sort(
        key=lambda c: (
            0 if c["is_high_priority"] else 1,
            c["manual_rank"],
        )
    )
    return candidates[:max_cases]


def append_complex_case(p0_list: list[dict], pms_std: dict[str, dict]) -> list[dict]:
    """追加 TC-P0-10 复杂样例（若前 9 条未覆盖同 eventCode 组合）。"""
    ref = COMPLEX_CASE_REF
    pms_row = pms_std.get(ref["pms_event_code"], {})
    entry = {
        "case_id": ref["case_id"],
        "scenario_id": ref["scenario_id"],
        "kb_title": "A+包裹质量异常（多原子组合）",
        "is_high_priority": True,
        "manual_rank": -1,
        "verification_status": "confirmed",
        "verification_notes": ref["notes"],
        "pms_event_code": ref["pms_event_code"],
        "pms_event_name": pms_row.get("eventName"),
        "pms_event_attr": pms_row.get("eventAttr"),
        "exception_node": pms_row.get("exceptionNode"),
        "event_define": (pms_row.get("eventDefine") or "")[:300],
        "verified_pms_event_codes": [ref["pms_event_code"]],
        "verified_vas_event_codes": ref["verified_vas_event_codes"],
        "verified_vasc_codes_hint": ref["verified_vasc_codes_hint"],
        "recommended_vas_kb": ["更换商品包装", "贴标/换标"],
        "reference_vasc_order": ref["reference_vasc_order"],
        "is_complex_reference": True,
    }
    # 若已有 B0102E23 单原子用例，仍追加组合参考
    return p0_list + [entry]


def assign_case_ids(p0_list: list[dict]) -> list[dict]:
    """为普通用例编号 TC-P0-01..09；复杂参考样例固定 TC-P0-10。"""
    seq = 1
    for case in p0_list:
        if case.get("is_complex_reference"):
            case["case_id"] = "TC-P0-10"
            continue
        if not case.get("case_id"):
            case["case_id"] = f"TC-P0-{seq:02d}"
            seq += 1
    return p0_list


def collect_service_codes(p0_cases: list[dict]) -> list[str]:
    codes: list[str] = []
    seen: set[str] = set()
    for case in p0_cases:
        for sc in case.get("verified_vas_event_codes") or []:
            if sc not in seen:
                seen.add(sc)
                codes.append(sc)
    return codes


def _pms_session() -> requests.Session:
    session = requests.Session()
    session.verify = False
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
            ),
        }
    )
    _load_cookies_into_session(session)
    refresh_csrf_from_page(session, PMS_REFERER_VAS)
    return session


def fetch_attrs_for_service(
    session: requests.Session,
    service_code: str,
    vas_index: dict[str, dict],
) -> tuple[list[dict], str | None]:
    """查询单个 serviceCode 的 PMS attrList，返回 (normalized_attrs, error)。"""
    vas_row = vas_index.get(service_code, {})
    event_name = vas_row.get("eventName", "")
    try:
        sub = query_detail_subtables(session, service_code, "valueAddedService")
        raw = sub.get("attrList") or []
        return [normalize_attr_row(r) for r in raw], None
    except Exception as exc:
        return [], f"{service_code} ({event_name}): {exc}"


def build_attrs_catalog(
    service_codes: list[str],
    vas_index: dict[str, dict],
    *,
    use_cache: bool = True,
    cache_path: str | None = None,
) -> dict[str, Any]:
    cache_path = cache_path or os.path.join(OUTPUT_DIR, "vas_attrs_catalog_p0.json")
    cached: dict[str, Any] = {}
    if use_cache and os.path.exists(cache_path):
        try:
            cached = _load(cache_path).get("services", {})
        except (json.JSONDecodeError, OSError):
            cached = {}

    session = _pms_session()
    services: dict[str, Any] = {}
    errors: list[str] = []

    for code in service_codes:
        cached_entry = cached.get(code) if use_cache else None
        if cached_entry and cached_entry.get("attrs"):
            has_keys = all(
                a.get("attributeKeyOriginal")
                for a in cached_entry["attrs"]
            ) or not cached_entry["attrs"]
            if has_keys:
                services[code] = {
                    **cached_entry,
                    "source": cached_entry.get("source", "cache"),
                }
                continue

        attrs, err = fetch_attrs_for_service(session, code, vas_index)
        vas_row = vas_index.get(code, {})
        services[code] = {
            "serviceCode": code,
            "serviceName": vas_row.get("eventName"),
            "attr_count": len(attrs),
            "attrs": attrs,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "source": "pms_api",
        }
        if err:
            services[code]["fetch_error"] = err
            errors.append(err)

    catalog = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "service_count": len(service_codes),
            "api": "pms.BaseAttrRelService_findBaseAttrRelPage",
            "errors": errors,
        },
        "services": services,
    }
    return catalog


def _vasc_products(vasc_codes: list[str]) -> list[dict]:
    return [
        {
            "productCode": code,
            "productName": VASC_PRODUCT_NAMES.get(code, ""),
        }
        for code in vasc_codes
    ]


def _atomic_services_expected(
    case: dict,
    vas_index: dict[str, dict],
    attr_catalog: dict[str, Any],
) -> list[dict]:
    services = attr_catalog.get("services", {})
    result: list[dict] = []
    for sc in case.get("verified_vas_event_codes") or []:
        vas_row = vas_index.get(sc, {})
        entry: dict[str, Any] = {
            "serviceCode": sc,
            "serviceName": vas_row.get("eventName"),
        }
        svc_attrs = services.get(sc, {}).get("attrs") or []
        if svc_attrs:
            entry["attrs"] = [
                {
                    "attributeKeyOriginal": a["attributeKeyOriginal"],
                    "isRequired": a["isRequired"],
                    "allowedValues": [v["code"] for v in a.get("allowedValues", [])],
                }
                for a in svc_attrs
                if a.get("isRequired")
            ]
        result.append(entry)
    return result


def _primary_vasc_product_code(case: dict) -> str:
    hints = case.get("verified_vasc_codes_hint") or []
    return hints[0] if hints else "VASC202407031503503"


def _sample_va_atom_attrs(service_code: str, attr_catalog: dict[str, Any]) -> list[dict]:
    """为增值单原子服务生成可提交的属性样例值（开发造数时照填）。"""
    attrs = (attr_catalog.get("services", {}).get(service_code) or {}).get("attrs") or []
    samples: list[dict] = []
    for a in attrs:
        if not a.get("isRequired"):
            continue
        key = a.get("attributeKeyOriginal")
        name = a.get("attributeName")
        show = a.get("showType")
        allowed = a.get("allowedValues") or []
        base = {
            "attributeKeyOriginal": key,
            "attributeName": name,
            "showType": show,
            "isRequired": "Y",
            "inputNode": a.get("inputNode") or "SUBMIT",
        }
        if show == "ANNEX":
            samples.append({
                **base,
                "attributeValueOriginal": "PLACEHOLDER_FILE",
                "attributeValue": "测试附件（仓库可见）",
            })
        elif allowed:
            samples.append({
                **base,
                "attributeValueOriginal": allowed[0]["code"],
                "attributeValue": allowed[0]["label"],
            })
        else:
            samples.append({
                **base,
                "attributeValueOriginal": "SAMPLE_VALUE",
                "attributeValue": "测试值",
            })
    return samples


def _build_vasc_atomic_services(
    case: dict,
    vas_index: dict[str, dict],
    attr_catalog: dict[str, Any],
) -> list[dict]:
    services: list[dict] = []
    pms_code = case["pms_event_code"]
    pms_name = case.get("pms_event_name")
    for seq, sc in enumerate(case.get("verified_vas_event_codes") or [], 1):
        services.append({
            "serviceCode": sc,
            "serviceName": (vas_index.get(sc) or {}).get("eventName"),
            "serviceSequence": str(seq),
            "status": "CO",
            "statusDesc": "已处理",
            "serviceObject": "GOODS",
            "vaAtomAttrs": _sample_va_atom_attrs(sc, attr_catalog),
            "runtime_events": [
                {
                    "eventNo": "{EB.businessNo}",
                    "eventCode": pms_code,
                    "eventName": pms_name,
                    "eventObj": "商品",
                }
            ],
        })
    return services


def build_seed_profile_pre_vas(case: dict) -> dict[str, Any]:
    pms_code = case["pms_event_code"]
    return {
        "profile_id": "pre_vas",
        **SEED_PROFILE_META["pre_vas"],
        "seed_spec": {
            "wi": {
                "businessType": "INBOUND",
                "warehouseCode": "USGA",
                "status_hint": "收货/查验中（可挂异常）",
            },
            "eb": {
                "businessType": "UNUSUAL",
                "eventCode": pms_code,
                "eventName": case.get("pms_event_name"),
                "parentBusinessNo": "{WI.businessNo}",
                "status": "待客户处理",
                "status_hint": "操作增值类，待客户下增值单",
                "eventFiles": ">=1 张仓库实拍图",
            },
            "vasc": None,
        },
        "verify_apis": [
            "OMS 异常单查询（EB 存在且 eventCode 正确）",
            "pms.PlanEventService_queryPlanEventPage",
            "pms.BaseAttrRelService_findBaseAttrRelPage",
        ],
        "simulation": {
            "user_message": (
                f"我的入库单 {{wi_no}} 有个异常 {{eb_no}}，"
                f"仓库反馈「{case.get('kb_title', '')}」，应该怎么处理？"
            ),
        },
    }


def build_seed_profile_post_vas(
    case: dict,
    vas_index: dict[str, dict],
    attr_catalog: dict[str, Any],
) -> dict[str, Any]:
    pms_code = case["pms_event_code"]
    product_code = _primary_vasc_product_code(case)
    product_name = VASC_PRODUCT_NAMES.get(product_code, "")
    atomic_services = _build_vasc_atomic_services(case, vas_index, attr_catalog)

    ref_sample: str | None = None
    if case.get("reference_vasc_order"):
        ref_sample = f"../output/vas_{case['reference_vasc_order']}.json"
    elif pms_code == "B0102E23":
        ref_sample = "../output/vas_VASC000000296745.json"

    post: dict[str, Any] = {
        "profile_id": "post_vas",
        **SEED_PROFILE_META["post_vas"],
        "seed_spec": {
            "wi": {
                "businessType": "INBOUND",
                "warehouseCode": "USGA",
                "businessNo": "{WI.businessNo}",
            },
            "eb": {
                "businessType": "UNUSUAL",
                "eventCode": pms_code,
                "eventName": case.get("pms_event_name"),
                "parentBusinessNo": "{WI.businessNo}",
                "status": "CL",
                "statusDesc": "已关闭",
                "status_hint": "异常已关联增值单并处理完成",
                "linkedVascNo": "{VASC.orderNo}",
                "eventFiles": "保留造数时上传的仓库图",
            },
            "vasc": {
                "orderNo": "{VASC.orderNo}",
                "vaSource": "UNUSUAL",
                "status": "PD",
                "statusDesc": "已完成",
                "orderSource": "WINIT",
                "orderSourceDesc": "万邑联下单",
                "warehouseCode": "USGA",
                "businessOrderNo": "{WI.businessNo}",
                "vasc": {
                    "productCode": product_code,
                    "productName": product_name,
                    "shelveWayCode": "USE_ORIGIN_INBOUND_ORDER",
                },
                "childBusinessOrders": [
                    {
                        "businessNo": "{EB.businessNo}",
                        "businessType": "UNUSUAL",
                        "parentBusinessNo": "{WI.businessNo}",
                    }
                ],
                "atomic_services": atomic_services,
                "related_orders": [
                    {
                        "orderNo": "{VASC.orderNo}",
                        "businessNo": "{WI.businessNo}",
                        "businessTypeName": "入库订单",
                        "eventNo": "{EB.businessNo}",
                    },
                    {
                        "orderNo": "{VASC.orderNo}",
                        "businessNo": "{EB.businessNo}",
                        "businessTypeName": "异常订单",
                        "eventNo": "{EB.businessNo}",
                    },
                ],
            },
        },
        "verify_apis": [
            "oms.VaOrderService_pageQuery（增值单列表，where[orderNo]=VASC）",
            "oms.VaOrderService_getVasList（原子服务列表）",
            "oms.VaOrderService_getEventOrder4VaAtom（EB↔eventCode 关联）",
            "oms.VaOrderService_getVaAtomDetails（businessOrder.businessNo=EB）",
            "oms.VaOrderRelatedService_queryRelatedVaOrdersPage（WI+EB 关联行）",
            "OMS 异常单查询（EB 状态已关闭，linkedVascNo 一致）",
        ],
        "simulation": {
            "user_message": (
                f"我的增值单 {{vasc_no}} 处理得怎么样了？"
                f"入库单 {{wi_no}} 上的异常 {{eb_no}} 是否已经处理完？"
            ),
        },
        "acceptance": [
            "增值订单详情 statusDesc=已完成",
            "各原子服务 statusDesc=已处理，vaAtomAttrs 必填项已填",
            "getEventOrder4VaAtom 返回 eventCode 与 PMS 一致",
            "异常单详情显示已关联 VASC 且状态已关闭",
        ],
    }
    if ref_sample:
        post["reference_sample"] = ref_sample
    return post


def build_seed_profiles(
    case: dict,
    vas_index: dict[str, dict],
    attr_catalog: dict[str, Any],
) -> dict[str, dict]:
    return {
        "pre_vas": build_seed_profile_pre_vas(case),
        "post_vas": build_seed_profile_post_vas(case, vas_index, attr_catalog),
    }


def build_seed_cases_json(
    p0_cases: list[dict],
    negative_cases: list[dict],
    vas_index: dict[str, dict],
    pms_std: dict[str, dict],
    attr_catalog: dict[str, Any],
) -> dict[str, Any]:
    cases: list[dict] = []
    for case in p0_cases:
        pms_code = case["pms_event_code"]
        vasc_hint = case.get("verified_vasc_codes_hint") or []
        must_not: list[dict] = []
        if pms_code == "B0102E23":
            must_not.append({"serviceCode": "", "eventCode": "B01E02", "reason": "知悉类分支"})

        profiles = build_seed_profiles(case, vas_index, attr_catalog)

        cases.append({
            "case_id": case["case_id"],
            "scenario_id": case["scenario_id"],
            "priority": "P0",
            "status": "pending",
            "seed_profiles": profiles,
            "seed_spec": profiles["pre_vas"]["seed_spec"],
            "seed_instance": {
                "pre_vas": {"wi_no": "", "eb_no": "", "seeded_by": "", "seeded_at": ""},
                "post_vas": {
                    "wi_no": "",
                    "eb_no": "",
                    "vasc_no": "",
                    "seeded_by": "",
                    "seeded_at": "",
                },
            },
            "simulation": profiles["pre_vas"]["simulation"],
            "expected": {
                "exception": {
                    "eventCode": pms_code,
                    "eventName": case.get("pms_event_name"),
                },
                "vasc_products": _vasc_products(vasc_hint),
                "atomic_services": _atomic_services_expected(case, vas_index, attr_catalog),
                "must_not_recommend": must_not,
            },
            "verify_apis": profiles["pre_vas"]["verify_apis"],
            "verification_notes": case.get("verification_notes", ""),
            "reference_vasc_order": case.get("reference_vasc_order"),
        })

    neg_out: list[dict] = []
    for neg in negative_cases:
        pms_row = pms_std.get(neg["pms_event_code"], {})
        neg_out.append({
            **neg,
            "status": "pending",
            "expected": {
                "exception": {
                    "eventCode": neg["pms_event_code"],
                    "eventName": pms_row.get("eventName") or neg.get("event_name_hint"),
                },
                "vasc_products": [],
                "atomic_services": [],
                "must_not_recommend": neg.get("must_not_recommend", []),
                "expect_no_vasc": neg.get("expect_no_vasc", True),
            },
        })

    return {
        "meta": {
            "version": "1.1",
            "scope": "P0",
            "entry_flows": ["existing_eb_pre_vas", "existing_eb_post_vas"],
            "seed_layers": [
                "Layer1 WI 入库单",
                "Layer2 EB 异常实例",
                "Layer3 EB 附件 eventFiles",
                "Layer4 VASC 增值单（post_vas 档位）",
                "Layer5 原子服务 + vaAtomAttrs（post_vas 档位）",
            ],
            "reference_vasc_runtime_sample": VASC_REFERENCE_SAMPLE,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "prerequisites": {"test_account": "", "warehouse_code": "USGA"},
        "attr_catalog_ref": "vas_attrs_catalog_p0.json",
        "cases": cases,
        "negative_cases": neg_out,
    }


def write_seed_csv(cases_payload: dict, csv_path: str) -> None:
    rows: list[dict] = []
    for c in cases_payload.get("cases", []):
        exp = c.get("expected", {})
        exc = exp.get("exception", {})
        inst = c.get("seed_instance", {})
        for profile_id in ("pre_vas", "post_vas"):
            pinst = inst.get(profile_id) or inst
            rows.append({
                "case_id": c["case_id"],
                "profile": profile_id,
                "scenario": c["scenario_id"],
                "pms_event_code": exc.get("eventCode", ""),
                "wi_no": pinst.get("wi_no", ""),
                "eb_no": pinst.get("eb_no", ""),
                "vasc_no": pinst.get("vasc_no", ""),
                "seed_status": c.get("status", "pending"),
                "ai_pass": "",
                "notes": c.get("verification_notes", "")[:80],
            })
    for c in cases_payload.get("negative_cases", []):
        rows.append({
            "case_id": c["case_id"],
            "profile": "pre_vas",
            "scenario": c["scenario_id"],
            "pms_event_code": c.get("pms_event_code", ""),
            "wi_no": "",
            "eb_no": "",
            "vasc_no": "",
            "seed_status": c.get("status", "pending"),
            "ai_pass": "",
            "notes": "负例：不应推荐增值",
        })

    fieldnames = [
        "case_id", "profile", "scenario", "pms_event_code",
        "wi_no", "eb_no", "vasc_no", "seed_status", "ai_pass", "notes",
    ]
    os.makedirs(os.path.dirname(csv_path) or ".", exist_ok=True)
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def write_markdown_summary(
    p0_cases: list[dict],
    attr_catalog: dict[str, Any],
    md_path: str,
    cases_payload: dict | None = None,
) -> None:
    """输出 P0 场景总览 + 造数层级 + 属性附录。"""
    lines: list[str] = []
    w = lines.append
    case_by_id = {
        c["case_id"]: c
        for c in (cases_payload or {}).get("cases", [])
    }

    w("# 测试造数需求 — AI 客服增值推荐 P0")
    w("")
    w(f"> 生成时间：{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    w("> 覆盖页面：**异常单** + **增值订单**（每条 P0 需造两套档位）")
    w("")
    w("## 造数层级（最小闭环）")
    w("")
    w("```")
    w("pre_vas（AI 推荐入口）")
    w("  Layer1  WI 入库单 INBOUND / USGA")
    w("  Layer2  EB 异常 UNUSUAL / eventCode=PMS / 待客户处理")
    w("  Layer3  eventFiles 仓库实拍图")
    w("")
    w("post_vas（增值订单页验收）")
    w("  Layer1~3  同上（历史异常上下文）")
    w("  Layer4  VASC 增值单 vaSource=UNUSUAL / status=已完成(PD)")
    w("  Layer5  原子服务 status=已处理(CO) + vaAtomAttrs 必填属性")
    w("  关联     VASC.businessOrderNo=WI；childBusinessOrders 含 EB；")
    w("           getEventOrder4VaAtom.eventCode=PMS；EB 状态已关闭")
    w("```")
    w("")
    w("运行时样本：`../output/vas_VASC000000296745.json`（B0102E23 + OW01V1561）")
    w("")
    w("## 造数档位说明")
    w("")
    w("| profile | 页面 | 说明 |")
    w("|---------|------|------|")
    for pid, meta in SEED_PROFILE_META.items():
        pages = "、".join(meta["pages"])
        w(f"| `{pid}` | {pages} | {meta['description']} |")
    w("")
    w("## P0 场景总览")
    w("")
    w("| TC_ID | 场景 | PMS eventCode | 推荐原子服务 | VASC 套餐 hint |")
    w("|-------|------|---------------|-------------|----------------|")
    for case in p0_cases:
        vas = ", ".join(case.get("verified_vas_event_codes") or [])
        vasc = ", ".join((case.get("verified_vasc_codes_hint") or [])[:2])
        if len(case.get("verified_vasc_codes_hint") or []) > 2:
            vasc += " ..."
        w(
            f"| {case['case_id']} | {case.get('kb_title', '')} "
            f"| `{case['pms_event_code']}` | `{vas}` | {vasc or '—'} |"
        )

    w("")
    w("## 逐用例造数要点（post_vas 档位）")
    w("")
    for case in p0_cases:
        cid = case["case_id"]
        payload = case_by_id.get(cid, {})
        post = (payload.get("seed_profiles") or {}).get("post_vas", {})
        vasc_spec = (post.get("seed_spec") or {}).get("vasc") or {}
        product = (vasc_spec.get("vasc") or {})
        services = vasc_spec.get("atomic_services") or []
        svc_summary = ", ".join(
            f"`{s['serviceCode']}`" for s in services
        ) or "—"

        w(f"### {cid} {case.get('kb_title', '')}")
        w("")
        w(f"- **PMS eventCode**：`{case['pms_event_code']}`")
        w(f"- **增值套餐**：`{product.get('productCode', '—')}` {product.get('productName', '')}")
        w(f"- **原子服务**：{svc_summary}")
        w("- **EB 状态**：已关闭，linkedVascNo = VASC 单号")
        w("- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理")
        w("- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`")
        if post.get("reference_sample"):
            w(f"- **参考样本**：`{post['reference_sample']}`")
        w("")

    w("## 属性枚举附录（P0 原子服务）")
    w("")
    w("| serviceCode | attributeKeyOriginal | 中文名 | isRequired | showType | 允许值示例 |")
    w("|-------------|---------------------|--------|------------|----------|-----------|")
    for code, svc in sorted(attr_catalog.get("services", {}).items()):
        for a in svc.get("attrs") or []:
            allowed = a.get("allowedValues") or []
            sample = ""
            if allowed:
                sample = "; ".join(
                    f"{v['code']}={v['label']}" for v in allowed[:3]
                )
            w(
                f"| `{code}` | `{a.get('attributeKeyOriginal', '')}` "
                f"| {a.get('attributeName', '')} "
                f"| {'Y' if a.get('isRequired') else 'N'} "
                f"| {a.get('showType', '')} "
                f"| {sample or '—'} |"
            )

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def run(
    *,
    skip_attrs: bool = False,
    attrs_only: bool = False,
    no_cache: bool = False,
    max_p0: int = 9,
) -> None:
    bridge_path = os.path.join(UPSTREAM_OUTPUT_DIR, "scenario_bridge.json")
    manual_path = os.path.join(UPSTREAM_OUTPUT_DIR, "scenario_bridge_manual_top30.json")
    plan_path = os.path.join(UPSTREAM_OUTPUT_DIR, "plan_events_all.json")

    bridge = _load(bridge_path)
    manual = _load(manual_path)
    plan = _load(plan_path)
    pms_std = build_pms_std_index(plan)
    vas_index = build_pms_vas_index(plan)

    p0_raw = filter_p0_candidates(bridge, manual, pms_std, max_cases=max_p0)
    p0_cases = assign_case_ids(append_complex_case(p0_raw, pms_std))
    service_codes = collect_service_codes(p0_cases)

    attrs_path = os.path.join(OUTPUT_DIR, "vas_attrs_catalog_p0.json")

    if attrs_only:
        if not service_codes:
            # attrs-only 且无已生成用例时，从已有 test_seed_cases 推断
            seed_path = os.path.join(OUTPUT_DIR, "test_seed_cases_p0.json")
            if os.path.exists(seed_path):
                seed = _load(seed_path)
                service_codes = collect_service_codes(seed.get("cases", []))
        print(f"批量查询 {len(service_codes)} 个 serviceCode 属性 …")
        catalog = build_attrs_catalog(
            service_codes, vas_index, use_cache=not no_cache, cache_path=attrs_path
        )
        _save(attrs_path, catalog)
        print(f"已写入 {attrs_path}（{len(catalog['services'])} 项，错误 {len(catalog['meta']['errors'])}）")
        return

    attr_catalog: dict[str, Any] = {"meta": {}, "services": {}}
    if not skip_attrs:
        print(f"批量查询 {len(service_codes)} 个 serviceCode 属性 …")
        attr_catalog = build_attrs_catalog(
            service_codes, vas_index, use_cache=not no_cache, cache_path=attrs_path
        )
        _save(attrs_path, attr_catalog)
        print(f"已写入 {attrs_path}")
    elif os.path.exists(attrs_path):
        attr_catalog = _load(attrs_path)

    seed_payload = build_seed_cases_json(
        p0_cases, NEGATIVE_CASES, vas_index, pms_std, attr_catalog
    )
    seed_json_path = os.path.join(OUTPUT_DIR, "test_seed_cases_p0.json")
    seed_csv_path = os.path.join(OUTPUT_DIR, "test_seed_cases_p0.csv")
    md_path = os.path.join(OUTPUT_DIR, "测试造数需求_AI客服增值推荐_P0.md")

    _save(seed_json_path, seed_payload)
    write_seed_csv(seed_payload, seed_csv_path)
    write_markdown_summary(p0_cases, attr_catalog, md_path, cases_payload=seed_payload)

    print(f"P0 场景: {len(p0_cases)} 条（筛选 {len(p0_raw)} + 复杂样例 1）")
    print(f"原子服务: {len(service_codes)} 个")
    print(f"已写入 {seed_json_path}")
    print(f"已写入 {seed_csv_path}")
    print(f"已写入 {md_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="生成 AI 客服增值推荐 P0 测试造数需求")
    parser.add_argument("--skip-attrs", action="store_true", help="跳过 PMS 属性批量查询")
    parser.add_argument("--attrs-only", action="store_true", help="仅批量查询属性目录")
    parser.add_argument("--no-cache", action="store_true", help="忽略已有属性缓存，全部重新拉取")
    parser.add_argument("--max-p0", type=int, default=9, help="P0 基础场景数（不含 TC-P0-10）")
    args = parser.parse_args()
    try:
        run(
            skip_attrs=args.skip_attrs,
            attrs_only=args.attrs_only,
            no_cache=args.no_cache,
            max_p0=args.max_p0,
        )
    except RuntimeError as exc:
        print(f"错误: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
