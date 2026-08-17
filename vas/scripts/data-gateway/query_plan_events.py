"""
PlanEvent 全量查询 + 字段关系分析
查询标准异常(standardException)与增值服务(valueAddedService)全部有效记录。
"""

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

AJAX_URL = "https://cnpmstom.winit.com.cn/PlanEvent/ajaxProcess"
API_NAME = "pms.PlanEventService_queryPlanEventPage"

QUERY_PROFILES = {
    "standardException": {
        "referer": "https://cnpmstom.winit.com.cn/PlanEvent/standardException",
        "label": "标准异常",
        "params": {
            "where[vo][ACTION_NAME]": "standardException",
            "where[vo][eventType]": "STANDARD_EXCEPTION",
            "where[vo][eventCode]": "",
            "where[vo][eventName]": "",
            "where[vo][isActive]": "Y",
            "where[vo][controllable]": "",
            "where[vo][eventAttr]": "",
            "where[vo][sgCode]": "",
        },
    },
    "valueAddedService": {
        "referer": "https://cnpmstom.winit.com.cn/PlanEvent/valueAddedService",
        "label": "增值服务",
        "params": {
            "where[vo][ACTION_NAME]": "valueAddedService",
            "where[vo][eventType]": "VAS",
            "where[vo][eventCode]": "",
            "where[vo][eventName]": "",
            "where[vo][isActive]": "Y",
            "where[vo][pscgCode]": "",
            "where[vo][isAtomicVas]": "",
            "where[vo][vasType]": "",
        },
    },
}


def _find_auth_file(name: str) -> str:
    return os.path.join(AUTH_DIR, name)


def _load_cookies_into_session(session: requests.Session) -> None:
    cookie_file = _find_auth_file("playwright_cookies.json")
    if not os.path.exists(cookie_file):
        print(f"未找到 Cookie: {cookie_file}")
        print("请先运行: python 共享认证/auto_login.py")
        sys.exit(1)
    with open(cookie_file, encoding="utf-8") as f:
        cookies = json.load(f)
    for cookie in cookies:
        session.cookies.set(
            cookie["name"],
            cookie["value"],
            domain=cookie.get("domain", ""),
            path=cookie.get("path", "/"),
        )


def _extract_csrf_token(html: str) -> str:
    match = re.search(r"window\.__CSRF_TOKEN__\s*=\s*['\"]([^'\"]+)['\"]", html)
    return match.group(1) if match else ""


def get_session(referer: str) -> requests.Session:
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
    refresh_csrf_from_page(session, referer)
    return session


def refresh_csrf_from_page(session: requests.Session, page_url: str) -> str:
    """
    PlanEvent 的 ajaxProcess 必须使用对应业务页的 CSRF，
    不能复用 Product/index 保存的 token。
    """
    resp = session.get(page_url, timeout=60, allow_redirects=True)
    resp.raise_for_status()
    if "cniam.winit.com.cn" in resp.url:
        raise RuntimeError(
            "Cookie 已失效，被重定向到 IAM 登录页。请先运行: python 共享认证/auto_login.py"
        )
    csrf = _extract_csrf_token(resp.text)
    if not csrf:
        raise RuntimeError(f"未能从页面提取 CSRF Token: {page_url}")

    session.headers.update(
        {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "x-csrf-token": csrf,
            "Referer": page_url,
        }
    )
    return csrf


def _extract_rows(payload: dict[str, Any]) -> tuple[list[dict], int]:
    info = payload.get("info")
    total = 0
    rows: list[dict] = []

    if isinstance(info, dict):
        total = int(info.get("total") or info.get("recordsTotal") or info.get("recordsFiltered") or 0)
        candidate = info.get("data") or info.get("content") or info.get("rows") or info.get("list")
        if isinstance(candidate, list):
            rows = candidate
        if not total:
            total = len(rows)
    elif isinstance(info, list):
        rows = info
        total = len(rows)

    return rows, total


def fetch_all(profile_key: str, page_size: int = 500) -> dict[str, Any]:
    profile = QUERY_PROFILES[profile_key]
    session = get_session(profile["referer"])

    all_rows: list[dict] = []
    start = 0
    draw = 1
    total = None

    while True:
        params = {
            "api": API_NAME,
            "draw": str(draw),
            "start": str(start),
            "length": str(page_size),
            **profile["params"],
        }
        resp = session.post(AJAX_URL, data=params, timeout=60)
        resp.raise_for_status()
        payload = resp.json()

        if payload.get("status") != 1:
            info = str(payload.get("info", payload))
            if "权限" in info or "CSRF" in info.upper():
                refresh_csrf_from_page(session, profile["referer"])
                resp = session.post(AJAX_URL, data=params, timeout=60)
                resp.raise_for_status()
                payload = resp.json()
            if payload.get("status") != 1:
                raise RuntimeError(f"{profile_key} 查询失败: {payload.get('info', payload)}")

        rows, page_total = _extract_rows(payload)
        all_rows.extend(rows)
        if total is None:
            total = page_total

        if not rows or start + page_size >= total:
            break
        start += page_size
        draw += 1

    return {
        "profile": profile_key,
        "label": profile["label"],
        "total": total or len(all_rows),
        "count": len(all_rows),
        "rows": all_rows,
    }


