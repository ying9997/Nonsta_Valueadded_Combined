"""OMS 异常单：列表查询 + 详情 HTML 解析附件原始 FMS URL。"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import unquote

import requests

from tom_fms_preview import build_tom_fms_preview_url
import urllib3

urllib3.disable_warnings()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUTH_DIR = os.path.join(ROOT, "共享认证")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
AJAX = "https://cnomstom.winit.com.cn/UnusualEvent/ajaxProcess"
INDEX = "https://cnomstom.winit.com.cn/UnusualEvent/index"
DETAIL_TMPL = "https://cnomstom.winit.com.cn/UnusualEvent/detail/eventNo/{event_no}"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
)

FMS_DOWNLOAD_RE = re.compile(
    r'fmsFileDownload/\?url=([^"\'>\s]+)',
    re.IGNORECASE,
)
IMG_TITLE_RE = re.compile(
    r'title="([^"]+\.(?:jpe?g|png|gif|webp))"',
    re.IGNORECASE,
)

# 与抓包 capture_20260622_205157 列表筛选一致（近一月）
CAPTURE_DEFAULT_START_MS = "1779379200000"
CAPTURE_DEFAULT_END_MS = "1782143999000"


def _new_session() -> requests.Session:
    session = requests.Session()
    session.verify = False
    session.headers.update({"User-Agent": USER_AGENT})
    path = os.path.join(AUTH_DIR, "playwright_cookies.json")
    if not os.path.exists(path):
        print("请先运行 共享认证/auto_login.py")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        for c in json.load(f):
            session.cookies.set(c["name"], c["value"], domain=c.get("domain", ""), path=c.get("path", "/"))
    return session


def refresh_csrf(session: requests.Session, referer: str = INDEX) -> None:
    resp = session.get(referer, timeout=60, allow_redirects=True)
    resp.raise_for_status()
    if "cniam.winit.com.cn" in resp.url:
        raise RuntimeError("Cookie 失效，请重新运行 共享认证/auto_login.py")
    m = re.search(r"window\.__CSRF_TOKEN__\s*=\s*['\"]([^'\"]+)['\"]", resp.text)
    if not m:
        raise RuntimeError("无法提取 CSRF")
    session.headers.update(
        {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "x-csrf-token": m.group(1),
            "Referer": referer,
        }
    )


def oms_post(session: requests.Session, params: dict[str, Any]) -> dict[str, Any]:
    resp = session.post(AJAX, data=params, timeout=90)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != 1:
        raise RuntimeError(f"{params.get('api')} 失败: {data.get('info', data)}")
    return data


def _rows(info: Any) -> list[dict]:
    if isinstance(info, list):
        return info
    if isinstance(info, dict):
        for k in ("content", "data", "rows"):
            v = info.get(k)
            if isinstance(v, list):
                return v
    return []


def date_to_ms(d: date, end_of_day: bool = False) -> str:
    if end_of_day:
        dt = datetime.combine(d, datetime.max.time().replace(microsecond=0))
    else:
        dt = datetime.combine(d, datetime.min.time())
    return str(int(dt.timestamp() * 1000))


def default_date_range_ms() -> tuple[str, str]:
    end = date.today()
    start = end - timedelta(days=30)
    return date_to_ms(start), date_to_ms(end, end_of_day=True)


def normalize_time_ms(val: str) -> str:
    if val.isdigit() and len(val) >= 12:
        return val
    d = datetime.strptime(val, "%Y-%m-%d").date()
    return date_to_ms(d)


def find_unusual_event_page(
    session: requests.Session,
    *,
    offset: int = 0,
    length: int = 50,
    **vo_fields: str,
) -> tuple[list[dict], int]:
    """列表接口：oms.UnusualEventOrderService_findUnusualEventOrderPage"""
    if "startTime" not in vo_fields and "eventNo" not in vo_fields:
        vo_fields.setdefault("startTime", CAPTURE_DEFAULT_START_MS)
        vo_fields.setdefault("endTime", CAPTURE_DEFAULT_END_MS)

    params: dict[str, Any] = {
        "api": "oms.UnusualEventOrderService_findUnusualEventOrderPage",
        "draw": "1",
        "start": str(offset),
        "length": str(length),
    }
    for k, v in vo_fields.items():
        if v is not None and v != "":
            params[f"where[unusualEventOrderVo][{k}]"] = v

    session.headers["Referer"] = INDEX
    data = oms_post(session, params)
    info = data.get("info") or {}
    rows = _rows(info)
    total = 0
    if isinstance(info, dict):
        total = int(info.get("totalElements") or info.get("total") or len(rows))
    return rows, total


def find_all_unusual_events(
    session: requests.Session,
    *,
    page_size: int = 100,
    max_rows: int = 0,
    **vo_fields: str,
) -> tuple[list[dict], int]:
    all_rows: list[dict] = []
    offset = 0
    total = 0
    while True:
        rows, total = find_unusual_event_page(session, offset=offset, length=page_size, **vo_fields)
        if not rows:
            break
        all_rows.extend(rows)
        if max_rows and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break
        if len(all_rows) >= total:
            break
        offset += page_size
    return all_rows, total


def extract_attachments_from_html(html: str) -> list[dict[str, str]]:
    seen: set[str] = set()
    files: list[dict[str, str]] = []
    titles = IMG_TITLE_RE.findall(html)

    for raw in FMS_DOWNLOAD_RE.findall(html):
        url = unquote(raw)
        if not url.startswith("http") or url in seen:
            continue
        seen.add(url)
        file_name = url.rsplit("/", 1)[-1]
        files.append({"fileName": file_name, "url": url})

    if titles and len(titles) >= len(files):
        for i, f in enumerate(files):
            if i < len(titles):
                f["fileName"] = titles[i]

    return files


def _hidden_field(html: str, field_id: str) -> str:
    m = re.search(rf'id="{field_id}"[^>]*value="([^"]*)"', html)
    if m:
        return m.group(1)
    m = re.search(rf'value="([^"]*)"[^>]*id="{field_id}"', html)
    return m.group(1) if m else ""


def fetch_detail_attachments(session: requests.Session, event_no: str) -> dict[str, Any]:
    url = DETAIL_TMPL.format(event_no=event_no)
    saved = {k: session.headers.get(k) for k in ("Content-Type", "x-csrf-token", "X-Requested-With")}
    for k in saved:
        session.headers.pop(k, None)
    session.headers["Referer"] = INDEX
    try:
        resp = session.get(url, timeout=90, allow_redirects=True)
        resp.raise_for_status()
        if "cniam.winit.com.cn" in resp.url:
            raise RuntimeError("Cookie 失效，请重新 auto_login.py")
        html = resp.text
    finally:
        for k, v in saved.items():
            if v:
                session.headers[k] = v

    return {
        "eventNo": event_no,
        "eventCode": _hidden_field(html, "eventCode"),
        "eventName": _hidden_field(html, "eventName"),
        "detailUrl": url,
        "eventFiles": extract_attachments_from_html(html),
    }


def query_unusual_events(
    *,
    event_no: str = "",
    event_code: str = "",
    order_no: str = "",
    start_time: str = "",
    end_time: str = "",
    max_rows: int = 100,
    page_size: int = 100,
    with_attachments: bool = True,
    delay_sec: float = 0.3,
    on_progress: Any = None,
) -> dict[str, Any]:
    session = _new_session()
    refresh_csrf(session)

    vo: dict[str, str] = {}
    if event_no:
        vo["eventNo"] = event_no
    if event_code:
        vo["eventCode"] = event_code
    if order_no:
        vo["orderNo"] = order_no
    if start_time:
        if start_time.isdigit():
            vo["startTime"] = start_time
        else:
            d = datetime.strptime(start_time, "%Y-%m-%d").date()
            vo["startTime"] = date_to_ms(d)
    if end_time:
        if end_time.isdigit():
            vo["endTime"] = end_time
        else:
            d = datetime.strptime(end_time, "%Y-%m-%d").date()
            vo["endTime"] = date_to_ms(d, end_of_day=True)

    rows, total = find_all_unusual_events(
        session,
        page_size=page_size,
        max_rows=max_rows,
        **vo,
    )
    results: list[dict[str, Any]] = []

    for i, row in enumerate(rows, 1):
        eno = row.get("eventNo") or ""
        item: dict[str, Any] = {
            "eventNo": eno,
            "orderNo": row.get("orderNo"),
            "docType": row.get("docType"),
            "docNo": row.get("docNo"),
            "eventCode": row.get("eventCode"),
            "eventName": row.get("eventName"),
            "status": row.get("status"),
            "warehouseName": row.get("warehouseName"),
            "customerName": row.get("customerName"),
            "created": row.get("created"),
        }
        if with_attachments and eno:
            if on_progress:
                on_progress(i, len(rows), eno)
            detail = fetch_detail_attachments(session, eno)
            item["eventFiles"] = detail.get("eventFiles") or []
            if delay_sec > 0:
                time.sleep(delay_sec)
        results.append(item)

    return {
        "filter": vo,
        "total": total,
        "count": len(results),
        "items": results,
    }


def export_csv(result: dict[str, Any], path: str) -> None:
    rows: list[dict[str, str]] = []
    for item in result.get("items") or []:
        files = item.get("eventFiles") or []
        if not files:
            rows.append(
                {
                    "eventNo": item.get("eventNo") or "",
                    "orderNo": item.get("orderNo") or "",
                    "eventCode": item.get("eventCode") or "",
                    "eventName": item.get("eventName") or "",
                    "fileIndex": "",
                    "fileName": "",
                    "fileUrl": "",
                    "fileUrlTom": "",
                }
            )
            continue
        for idx, f in enumerate(files, 1):
            file_url = f.get("url") or ""
            rows.append(
                {
                    "eventNo": item.get("eventNo") or "",
                    "orderNo": item.get("orderNo") or "",
                    "eventCode": item.get("eventCode") or "",
                    "eventName": item.get("eventName") or "",
                    "fileIndex": str(idx),
                    "fileName": f.get("fileName") or "",
                    "fileUrl": file_url,
                    "fileUrlTom": build_tom_fms_preview_url(file_url),
                }
            )

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "eventNo",
                "orderNo",
                "eventCode",
                "eventName",
                "fileIndex",
                "fileName",
                "fileUrl",
                "fileUrlTom",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="OMS 异常单列表 + 详情 HTML 附件批量解析")
    parser.add_argument("--event-no", default="", help="异常单号 EB...")
    parser.add_argument("--event-code", default="", help="异常编码，如 B0901E02")
    parser.add_argument("--order-no", default="", help="关联订单号")
    parser.add_argument("--start-time", default="", help="开始日期 yyyy-MM-dd 或毫秒时间戳")
    parser.add_argument("--end-time", default="", help="结束日期 yyyy-MM-dd 或毫秒时间戳")
    parser.add_argument("--max-rows", type=int, default=0, help="最多处理条数，0=不限制（拉全量）")
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--delay", type=float, default=0.3, help="每条详情请求间隔秒数")
    parser.add_argument("--no-attachments", action="store_true")
    parser.add_argument("--save", action="store_true")
    parser.add_argument("--export-csv", action="store_true", help="导出扁平行 CSV（一行一图）")
    args = parser.parse_args()

    def progress(i: int, total: int, eno: str) -> None:
        print(f"[{i}/{total}] 拉取详情附件: {eno}", flush=True)

    result = query_unusual_events(
        event_no=args.event_no,
        event_code=args.event_code,
        order_no=args.order_no,
        start_time=args.start_time,
        end_time=args.end_time,
        max_rows=args.max_rows,
        page_size=args.page_size,
        with_attachments=not args.no_attachments,
        delay_sec=args.delay,
        on_progress=progress if not args.no_attachments else None,
    )

    file_total = sum(len(x.get("eventFiles") or []) for x in result["items"])
    summary = {
        "filter": result["filter"],
        "totalMatched": result["total"],
        "fetched": result["count"],
        "attachmentRows": file_total,
        "items": [
            {
                "eventNo": x["eventNo"],
                "orderNo": x.get("orderNo"),
                "fileCount": len(x.get("eventFiles") or []),
            }
            for x in result["items"]
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    tag = args.event_no or args.event_code or args.order_no or "list"
    if args.start_time and args.end_time:
        def _compact(t: str) -> str:
            return t.replace("-", "") if "-" in t else t[:8]
        tag = f"{tag}_{_compact(args.start_time)}_{_compact(args.end_time)}"
    if args.save or args.export_csv:
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    if args.save:
        out = os.path.join(OUTPUT_DIR, f"unusual_event_{tag}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"JSON 已保存: {out}")

    if args.export_csv:
        csv_path = os.path.join(OUTPUT_DIR, f"unusual_event_{tag}_files.csv")
        export_csv(result, csv_path)
        print(f"CSV 已保存: {csv_path}")


if __name__ == "__main__":
    main()
