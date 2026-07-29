"""
PlanEvent 详情 + 子表 + OMS 异常单关联查询

用法:
  python query_plan_event_detail.py B07E1827
  python query_plan_event_detail.py B07E1827 --save
  python query_plan_event_detail.py B0102E23 --vasc-order VASC000000296745 --service-code OW01V1561
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

import requests
import urllib3

from query_plan_events import _load_cookies_into_session, refresh_csrf_from_page

urllib3.disable_warnings()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
AJAX_PMS = "https://cnpmstom.winit.com.cn/PlanEvent/ajaxProcess"
AJAX_OMS = "https://cnomstom.winit.com.cn/VasOrder/ajaxProcess"


def _post(session: requests.Session, url: str, params: dict[str, Any]) -> dict[str, Any]:
    resp = session.post(url, data=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != 1:
        raise RuntimeError(f"接口失败: {params.get('api')} -> {data.get('info', data)}")
    return data


def _rows(info: Any) -> list[dict]:
    if isinstance(info, list):
        return info
    if isinstance(info, dict):
        for key in ("content", "data", "rows"):
            val = info.get(key)
            if isinstance(val, list):
                return val
        if info.get("id"):
            return [info]
    return []


def query_master_by_event_code(
    session: requests.Session, event_code: str, skip_csrf_refresh: bool = False
) -> dict[str, Any]:
    """从列表接口按 eventCode 取主记录（列表接口不含 attrList 等子表）。"""
    if event_code.startswith(("OW", "OSF", "LM")) or "V" in event_code[4:5]:
        referer = "https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService"
        action = "valueAddedService"
        event_type = "VAS"
    else:
        referer = "https://cnpmstom.winit.com.cn/PlanEvent/standardException"
        action = "standardException"
        event_type = "STANDARD_EXCEPTION"

    if skip_csrf_refresh:
        session.headers["Referer"] = referer
    else:
        refresh_csrf_from_page(session, referer)
    params = {
        "api": "pms.PlanEventService_queryPlanEventPage",
        "draw": "1",
        "start": "0",
        "length": "1",
        "where[vo][ACTION_NAME]": action,
        "where[vo][eventType]": event_type,
        "where[vo][eventCode]": event_code,
        "where[vo][isActive]": "Y",
    }
    data = _post(session, AJAX_PMS, params)
    rows = _rows(data.get("info"))
    if not rows:
        raise RuntimeError(f"未找到 eventCode={event_code}")
    return rows[0]


def query_detail_subtables(session: requests.Session, event_code: str, profile: str) -> dict[str, Any]:
    """详情页子表接口。CSRF 须在首次 POST 前获取，此处只更新 Referer。"""
    if profile == "valueAddedService":
        referer = "https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService"
    else:
        referer = "https://cnpmstom.winit.com.cn/PlanEvent/standardException"
    session.headers["Referer"] = referer

    result: dict[str, Any] = {}

    # attrList
    attr = _post(
        session,
        AJAX_PMS,
        {
            "api": "pms.BaseAttrRelService_findBaseAttrRelPage",
            "draw": "1",
            "start": "0",
            "length": "500",
            "where[vo][instanceCode]": event_code,
        },
    )
    result["attrList"] = _rows(attr.get("info"))

    # revenueItemList
    revenue = _post(
        session,
        AJAX_PMS,
        {
            "api": "pms.RevenueEventChargeItemService_findChargeItemPage",
            "draw": "1",
            "start": "0",
            "length": "500",
            "where[isActive]": "",
            "where[instanceCode]": event_code,
        },
    )
    result["revenueItemList"] = _rows(revenue.get("info"))

    # costItemList（与 revenue 对称命名）
    cost = _post(
        session,
        AJAX_PMS,
        {
            "api": "pms.CostEventChargeItemService_findChargeItemPage",
            "draw": "1",
            "start": "0",
            "length": "500",
            "where[isActive]": "",
            "where[instanceCode]": event_code,
        },
    )
    result["costItemList"] = _rows(cost.get("info"))

    # ruleList / 流程实例
    sg_prefix = event_code[:3] if len(event_code) >= 3 else event_code
    process = _post(
        session,
        AJAX_PMS,
        {
            "api": "pms.InstanceProcessEventService_queryInstanceProcessEventByList",
            "serviceConf": "SG_DOMESTIC",
            "where[instanceProcessEvent][instanceCode]": sg_prefix,
            "where[instanceProcessEvent][instanceType]": "E",
        },
    )
    result["ruleList"] = _rows(process.get("info"))

    return result


def query_oms_runtime_events(
    session: requests.Session,
    vasc_order_no: str,
    service_code: str,
    service_sequence: str = "1",
) -> list[dict]:
    """
    OMS 运行时异常实例。
    返回 eventNo=EB...（异常单号）+ eventCode（关联 PMS 主数据）
    """
    referer = f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{vasc_order_no}/isView/Y"
    page = session.get(referer, timeout=60)
    page.raise_for_status()
    refresh_csrf_from_page(session, referer)

    data = _post(
        session,
        AJAX_OMS,
        {
            "draw": "1",
            "start": "0",
            "length": "50",
            "api": "oms.VaOrderService_getEventOrder4VaAtom",
            "where[orderNo]": vasc_order_no,
            "where[serviceCode]": service_code,
            "where[serviceSequence]": service_sequence,
        },
    )
    info = data.get("info")
    return info if isinstance(info, list) else _rows(info)


def query_plan_event_detail(
    event_code: str,
    vasc_order_no: str = "",
    service_code: str = "",
) -> dict[str, Any]:
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

    # 先取 PMS CSRF，后续子表查询复用同一 token（POST 后不宜再 GET 列表页取 CSRF）
    refresh_csrf_from_page(session, "https://cnpmstom.winit.com.cn/PlanEvent/standardException")

    master = query_master_by_event_code(session, event_code, skip_csrf_refresh=True)
    profile = (
        "valueAddedService"
        if master.get("eventType") == "VAS"
        else "standardException"
    )
    subtables = query_detail_subtables(session, event_code, profile)

    payload: dict[str, Any] = {
        "eventCode": event_code,
        "profile": profile,
        "master": master,
        **subtables,
        "links": {
            "pms_eventNo": master.get("eventNo"),
            "pms_id": master.get("id"),
            "note": "PMS eventNo(如01176) 与 OMS eventNo(如EB...) 不是同一套编号，关联键是 eventCode",
        },
    }

    if vasc_order_no and service_code:
        oms_events = query_oms_runtime_events(session, vasc_order_no, service_code)
        payload["oms_runtime_events"] = oms_events
        payload["links"]["oms_matches"] = [
            x for x in oms_events if x.get("eventCode") == event_code
        ]

    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="PlanEvent 详情 + 子表 + OMS 关联")
    parser.add_argument("event_code", help="如 B07E1827 / B0102E23 / OW01V1825")
    parser.add_argument("--vasc-order", default="", help="增值单号 VASC...")
    parser.add_argument("--service-code", default="", help="OMS 原子服务编码")
    parser.add_argument("--save", action="store_true")
    args = parser.parse_args()

    result = query_plan_event_detail(
        args.event_code,
        vasc_order_no=args.vasc_order,
        service_code=args.service_code,
    )

    summary = {
        "eventCode": result["eventCode"],
        "eventName": result["master"].get("eventName"),
        "pms_eventNo": result["master"].get("eventNo"),
        "attrList": len(result["attrList"]),
        "revenueItemList": len(result["revenueItemList"]),
        "costItemList": len(result["costItemList"]),
        "ruleList": len(result["ruleList"]),
        "oms_runtime_events": len(result.get("oms_runtime_events", [])),
        "oms_matches": len(result.get("links", {}).get("oms_matches", [])),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if args.save:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out = os.path.join(OUTPUT_DIR, f"detail_{args.event_code}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"已保存: {out}")


if __name__ == "__main__":
    main()