def infer_field_relations(standard_rows: list[dict], vas_rows: list[dict]) -> dict[str, Any]:
    def summarize(rows: list[dict]) -> dict[str, Any]:
        if not rows:
            return {"fields": [], "sample": {}}
        fields = sorted(rows[0].keys())
        non_null = {}
        for field in fields:
            values = {str(row.get(field)) for row in rows[:200] if row.get(field) not in (None, "", [])}
            if values:
                non_null[field] = sorted(values)[:5]
        return {"fields": fields, "sample_values": non_null}

    std = summarize(standard_rows)
    vas = summarize(vas_rows)
    shared = sorted(set(std["fields"]) & set(vas["fields"]))
    only_std = sorted(set(std["fields"]) - set(vas["fields"]))
    only_vas = sorted(set(vas["fields"]) - set(std["fields"]))

    link_candidates = []
    for field in shared:
        if field.endswith("Code") or field.endswith("Id") or field in (
            "eventCode",
            "eventType",
            "sgCode",
            "pscgCode",
            "serviceCode",
        ):
            link_candidates.append(field)

    return {
        "standardException": std,
        "valueAddedService": vas,
        "shared_fields": shared,
        "standard_only_fields": only_std,
        "vas_only_fields": only_vas,
        "potential_link_fields": link_candidates,
    }


def build_mermaid(relations: dict[str, Any]) -> str:
    lines = [
        "erDiagram",
        "    STANDARD_EXCEPTION {",
    ]
    for field in relations["standard_only_fields"][:12]:
        lines.append(f"        string {field}")
    for field in relations["shared_fields"][:10]:
        lines.append(f"        string {field}")
    lines.append("    }")
    lines.append("    VALUE_ADDED_SERVICE {")
    for field in relations["vas_only_fields"][:12]:
        lines.append(f"        string {field}")
    for field in relations["shared_fields"][:10]:
        lines.append(f"        string {field}")
    lines.append("    }")

    for field in relations["potential_link_fields"][:6]:
        lines.append(f"    STANDARD_EXCEPTION }}o--o{{ VALUE_ADDED_SERVICE : {field}")

    lines.append('    STANDARD_EXCEPTION ||--|| PLAN_EVENT_PAGE : "queryPlanEventPage"')
    lines.append('    VALUE_ADDED_SERVICE ||--|| PLAN_EVENT_PAGE : "queryPlanEventPage"')
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="查询 PlanEvent 标准异常与增值服务")
    parser.add_argument(
        "--profile",
        choices=["all", "standardException", "valueAddedService"],
        default="all",
    )
    parser.add_argument("--save", action="store_true", help="保存 JSON 到 output/")
    parser.add_argument("--page-size", type=int, default=500)
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results: dict[str, Any] = {}

    profiles = (
        ["standardException", "valueAddedService"]
        if args.profile == "all"
        else [args.profile]
    )

    for key in profiles:
        print(f"查询 {QUERY_PROFILES[key]['label']} ({key}) ...")
        data = fetch_all(key, page_size=args.page_size)
        results[key] = data
        print(f"  -> {data['count']} 条")

    if args.profile == "all":
        relations = infer_field_relations(
            results["standardException"]["rows"],
            results["valueAddedService"]["rows"],
        )
        mermaid = build_mermaid(relations)
        results["field_relations"] = relations
        results["mermaid_er"] = mermaid

    if args.save or args.profile == "all":
        out_file = os.path.join(OUTPUT_DIR, "plan_events_all.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"已保存: {out_file}")

        if args.profile == "all":
            rel_file = os.path.join(OUTPUT_DIR, "field_relations.json")
            with open(rel_file, "w", encoding="utf-8") as f:
                json.dump(results["field_relations"], f, ensure_ascii=False, indent=2)
            mermaid_file = os.path.join(OUTPUT_DIR, "plan_events_er.mmd")
            with open(mermaid_file, "w", encoding="utf-8") as f:
                f.write(results["mermaid_er"])
            print(f"关系分析: {rel_file}")
            print(f"Mermaid图: {mermaid_file}")

    if args.profile != "all":
        sample = results[args.profile]["rows"][:2]
        print(json.dumps(sample, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
