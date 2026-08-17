"""OMS 增值单：列表 + 详情 + 关联订单 + PMS PlanEvent 串联查询。"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any

import requests
import urllib3

urllib3.disable_warnings()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUTH_DIR = os.path.join(ROOT, "共享认证")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
AJAX_OMS = "https://cnomstom.winit.com.cn/VasOrder/ajaxProcess"
LIST_PAGE = "https://cnomstom.winit.com.cn/VasOrder/index"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
)


def _new_session() -> requests.Session:
    session = requests.Session()
    session.verify = False
    session.headers.update({"User-Agent": USER_AGENT})
    _load_cookies(session)
    return session


def _load_cookies(session: requests.Session) -> None:
    path = os.path.join(AUTH_DIR, "playwright_cookies.json")
    if not os.path.exists(path):
        print("请先运行 共享认证/auto_login.py")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        cookies = json.load(f)
    for c in cookies:
        session.cookies.set(c["name"], c["value"], domain=c.get("domain", ""), path=c.get("path", "/"))


def set_oms_referer(session: requests.Session, referer: str) -> None:
    session.headers["Referer"] = referer


def refresh_oms_csrf(session: requests.Session, referer: str = LIST_PAGE) -> None:
    resp = session.get(LIST_PAGE, timeout=60, allow_redirects=True)
    resp.raise_for_status()
    if "cniam.winit.com.cn" in resp.url:
        raise RuntimeError("Cookie 失效，请重新 auto_login.py")
    m = re.search(r"window\.__CSRF_TOKEN__\s*=\s*['\"]([^'\"]+)['\"]", resp.text)
    if not m:
        raise RuntimeError("无法提取 CSRF，请重新 auto_login.py")
    session.headers.update(
        {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "x-csrf-token": m.group(1),
            "Referer": referer,
        }
    )


def oms_post(session: requests.Session, params: dict[str, Any]) -> dict[str, Any]:
    resp = session.post(AJAX_OMS, data=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != 1:
        raise RuntimeError(f"{params.get('api')} 失败: {data.get('info', data)}")
    return data


def _rows(info: Any) -> list:
    if isinstance(info, list):
        return info
    if isinstance(info, dict):
        for k in ("content", "data", "rows"):
            v = info.get(k)
            if isinstance(v, list):
                return v
    return []


def page_query(session: requests.Session, **where: str) -> list[dict]:
    params: dict[str, Any] = {
        "api": "oms.VaOrderService_pageQuery",
        "draw": "1",
        "start": "0",
        "length": "50",
    }
    for k, v in where.items():
        params[f"where[{k}]"] = v
    data = oms_post(session, params)
    return _rows(data.get("info"))


def get_vas_list(session: requests.Session, vasc_order_no: str) -> list[dict]:
    referer = f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{vasc_order_no}/isView/Y"
    set_oms_referer(session, referer)
    data = oms_post(
        session,
        {
            "draw": "1",
            "start": "0",
            "length": "50",
            "api": "oms.VaOrderService_getVasList",
            "where[orderNo]": vasc_order_no,
        },
    )
    return _rows(data.get("info"))


def get_event_orders(session: requests.Session, vasc_order_no: str, service_code: str, seq: str = "1") -> list[dict]:
    referer = f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{vasc_order_no}/isView/Y"
    set_oms_referer(session, referer)
    data = oms_post(
        session,
        {
            "draw": "1",
            "start": "0",
            "length": "50",
            "api": "oms.VaOrderService_getEventOrder4VaAtom",
            "where[orderNo]": vasc_order_no,
            "where[serviceCode]": service_code,
            "where[serviceSequence]": seq,
        },
    )
    info = data.get("info")
    return info if isinstance(info, list) else _rows(info)


def get_atom_details(session: requests.Session, vasc_order_no: str, service_code: str, seq: str = "1") -> list[dict]:
    referer = f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{vasc_order_no}/isView/Y"
    set_oms_referer(session, referer)
    data = oms_post(
        session,
        {
            "api": "oms.VaOrderService_getVaAtomDetails",
            "where[orderNo]": vasc_order_no,
            "where[serviceCode]": service_code,
            "where[serviceSequence]": seq,
            "where[pageVo][pageNo]": "0",
            "where[pageVo][pageSize]": "50",
        },
    )
    info = data.get("info")
    return info if isinstance(info, list) else _rows(info)


def get_related_orders(session: requests.Session, vasc_order_no: str, business_order_no: str) -> list[dict]:
    referer = f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{vasc_order_no}/isView/Y"
    set_oms_referer(session, referer)
    data = oms_post(
        session,
        {
            "api": "oms.VaOrderRelatedService_queryRelatedVaOrdersPage",
            "where[orderNo]": vasc_order_no,
            "where[businessOrderNo]": business_order_no,
        },
    )
    return _rows(data.get("info"))


def classify_order_no(order_no: str) -> str:
    if order_no.startswith("VASC"):
        return "增值订单"
    if order_no.startswith("EB"):
        return "异常订单"
    if order_no.startswith("WI"):
        return "入库/出库业务单"
    return "其他"


def query_vasc_full(vasc_order_no: str, business_order_no: str = "") -> dict[str, Any]:
    session = _new_session()
    refresh_oms_csrf(session)

    header = page_query(session, orderNo=vasc_order_no)
    services = get_vas_list(session, vasc_order_no)

    detail_blocks = []
    event_codes: set[str] = set()
    eb_numbers: set[str] = set()

    for svc in services[:5]:
        code = svc.get("serviceCode") or ""
        seq = str(svc.get("serviceSequence") or "1")
        if not code:
            continue
        events = get_event_orders(session, vasc_order_no, code, seq)
        atoms = get_atom_details(session, vasc_order_no, code, seq)
        for e in events:
            if e.get("eventCode"):
                event_codes.add(e["eventCode"])
            if e.get("eventNo"):
                eb_numbers.add(e["eventNo"])
        for a in atoms:
            bo = a.get("businessOrder") or {}
            if bo.get("businessNo"):
                eb_numbers.add(bo["businessNo"])
        detail_blocks.append(
            {
                "serviceCode": code,
                "serviceName": svc.get("serviceName"),
                "serviceSequence": seq,
                "runtime_events": events,
                "atom_details_count": len(atoms),
                "atom_business_orders": [
                    (a.get("businessOrder") or {}).get("businessNo") for a in atoms[:3]
                ],
            }
        )

    related = []
    if business_order_no:
        related = get_related_orders(session, vasc_order_no, business_order_no)

    return {
        "vasc_order_no": vasc_order_no,
        "order_type": classify_order_no(vasc_order_no),
        "list_header": header[0] if header else {},
        "services": services,
        "service_details": detail_blocks,
        "related_orders": related,
        "links": {
            "event_codes_for_pms": sorted(event_codes),
            "eb_numbers": sorted(eb_numbers),
            "note": "WI=业务单, VASC=增值单, EB=异常实例; PMS 用 eventCode 关联",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="OMS 增值单关联查询")
    parser.add_argument("vasc_order_no", help="如 VASC000000299931")
    parser.add_argument("--business-order", default="", help="如 WI50380892")
    parser.add_argument("--save", action="store_true")
    args = parser.parse_args()

    result = query_vasc_full(args.vasc_order_no, args.business_order)
    summary = {
        "vasc_order_no": result["vasc_order_no"],
        "status": (result.get("list_header") or {}).get("statusDesc"),
        "services": len(result.get("services") or []),
        "event_codes": result["links"]["event_codes_for_pms"],
        "eb_numbers": result["links"]["eb_numbers"][:10],
        "related_count": len(result.get("related_orders") or []),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if args.save:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out = os.path.join(OUTPUT_DIR, f"vas_{args.vasc_order_no}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"已保存: {out}")


if __name__ == "__main__":
    main()
