"""
全量查询增值服务（VAS）属性 + 收入项事件编码

用法:
  python query_vas_attrs_all.py
  python query_vas_attrs_all.py --save
  python query_vas_attrs_all.py --only-with-attrs
"""

from __future__ import annotations

import argparse
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

from generate_test_seed_requirements import normalize_attr_row
from query_plan_event_detail import AJAX_PMS, _post, _rows
from query_plan_events import _load_cookies_into_session, refresh_csrf_from_page

urllib3.disable_warnings()

OUTPUT_DIR = os.path.join(SCRIPT_DIR, "output")
UPSTREAM_OUTPUT_DIR = os.path.join(PLAN_EVENT_DIR, "output")
PLAN_EVENTS_FILE = os.path.join(UPSTREAM_OUTPUT_DIR, "plan_events_all.json")
PMS_REFERER_VAS = "https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService"


def _load(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_vas_index() -> dict[str, dict]:
    data = _load(PLAN_EVENTS_FILE)
    index: dict[str, dict] = {}
    vas_section = data.get("valueAddedService") or {}
    for row in vas_section.get("rows") or []:
        if row.get("eventType") == "VAS" and row.get("isActive") == "Y":
            code = row.get("eventCode")
            if code:
                index[code] = row
    return index


def fetch_all_attrs(session: requests.Session) -> dict[str, list[dict]]:
    """分页拉取 BaseAttrRelService 全量属性，按 instanceCode 分组。"""
    grouped: dict[str, list[dict]] = {}
    start = 0
    page_size = 200
    total_elements = None

    while True:
        data = _post(
            session,
            AJAX_PMS,
            {
                "api": "pms.BaseAttrRelService_findBaseAttrRelPage",
                "draw": "1",
                "start": str(start),
                "length": str(page_size),
            },
        )
        info = data.get("info")
        rows = _rows(info)
        if isinstance(info, dict):
            total_elements = info.get("totalElements") or info.get("total")

        for row in rows:
            code = row.get("instanceCode")
            if not code:
                continue
            grouped.setdefault(code, []).append(normalize_attr_row(row))

        start += page_size
        if not rows or (total_elements is not None and start >= total_elements):
            break

    return grouped


def fetch_revenue_for_event(session: requests.Session, event_code: str) -> tuple[list[dict], str | None]:
    """RevenueEventChargeItemService：instanceCode 即增值服务事件编码。"""
    try:
        data = _post(
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
        rows = _rows(data.get("info"))
        return rows, None
    except Exception as exc:
        return [], str(exc)


def _summarize_revenue(rows: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    summary: list[dict] = []
    for row in rows:
        key = (row.get("chargeCode") or "", row.get("chargeName") or "")
        if key in seen:
            continue
        seen.add(key)
        summary.append(
            {
                "chargeCode": row.get("chargeCode"),
                "chargeName": row.get("chargeName"),
                "chargeItemType": row.get("chargeItemType"),
                "pricelistName": row.get("pricelistName"),
            }
        )
    return summary


def build_vas_attrs_catalog(
    *,
    only_with_attrs: bool = False,
    progress: bool = True,
) -> dict[str, Any]:
    vas_index = load_vas_index()
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

    if progress:
        print(f"加载 VAS 主数据: {len(vas_index)} 条", file=sys.stderr)
        print("拉取 BaseAttrRelService 全量属性...", file=sys.stderr)

    attrs_by_code = fetch_all_attrs(session)

    if progress:
        print(f"  属性覆盖 instanceCode: {len(attrs_by_code)} 个", file=sys.stderr)
        print("逐条查询 RevenueEventChargeItemService 确认事件编码...", file=sys.stderr)

    events: list[dict[str, Any]] = []
    errors: list[str] = []
    codes = sorted(vas_index.keys())

    for i, event_code in enumerate(codes, 1):
        vas_row = vas_index[event_code]
        attrs = attrs_by_code.get(event_code, [])
        if only_with_attrs and not attrs:
            continue

        revenue_rows, rev_err = fetch_revenue_for_event(session, event_code)
        confirmed_code = event_code
        if revenue_rows:
            codes_from_revenue = {r.get("instanceCode") for r in revenue_rows if r.get("instanceCode")}
            if codes_from_revenue:
                confirmed_code = sorted(codes_from_revenue)[0]

        entry: dict[str, Any] = {
            "eventCode": confirmed_code,
            "eventName": vas_row.get("eventName"),
            "eventNo": vas_row.get("eventNo"),
            "pscgCode": vas_row.get("pscgCode"),
            "category": vas_row.get("category"),
            "isAtomicVas": vas_row.get("isAtomicVas"),
            "attr_count": len(attrs),
            "attrs": attrs,
            "revenue_item_count": len(revenue_rows),
            "revenue_charges": _summarize_revenue(revenue_rows),
        }
        if rev_err:
            entry["revenue_fetch_error"] = rev_err
            errors.append(f"{event_code}: {rev_err}")

        events.append(entry)
        if progress and i % 25 == 0:
            print(f"  进度 {i}/{len(codes)}", file=sys.stderr)

    events.sort(key=lambda x: x["eventCode"])

    return {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "vas_total": len(vas_index),
            "output_count": len(events),
            "attrs_api": "pms.BaseAttrRelService_findBaseAttrRelPage",
            "revenue_api": "pms.RevenueEventChargeItemService_findChargeItemPage",
            "note": "Revenue 接口 where[instanceCode] 即增值服务 eventCode；返回的 instanceCode 用于确认事件编码",
            "errors": errors,
        },
        "events": events,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="全量 VAS 属性 + 收入项事件编码")
    parser.add_argument("--save", action="store_true", help="保存到 output/vas_attrs_all.json")
    parser.add_argument("--only-with-attrs", action="store_true", help="仅输出有属性的 VAS")
    args = parser.parse_args()

    catalog = build_vas_attrs_catalog(only_with_attrs=args.only_with_attrs)

    summary = {
        "vas_total": catalog["meta"]["vas_total"],
        "output_count": catalog["meta"]["output_count"],
        "with_attrs": sum(1 for e in catalog["events"] if e["attr_count"] > 0),
        "with_revenue": sum(1 for e in catalog["events"] if e["revenue_item_count"] > 0),
        "errors": len(catalog["meta"]["errors"]),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if args.save:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out = os.path.join(OUTPUT_DIR, "vas_attrs_all.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False, indent=2)
        print(f"已保存: {out}", file=sys.stderr)

        # 精简版：仅 eventCode + attrs
        slim = [
            {
                "eventCode": e["eventCode"],
                "eventName": e["eventName"],
                "attrs": e["attrs"],
            }
            for e in catalog["events"]
        ]
        slim_path = os.path.join(OUTPUT_DIR, "vas_event_attrs_slim.json")
        with open(slim_path, "w", encoding="utf-8") as f:
            json.dump(slim, f, ensure_ascii=False, indent=2)
        print(f"已保存精简版: {slim_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
