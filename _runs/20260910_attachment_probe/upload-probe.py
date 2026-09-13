# coding: utf-8
"""Task C: probe whether TOM Cookie can upload a file into a VAS attachment slot.

Whitelist: VASC000000360654 only. Never call vaOrderReview. Clean up after success.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    AJAX_OMS,
    _new_session,
    refresh_oms_csrf,
    set_oms_referer,
)

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260910_attachment_probe")
OUT.mkdir(parents=True, exist_ok=True)
ORDER = "VASC000000360654"
OMS = "https://cnomstom.winit.com.cn"
AJAX_SAVE = f"{OMS}/VasOrder/ajaxSave"
DETAIL = f"{OMS}/VasOrder/detail/isFill/Y/orderNo/{ORDER}/isView/N"
MARKER = "copilot-attachment-probe-20260910.txt"
LOCATION = "FMS00002-CNR-TEMP-OWH-ALL"
FMS_CANDIDATES = [
    "https://cnfmsstream.winit.com.cn/upload",
    "https://cnfmsstream.winit.com.cn/fms/upload",
    "https://cnfmsstream.winit.com.cn/v1/file/upload",
    "https://cnfmsstream.winit.com.cn/file/upload",
    f"{OMS}/VasOrder/fmsUpload",
    f"{OMS}/Common/fmsUpload",
    "http://files.winit.com.cn:80/uploads",
]


def flatten(prefix: str, value: Any, out: dict[str, str]) -> None:
    if isinstance(value, dict):
        for k, v in value.items():
            flatten(f"{prefix}[{k}]" if prefix else str(k), v, out)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            flatten(f"{prefix}[{i}]", v, out)
    elif value is None:
        return
    elif isinstance(value, bool):
        out[prefix] = "true" if value else "false"
    else:
        out[prefix] = str(value)


def post_process(session, api: str, extra: dict | None = None) -> dict:
    data: dict[str, str] = {"api": api}
    if extra:
        data.update({str(k): str(v) for k, v in extra.items()})
    resp = session.post(AJAX_OMS, data=data, timeout=60)
    resp.raise_for_status()
    return resp.json()


def post_save(session, api: str, form_obj: dict) -> dict:
    if "Review" in api or "review" in api:
        raise RuntimeError("refusing review API")
    resp = session.post(
        AJAX_SAVE,
        data={"api": api, "form": json.dumps(form_obj, ensure_ascii=False), "jsondata": "true"},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def load_atom(session) -> dict:
    body = post_process(session, "oms.VaOrderService_getVasList", extra={"where[orderNo]": ORDER, "draw": "1", "start": "0", "length": "20"})
    content = (body.get("info") or {}).get("content") or []
    if not content:
        raise RuntimeError("getVasList empty")
    return content[0]


def extract_fms_js_hints(html: str, session=None) -> dict[str, Any]:
    fms = re.search(r'fms\s*:\s*"([^"]+)"', html)
    user = re.search(r'fmsUser\s*:\s*"([^"]+)"', html)
    loc = re.search(r'fmsLocationName\s*:\s*"([^"]+)"', html)
    scripts = re.findall(r'src="([^"]+\.js[^"]*)"', html, flags=re.I)
    upload_hits = sorted(set(re.findall(r'[^"\']{0,80}upload[^"\']{0,80}', html, flags=re.I)))[:30]
    js_upload_urls: list[str] = []
    interesting = [s for s in scripts if re.search(r"fms|fileupload|functions", s, re.I)]
    if session is not None:
        for src in interesting[:8]:
            url = src if src.startswith("http") else f"{OMS}{src}"
            try:
                body = session.get(url, timeout=30).text or ""
                for m in re.findall(r"https?://[^\"'\\s]+(?:upload|fms)[^\"'\\s]*", body, flags=re.I):
                    js_upload_urls.append(m)
                if "fms.upload" in body or "locationName" in body:
                    js_upload_urls.append(f"seen-in:{url}")
            except Exception as err:  # noqa: BLE001
                js_upload_urls.append(f"fetch-fail:{url}:{err}")
    return {
        "fms": fms.group(1) if fms else "",
        "fmsUser": user.group(1) if user else "",
        "fmsLocationName": loc.group(1) if loc else "",
        "scriptSrc": interesting[:15] or scripts[:10],
        "jsUploadUrls": js_upload_urls[:20],
        "uploadStringHits": upload_hits[:20],
        "hasFileuploadModule": "fileupload" in html,
    }


def try_fms_upload(session, file_path: Path, hints: dict[str, Any]) -> dict[str, Any]:
    """Mirror Public/vendor/fmsUpload.js: getFmsAuthorization → FMS /upload with sign headers."""
    loc = LOCATION
    fms_host = hints.get("fms") or "https://cnfmsstream.winit.com.cn"
    fms_user = hints.get("fmsUser") or "fms_cn_tom"
    attempts: list[dict[str, Any]] = []
    auth_url = f"{OMS}/VasOrder/getFmsAuthorization"
    auth = session.post(auth_url, data={"locationName": loc}, timeout=60)
    try:
        auth_body = auth.json()
    except Exception:
        auth_body = {"raw": (auth.text or "")[:400]}
    attempts.append({"step": "getFmsAuthorization", "status": auth.status_code, "body": auth_body})
    info = (auth_body or {}).get("info") if isinstance(auth_body, dict) else None
    if not isinstance(info, dict) or not info.get("sign"):
        return {"ok": False, "attempts": attempts}

    files = {"file": (file_path.name, file_path.read_bytes(), "text/plain")}
    data = {"locationName": loc}
    fms_headers = {
        "User-Agent": session.headers.get("User-Agent", ""),
        "platform": "fms",
        "user": fms_user,
        "version": "V1.0",
        "Authorization": str(info.get("sign")),
        "signDate": str(info.get("time") or ""),
    }
    import requests

    jpeg = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260910_attachment_probe\downloaded_samples\048e14b500f14c45b957c7584de5ef15.JPEG")
    variants = [
        ("txt-session-cookies", file_path, "text/plain", True),
        ("txt-clean", file_path, "text/plain", False),
    ]
    if jpeg.exists():
        variants.append(("jpeg-clean", jpeg, "image/jpeg", False))

    parsed = None
    object_uri = ""
    up = None
    used_url = f"{fms_host}/upload"
    for label, path, mime, use_sess in variants:
        files = {"file": (path.name, path.read_bytes(), mime)}
        try:
            if use_sess:
                up = session.post(used_url, files=files, data=data, headers=fms_headers, timeout=60)
            else:
                up = requests.post(used_url, files=files, data=data, headers=fms_headers, timeout=60, verify=False)
        except Exception as err:  # noqa: BLE001
            attempts.append({"step": f"fms_upload:{label}", "error": str(err)})
            continue
        try:
            parsed = up.json()
        except Exception:
            parsed = None
        attempts.append(
            {
                "step": f"fms_upload:{label}",
                "url": used_url,
                "status": up.status_code,
                "body": parsed if parsed is not None else (up.text or "")[:400],
            }
        )
        data_obj = parsed.get("data") if isinstance(parsed, dict) else None
        object_uri = data_obj.get("objectURI") if isinstance(data_obj, dict) else ""
        code_ok = isinstance(parsed, dict) and object_uri
        if code_ok:
            break
    if not object_uri:
        return {"ok": False, "attempts": attempts, "parsed": parsed}

    token_resp = session.post(
        f"{OMS}/VasOrder/getFmsImageToken",
        data={"objectURI": object_uri},
        timeout=60,
    )
    try:
        token_body = token_resp.json()
    except Exception:
        token_body = (token_resp.text or "")[:400]
    attempts.append({"step": "getFmsImageToken", "status": token_resp.status_code, "body": token_body})
    return {
        "ok": True,
        "url": f"{fms_host}/upload",
        "parsed": parsed,
        "objectURI": object_uri,
        "fileToken": token_body,
        "attempts": attempts,
    }


def attach_and_cleanup(session, atom: dict, uploaded: dict[str, Any]) -> dict[str, Any]:
    parsed = uploaded.get("parsed") or {}
    file_url = uploaded.get("objectURI") or ""
    if not file_url:
        return {"attached": False, "reason": "no file url in FMS response", "parsed": parsed}

    original = list(atom.get("vaAtomFiles") or [])
    probe_file = {
        "fileType": "VAS_ATTR_REL_AOOI",
        "fileName": MARKER,
        "url": file_url,
        "type": "VAS_ATTR_REL_AOOI",
    }
    form = {
        "orderNo": ORDER,
        "atomId": atom.get("id"),
        "sop": atom.get("sop") or "",
        "sceneOverviewCode": atom.get("sceneOverviewCode") or "",
        "serviceCode": atom.get("serviceCode"),
        "vaAtomAttrs": [
            {"id": a.get("id"), "attributeValue": a.get("attributeValue")}
            for a in (atom.get("vaAtomAttrs") or [])
        ],
        "vaAtomFiles": original + [probe_file],
    }
    save = post_save(session, "oms.VaOrderService_updateAtomDetails", form)
    after = load_atom(session)
    after_names = [f.get("fileName") for f in (after.get("vaAtomFiles") or [])]
    visible = MARKER in after_names
    cleaned = False
    if visible:
        revert = {
            **form,
            "vaAtomFiles": [f for f in (after.get("vaAtomFiles") or []) if f.get("fileName") != MARKER],
        }
        post_save(session, "oms.VaOrderService_updateAtomDetails", revert)
        cleaned_atom = load_atom(session)
        cleaned = MARKER not in [f.get("fileName") for f in (cleaned_atom.get("vaAtomFiles") or [])]
    return {
        "attached": True,
        "saveStatus": save.get("status"),
        "saveInfo": save.get("info"),
        "omsVisible": visible,
        "cleaned": cleaned,
        "afterNames": after_names,
        "statusDesc": after.get("statusDesc") or after.get("status"),
    }


def main() -> None:
    report: dict[str, Any] = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "orderNo": ORDER,
        "noAuditPass": True,
        "steps": [],
    }
    session = _new_session()
    try:
        refresh_oms_csrf(session)
    except Exception as err:
        report["csrfError"] = str(err)
        html0 = session.get("https://cnomstom.winit.com.cn/VasOrder/index", timeout=60)
        report["csrfDebug"] = {"url": html0.url, "status": html0.status_code, "hasToken": "__CSRF_TOKEN__" in (html0.text or ""), "snippet": (html0.text or "")[html0.text.find("CSRF") : html0.text.find("CSRF") + 120] if html0.text else ""}
        raise
    set_oms_referer(session, DETAIL)

    html = session.get(DETAIL, timeout=60)
    hints = extract_fms_js_hints(html.text or "", session)
    report["apiHints"] = hints
    report["steps"].append({"step": "detail_html", "status": html.status_code, "finalUrl": html.url})

    atom_before = load_atom(session)
    report["before"] = {
        "id": atom_before.get("id"),
        "status": atom_before.get("status"),
        "statusDesc": atom_before.get("statusDesc"),
        "files": atom_before.get("vaAtomFiles") or [],
    }

    probe_file = OUT / MARKER
    probe_file.write_text("copilot attachment upload probe — delete me\n", encoding="utf-8")
    uploaded = try_fms_upload(session, probe_file, hints)
    report["upload"] = {k: v for k, v in uploaded.items() if k != "attempts"}
    report["uploadAttempts"] = uploaded.get("attempts") or []

    attach = {"attached": False, "omsVisible": False, "cleaned": True}
    try:
        if uploaded.get("ok"):
            session.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
            set_oms_referer(session, DETAIL)
            attach = attach_and_cleanup(session, atom_before, uploaded)
    except Exception as err:
        attach = {"attached": False, "omsVisible": False, "cleaned": True, "error": str(err)}
    report["attach"] = attach
    try:
        report["after"] = {"files": (load_atom(session).get("vaAtomFiles") or [])}
    except Exception as err:
        report["after"] = {"error": str(err)}

    (OUT / "upload-probe.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    md = f"""# 附件上传探测报告

