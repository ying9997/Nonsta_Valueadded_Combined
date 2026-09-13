# coding: utf-8
"""Task B: probe whether TOM Cookie can download VAS attachment bytes."""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    AJAX_OMS,
    _new_session,
    refresh_oms_csrf,
    set_oms_referer,
)

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260910_attachment_probe")
OUT.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR = OUT / "downloaded_samples"
SAMPLES_DIR.mkdir(exist_ok=True)

OMS = "https://cnomstom.winit.com.cn"
ORDERS = ["VASC000000315774", "VASC000000360654", "VASC000000326061"]
KNOWN_FMS = [
    "https://usfmsstream.winit.com.cn/24d2ab18ea4a4f7a90356ec2523fd437/2026/08/01/9a62da67b8f44a90833555341c1f3b00.JPEG"
]


def sniff_type(data: bytes) -> str:
    if data.startswith(b"\x89PNG"):
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"PK"):
        return "application/zip-or-office"
    if data.lstrip()[:1] in (b"<", b"{") or b"<html" in data[:200].lower():
        return "text/html-or-json"
    return "application/octet-stream"


def collect_urls(obj: Any, acc: list[dict[str, str]]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("fileUrl", "url", "filePath", "objectURI") and isinstance(v, str) and v.startswith("http"):
                acc.append({"field": k, "url": v, "fileName": str(obj.get("fileName") or obj.get("name") or "")})
            elif k in ("fileName",) and isinstance(v, str) and "http" in v:
                acc.append({"field": k, "url": v, "fileName": v})
            else:
                collect_urls(v, acc)
    elif isinstance(obj, list):
        for item in obj:
            collect_urls(item, acc)
    elif isinstance(obj, str) and "fmsstream.winit.com.cn" in obj:
        for m in re.findall(r"https://[a-z]+fmsstream\.winit\.com\.cn/[^\"'\\s]+", obj):
            acc.append({"field": "embedded", "url": m.rstrip("\\"), "fileName": m.rsplit("/", 1)[-1]})


def get_vas(session, order_no: str) -> dict:
    resp = session.post(
        AJAX_OMS,
        data={"api": "oms.VaOrderService_getVasList", "where[orderNo]": order_no, "draw": "1", "start": "0", "length": "20"},
        timeout=60,
    )
    resp.raise_for_status()
    body = resp.json()
    content = (body.get("info") or {}).get("content") or []
    return content[0] if content else {}


def try_get(session, url: str, use_cookie: bool) -> dict[str, Any]:
    headers = dict(session.headers)
    try:
        if use_cookie:
            resp = session.get(url, timeout=60, allow_redirects=True)
        else:
            import requests

            resp = requests.get(url, headers={"User-Agent": headers.get("User-Agent", "")}, timeout=60, verify=False)
        data = resp.content or b""
        kind = sniff_type(data[:64] if data else b"")
        readable = kind.startswith("image/") or kind == "application/pdf" or kind.startswith("application/zip")
        login_like = "cniam" in (resp.url or "") or b"login" in data[:800].lower()
        return {
            "url": url,
            "useCookie": use_cookie,
            "status": resp.status_code,
            "finalUrl": resp.url,
            "bytes": len(data),
            "contentType": resp.headers.get("Content-Type", ""),
            "sniff": kind,
            "readable": bool(readable and not login_like and resp.status_code == 200 and len(data) > 32),
            "loginRedirect": login_like,
        }
    except Exception as err:  # noqa: BLE001
        return {"url": url, "useCookie": use_cookie, "error": str(err), "readable": False}


def save_sample(name: str, url: str, session) -> Path | None:
    try:
        resp = session.get(url, timeout=60)
        if resp.status_code != 200 or not resp.content or len(resp.content) < 32:
            return None
        if b"<html" in resp.content[:200].lower():
            return None
        path = SAMPLES_DIR / name
        path.write_bytes(resp.content)
        return path
    except Exception:
        return None


def main() -> None:
    report: dict[str, Any] = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "orders": ORDERS,
        "linkPatterns": [],
        "downloads": [],
        "htmlHits": [],
        "steps": [],
    }
    session = _new_session()
    refresh_oms_csrf(session, referer=f"{OMS}/VasOrder/index")

    all_urls: list[dict[str, str]] = []
    for order in ORDERS:
        detail = f"{OMS}/VasOrder/detail/isFill/Y/orderNo/{order}/isView/N"
        set_oms_referer(session, detail)
        atom = get_vas(session, order)
        files = atom.get("vaAtomFiles") or []
        report["steps"].append({"step": "getVasList", "order": order, "fileCount": len(files), "atomId": atom.get("id")})
        collect_urls(atom, all_urls)
        html = session.get(detail, timeout=60)
        report["htmlHits"].append(
            {
                "order": order,
                "status": html.status_code,
                "finalUrl": html.url,
                "fmsFileDownload": "/fmsFileDownload/" in (html.text or ""),
                "fmsstream": "fmsstream.winit.com.cn" in (html.text or ""),
                "inboundBatchDownloadFile": "inboundBatchDownloadFile" in (html.text or ""),
            }
        )
        for m in re.findall(r"https://[a-z]+fmsstream\.winit\.com\.cn/[^\"'\\s<>]+", html.text or ""):
            all_urls.append({"field": "html", "url": m, "fileName": m.rsplit("/", 1)[-1], "order": order})
        for m in re.findall(r"/[A-Za-z]+/fmsFileDownload/\?url=[^\"'\\s<>]+", html.text or ""):
            all_urls.append({"field": "fmsFileDownload", "url": OMS + m if m.startswith("/") else m, "fileName": "", "order": order})

    for item in KNOWN_FMS:
        all_urls.append({"field": "known_from_326061_attr", "url": item, "fileName": item.rsplit("/", 1)[-1]})

    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for item in all_urls:
        url = item.get("url") or ""
        if not url or url in seen:
            continue
        seen.add(url)
        unique.append(item)
    report["linkPatterns"] = unique[:40]

    for item in unique[:12]:
        url = item["url"]
        proxy = None
        if "fmsstream.winit.com.cn" in url and "fmsFileDownload" not in url:
            proxy = f"{OMS}/VasOrder/fmsFileDownload/?url={quote(url, safe='')}"
        for candidate, cookie in ((url, True), (url, False)):
            result = try_get(session, candidate, cookie)
            result["source"] = item
            report["downloads"].append(result)
        if proxy:
            result = try_get(session, proxy, True)
            result["source"] = {**item, "via": "VasOrder/fmsFileDownload"}
            report["downloads"].append(result)
            saved = save_sample(item.get("fileName") or "sample.bin", proxy if result.get("readable") else url, session)
            if saved:
                report["downloads"][-1]["savedAs"] = str(saved)

    readable = [d for d in report["downloads"] if d.get("readable")]
    (OUT / "download-probe.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    table_lines = ["| 附件类型 | 文件名 | 大小 | Cookie | 下载成功 | 内容可读 |", "|---------|--------|------|--------|---------|---------|"]
    for d in report["downloads"]:
        src = d.get("source") or {}
        table_lines.append(
            f"| {d.get('sniff') or d.get('error') or '-'} | {src.get('fileName') or src.get('url','')[:40]} | {d.get('bytes','-')} | {d.get('useCookie')} | {d.get('status')} | {'是' if d.get('readable') else '否'} |"
        )

    md = f"""# 附件下载探测报告

生成时间：{report['generatedAt']}

## 附件链接格式
- 详情页 `vaAtomFiles[].url` / 属性 JSON 里的 `fileUrl`
- 直链示例：`https://usfmsstream.winit.com.cn/{{uuid}}/YYYY/MM/DD/{{file}}`
- OMS 代理：`https://cnomstom.winit.com.cn/VasOrder/fmsFileDownload/?url=` + URL 编码
- 异常单页同类代理：`/UnusualEvent/fmsFileDownload/?url=`
- 仓库批量：`POST /VasOrder/inboundBatchDownloadFile`（`fileData` JSON）

## 鉴权方式
- FMS 直链：探测见下表（Cookie / 无 Cookie）
- OMS `fmsFileDownload`：需要 TOM Cookie；失效会跳 IAM login

## 下载测试
{chr(10).join(table_lines)}

## 后续接入 LLM 的可行性
- 图片附件：下载成功后可走多模态 LLM，或本地 OCR（Tesseract）；中文标签准确率需抽样
- PDF 附件：pdf-parse / 多模态
- Excel 附件：openpyxl / pandas；需确认 FMS 是否给到 xlsx 二进制

## 结论
- 能否下载：{'是' if readable else '否（本轮未拿到可读二进制，详见 JSON）'}
- 可读样本数：{len(readable)} / {len(report['downloads'])}
- 接入 LLM 的工作量估计：{'下载链路已通，主要工作是按类型解析并控制体积' if readable else '先打通鉴权/代理，再谈解析'}
"""
    (OUT / "download-probe-report.md").write_text(md, encoding="utf-8")
    print(json.dumps({"ok": True, "readable": len(readable), "attempts": len(report["downloads"]), "out": str(OUT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