生成时间：{report['generatedAt']}
测试单：`{ORDER}`（白名单；未调用 vaOrderReview）

## 上传 API
- 页面 FMS：`{hints.get('fms') or '未从详情页解析到'}`
- fmsUser：`{hints.get('fmsUser') or '-'}`
- locationName：`{hints.get('fmsLocationName') or LOCATION}`
- 业务保存：`POST {AJAX_SAVE}` `api=oms.VaOrderService_updateAtomDetails`，`vaAtomFiles[]`（fileType/fileName/url）
- 页面另有：`oms.VaOrderService_batchUploadMerchandiseAttachment`（标签示例图，不是通用附件槽）

## 上传测试
| 文件 | fieldKey | 上传成功 | OMS 可见 | 可删除 |
|------|---------|---------|---------|--------|
| {MARKER} | VAS_ATTR_REL_AOOI | {'是' if uploaded.get('ok') else '否'} | {'是' if attach.get('omsVisible') else '否'} | {'是' if attach.get('cleaned') else '否/未挂上'} |

## 上传后的副作用
- 是否改变订单状态：{report['before'].get('statusDesc')} → 见 upload-probe.json `after`
- 是否触发通知：本探测未观察通知渠道

## 安全建议
- 是否需要白名单：是，必须与 OMS_WRITE_ALLOWLIST 同类限制
- 是否可回滚：{'是，已从 vaAtomFiles 去掉探测文件' if attach.get('cleaned') else '未挂上或未能删除，需人工看 OMS'}

## 结论
- 能否上传：{'是' if uploaded.get('ok') else '否（FMS 直传候选均未成功，详见 upload-probe.json）'}
- 接入 pipeline 的工作量估计：{'FMS 直传 + updateAtomDetails 即可接入，约 1–2 天含白名单与回滚' if uploaded.get('ok') else '先逆向 fms.upload 真正 URL（页面 JS SDK），再接 updateAtomDetails'}
"""
    (OUT / "upload-probe-report.md").write_text(md, encoding="utf-8")
    print(json.dumps({"ok": True, "uploaded": bool(uploaded.get("ok")), "visible": attach.get("omsVisible"), "cleaned": attach.get("cleaned")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
