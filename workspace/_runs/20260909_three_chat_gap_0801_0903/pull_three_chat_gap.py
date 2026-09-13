# coding: utf-8
"""Pull three VAS-related Feishu chats for 2026-08-01 .. 2026-09-03 gap via raw IM API.

Avoids lark-cli +chat-messages-list (requires reactions scope).
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
import threading
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path

THREAD_WORKERS = 6
_API_LOCK = threading.Lock()

RUN_DIR = Path(__file__).resolve().parent
TZ = timezone(timedelta(hours=8))
START_DT = datetime(2026, 8, 1, 0, 0, 0, tzinfo=TZ)
END_DT = datetime(2026, 9, 4, 0, 0, 0, tzinfo=TZ)  # exclusive -> include 09-03
START_TS = str(int(START_DT.timestamp()))
END_TS = str(int(END_DT.timestamp()))

CHATS = [
    {
        "chat_id": "oc_6566160ccb2def51937469fe8144efdb",
        "chat_name": "【增值】异常沟通",
        "slug": "chat1_yichanggoutong",
    },
    {
        "chat_id": "oc_bb1e8a1fe64e00de0b6a10cafd5a7bc7",
        "chat_name": "销售&客服&产品 沟通群",
        "slug": "chat2_xiaoshou_kefu_chanpin",
    },
    {
        "chat_id": "oc_5b8848d27b7b3fa4a10eab865c4f9ffc",
        "chat_name": "发货仓入库&增值运营（救火）- IB&VAS",
        "slug": "chat3_jiuhuo_ibvas",
    },
]

LARK_CLI_CMD = Path.home() / "AppData" / "Roaming" / "npm" / "lark-cli.cmd"

COLUMNS = [
    "序号",
    "群名称",
    "群ID",
    "日期",
    "开始时间",
    "结束时间",
    "讨论ID",
    "发起人",
    "增值产品",
    "增值服务",
    "客户/对象",
    "仓库",
    "关联单号",
    "摘要",
    "对话详情",
    "艾特人员",
    "命中艾特人员",
    "参与人",
    "原始消息ID",
    "飞书链接",
    "关键词",
]

WHITELIST = ["许晓妍", "耿文文", "李颖", "张淼", "陈泽森", "郭泽纯", "未知/系统"]

KEYWORDS = [
    "非标",
    "增值",
    "VASC",
    "异常单",
    "异常",
    "EB",
    "入库",
    "出库",
    "库内",
    "贴标",
    "换标",
    "补贴",
    "上架",
    "拍照",
    "销毁",
    "包裹条码",
    "商品条码",
    "SOP",
    "仓库",
    "救火",
    "库内增值",
]

ORDER_PATTERNS = [
    r"VASC\d{12}",
    r"EB\d{10,}",
    r"WI\d{6,}",
    r"WO\d{6,}",
    r"WR\d{6,}",
    r"ASN\d{6,}",
    r"FBA[A-Z0-9]{6,}",
    r"M\d{12,}",
    r"B\d{12,}",
]

NAME_CACHE: dict[str, str] = {}


def lark_api(method: str, path: str, params: dict | None = None) -> dict:
    cmd = [
        str(LARK_CLI_CMD),
        "api",
        method,
        path,
        "--as",
        "user",
        "--json",
    ]
    if params is not None:
        cmd.extend(["--params", json.dumps(params, ensure_ascii=False)])
    with _API_LOCK:
        proc = subprocess.run(cmd, cwd=RUN_DIR, capture_output=True, text=True, encoding="utf-8")
        time.sleep(0.05)
    if proc.returncode != 0:
        raise RuntimeError(f"lark-cli api failed: {proc.stderr or proc.stdout}")
    payload = json.loads(proc.stdout)
    if not payload.get("ok", True) and payload.get("code") not in (0, None):
        err = payload.get("error") or payload
        raise RuntimeError(json.dumps(err, ensure_ascii=False)[:2000])
    if isinstance(payload.get("data"), dict) and payload.get("code") not in (0, None, True):
        # feishu error sometimes nested
        if payload.get("code") not in (0, None):
            raise RuntimeError(json.dumps(payload, ensure_ascii=False)[:2000])
    return payload


def list_all_messages(
    container_id: str,
    container_id_type: str,
    start_time: str | None = None,
    end_time: str | None = None,
    quiet: bool = False,
) -> list[dict]:
    items: list[dict] = []
    page_token = None
    page = 0
    while True:
        params: dict[str, str] = {
            "container_id_type": container_id_type,
            "container_id": container_id,
            "page_size": "50",
            "sort_type": "ByCreateTimeAsc",
        }
        if start_time is not None:
            params["start_time"] = start_time
        if end_time is not None:
            params["end_time"] = end_time
        if page_token:
            params["page_token"] = page_token
        payload = lark_api("GET", "/open-apis/im/v1/messages", params)
        data = payload.get("data") or {}
        batch = data.get("items") or []
        items.extend(batch)
        page += 1
        if not quiet:
            print(
                f"  [{container_id_type}:{container_id[:12]}...] page={page} batch={len(batch)} total={len(items)} has_more={data.get('has_more')}",
                flush=True,
            )
        if not data.get("has_more"):
            break
        page_token = data.get("page_token")
        if not page_token:
            raise RuntimeError("has_more=true but no page_token")
    return items


def parse_create_dt(msg: dict) -> datetime | None:
    raw = msg.get("create_time")
    if raw is None or raw == "":
        return None
    try:
        ms = int(str(raw))
        if ms > 10_000_000_000:  # ms
            return datetime.fromtimestamp(ms / 1000, tz=TZ)
        return datetime.fromtimestamp(ms, tz=TZ)
    except Exception:
        return None


def ordered_unique(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def remember_names_from_mentions(msg: dict) -> None:
    for m in msg.get("mentions") or []:
        oid = m.get("id")
        name = m.get("name")
        if oid and name:
            NAME_CACHE[oid] = name


def resolve_sender_name(msg: dict) -> str:
    sender = msg.get("sender") or {}
    sid = sender.get("id") or ""
    if sender.get("sender_type") == "app":
        return "未知/系统"
    if sid and sid in NAME_CACHE:
        return NAME_CACHE[sid]
    # try lightweight contact get once
    if sid and sid.startswith("ou_"):
        try:
            payload = lark_api(
                "GET",
                f"/open-apis/contact/v3/users/{sid}",
                {"user_id_type": "open_id"},
            )
            user = ((payload.get("data") or {}).get("user") or {})
            name = user.get("name") or user.get("en_name")
            if name:
                NAME_CACHE[sid] = name
                return name
        except Exception:
            pass
        NAME_CACHE[sid] = sid  # avoid retry storm
        return sid
    return "未知/系统"


def content_to_text(msg: dict) -> str:
    msg_type = msg.get("msg_type") or ""
    raw = ((msg.get("body") or {}).get("content")) or ""
    if not raw:
        return ""
    try:
        obj = json.loads(raw)
    except Exception:
        return str(raw)

    if msg_type == "text":
        return str(obj.get("text") or "")

    if msg_type == "post":
        parts = []
        title = obj.get("title") or ""
        if title:
            parts.append(str(title))
        content = obj.get("content")
        # zh_cn style or direct content
        if isinstance(content, dict):
            content = content.get("content") or content.get("zh_cn") or content
            if isinstance(content, dict):
                title2 = content.get("title")
                if title2:
                    parts.append(str(title2))
                content = content.get("content")
        if isinstance(content, list):
            for para in content:
                line = []
                if not isinstance(para, list):
                    continue
                for node in para:
                    if not isinstance(node, dict):
                        continue
                    tag = node.get("tag")
                    if tag == "text":
                        line.append(str(node.get("text") or ""))
                    elif tag == "a":
                        line.append(str(node.get("text") or node.get("href") or ""))
                    elif tag == "at":
                        line.append("@" + str(node.get("user_name") or node.get("user_id") or ""))
                    elif tag == "img":
                        line.append(f"[Image:{node.get('image_key') or ''}]")
                    elif tag in ("media", "emotion"):
                        line.append(f"[{tag}]")
                    else:
                        t = node.get("text")
                        if t:
                            line.append(str(t))
                if line:
                    parts.append("".join(line))
        return "\n".join(parts).strip()

    if msg_type in ("interactive", "share_chat", "share_user"):
        # best-effort flatten
        return json.dumps(obj, ensure_ascii=False)[:2000]

    if msg_type == "image":
        return f"[Image:{obj.get('image_key') or ''}]"
    if msg_type == "file":
        return f"[File:{obj.get('file_name') or obj.get('file_key') or ''}]"
    if msg_type == "audio":
        return "[Audio]"
    if msg_type == "media":
        return "[Media]"
    if msg_type == "sticker":
        return "[Sticker]"
    return json.dumps(obj, ensure_ascii=False)[:1000]


def clean_content(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'<card\s+title="([^"]+)"\s*>', r"【\1】\n", text)
    text = text.replace("</card>", "")
    text = re.sub(r"\((ou_[^)]+)\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def message_mention_names(msg: dict) -> list[str]:
    names = []
    for item in msg.get("mentions") or []:
        name = item.get("name")
        if name:
            names.append(name)
    return names


def extract_field(text, names):
    for name in names:
        m = re.search(rf"{re.escape(name)}\s*[:：]\s*([^\n\r]+)", text)
        if m:
            return m.group(1).strip()
    return ""


def extract_orders(text):
    out = []
    for pattern in ORDER_PATTERNS:
        out.extend(re.findall(pattern, text, flags=re.IGNORECASE))
    return ordered_unique([x.upper() for x in out])


def infer_value_service(text, fire_type):
    service_terms = []
    for term in ["贴标", "换标", "拍照", "销毁", "上架", "拦截", "改标", "辨识", "清点", "更换包装", "包装", "退差额"]:
        if term in text:
            service_terms.append(term)
    if fire_type and fire_type not in service_terms:
        service_terms.insert(0, fire_type)
    return "；".join(ordered_unique(service_terms)) or "未明确"


def summarize(text, max_len=260):
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len] + ("..." if len(text) > max_len else "")


def build_row(idx: int, host_msg: dict, thread_msgs: list[dict], chat_name: str, chat_id: str) -> dict:
    messages = [m for m in thread_msgs if not m.get("deleted")]
    messages.sort(key=lambda m: parse_create_dt(m) or datetime.min.replace(tzinfo=TZ))

    lines = []
    mentions = []
    participants = []
    times = []
    raw_parts = []
    for msg in messages:
        remember_names_from_mentions(msg)
        name = resolve_sender_name(msg)
        content = clean_content(content_to_text(msg))
        if not content:
            continue
        participants.append(name)
        mentions.extend(message_mention_names(msg))
        dt = parse_create_dt(msg)
        if dt:
            times.append(dt)
            stamp = dt.strftime("%Y-%m-%d %H:%M")
        else:
            stamp = str(msg.get("create_time") or "")
        lines.append(f"[{stamp}] {name}: {content}")
        raw_parts.append(content)

    text = "\n".join(raw_parts)
    full_detail = "\n".join(lines)
    matched_keywords = [kw for kw in KEYWORDS if kw.lower() in text.lower()]
    all_mentions = ordered_unique(mentions)
    hit_mentions = [
        name
        for name in WHITELIST
        if name in all_mentions or (name == "未知/系统" and "未知/系统" in participants)
    ]
    start_dt = min(times) if times else parse_create_dt(host_msg)
    end_dt = max(times) if times else start_dt
    fire_type = extract_field(text, ["救火类型", "增值服务", "服务类型"])
    customer = extract_field(text, ["客户", "客户/对象", "客户名称"])
    warehouse = extract_field(text, ["仓库"])
    orders = extract_orders(text)
    product = (
        "非标增值"
        if ("非标" in text or "VASC" in text.upper())
        else ("标准库内增值/入库异常" if "增值" in text else "入库/仓库异常")
    )
    return {
        "序号": idx,
        "群名称": chat_name,
        "群ID": chat_id,
        "日期": start_dt.strftime("%Y-%m-%d") if start_dt else "",
        "开始时间": start_dt.strftime("%Y-%m-%d %H:%M") if start_dt else "",
        "结束时间": end_dt.strftime("%Y-%m-%d %H:%M") if end_dt else "",
        "讨论ID": host_msg.get("thread_id") or host_msg.get("message_id") or "",
        "发起人": resolve_sender_name(host_msg),
        "增值产品": product,
        "增值服务": infer_value_service(text, fire_type),
        "客户/对象": customer,
        "仓库": warehouse,
        "关联单号": "；".join(orders),
        "摘要": summarize(text),
        "对话详情": full_detail,
        "艾特人员": "；".join(all_mentions),
        "命中艾特人员": "；".join(hit_mentions),
        "参与人": "；".join(ordered_unique(participants)),
        "原始消息ID": host_msg.get("message_id") or "",
        "飞书链接": "",
        "关键词": "；".join(matched_keywords),
    }


def row_is_candidate(row):
    text = "\n".join(str(row.get(col) or "") for col in ["摘要", "对话详情", "关联单号", "关键词"])
    has_keyword = bool(row.get("关键词"))
    has_order = bool(re.search(r"\b(VASC|EB|WI|WO|WR|ASN)\d+", text, flags=re.IGNORECASE))
    return has_keyword or has_order


def row_hits_whitelist(row):
    return bool(str(row.get("命中艾特人员") or "").strip())


def write_csv(path, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def process_chat(chat: dict) -> dict:
    raw_path = RUN_DIR / f"{chat['slug']}_raw_chat_messages.jsonl"
    thread_cache_path = RUN_DIR / f"{chat['slug']}_raw_threads.jsonl"

    if raw_path.exists() and raw_path.stat().st_size > 0:
        top_msgs = []
        with raw_path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    top_msgs.append(json.loads(line))
        fetched = False
    else:
        top_msgs = list_all_messages(chat["chat_id"], "chat", START_TS, END_TS)
        with raw_path.open("w", encoding="utf-8", newline="\n") as f:
            for m in top_msgs:
                f.write(json.dumps(m, ensure_ascii=False) + "\n")
        fetched = True

    # preload mention names
    for m in top_msgs:
        remember_names_from_mentions(m)

    # load existing thread cache
    thread_map: dict[str, list[dict]] = {}
    if thread_cache_path.exists() and thread_cache_path.stat().st_size > 0:
        with thread_cache_path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                thread_map[obj["thread_id"]] = obj.get("items") or []

    # host messages: unique by thread_id (prefer first occurrence = earliest due to asc)
    hosts: list[dict] = []
    seen_threads: set[str] = set()
    for m in top_msgs:
        if m.get("deleted"):
            continue
        tid = m.get("thread_id") or ""
        if tid:
            if tid in seen_threads:
                continue
            seen_threads.add(tid)
            hosts.append(m)
        else:
            hosts.append(m)

    # Pre-filter on host message only (same candidate rule), THEN expand threads.
    # This avoids fetching thousands of irrelevant threads (esp. 销售客服群).
    host_by_tid: dict[str, dict] = {}
    candidate_hosts: list[dict] = []
    for host in hosts:
        tid = host.get("thread_id") or ""
        if tid:
            host_by_tid[tid] = host
        preview = build_row(0, host, [host], chat["chat_name"], chat["chat_id"])
        if row_is_candidate(preview):
            candidate_hosts.append(host)

    # Prefer already-cached threads; only fetch missing among candidates
    missing = []
    for host in candidate_hosts:
        tid = host.get("thread_id")
        if not tid:
            continue
        if tid not in thread_map:
            missing.append(tid)

    print(
        f"  hosts={len(hosts)} candidate_hosts={len(candidate_hosts)} "
        f"threads_cached={len(thread_map)} missing_to_fetch={len(missing)}",
        flush=True,
    )

    def fetch_one(tid: str) -> tuple[str, list[dict]]:
        try:
            items = list_all_messages(tid, "thread", quiet=True)
            return tid, items
        except Exception as exc:
            print(f"  WARN thread fetch failed {tid}: {exc}", flush=True)
            return tid, [host_by_tid[tid]]

    done = 0
    if missing:
        with thread_cache_path.open("a", encoding="utf-8", newline="\n") as tf:
            with ThreadPoolExecutor(max_workers=THREAD_WORKERS) as pool:
                futures = [pool.submit(fetch_one, tid) for tid in missing]
                for fut in as_completed(futures):
                    tid, items = fut.result()
                    thread_map[tid] = items
                    tf.write(json.dumps({"thread_id": tid, "items": items}, ensure_ascii=False) + "\n")
                    tf.flush()
                    done += 1
                    if done % 50 == 0 or done == len(missing):
                        print(f"  threads fetched {done}/{len(missing)}", flush=True)

    # Build rows for ALL hosts: use full thread if available/candidate, else host-only
    rows_all = []
    for i, host in enumerate(hosts, 1):
        tid = host.get("thread_id")
        if tid and tid in thread_map and thread_map[tid]:
            thread_msgs = thread_map[tid]
        else:
            thread_msgs = [host]
        for tm in thread_msgs:
            remember_names_from_mentions(tm)
        rows_all.append(build_row(i, host, thread_msgs, chat["chat_name"], chat["chat_id"]))

    rows_candidates = [row for row in rows_all if row_is_candidate(row)]
    rows_filtered = [row for row in rows_candidates if row_hits_whitelist(row)]

    all_json = RUN_DIR / f"{chat['slug']}_discussions_all.json"
    filtered_json = RUN_DIR / f"{chat['slug']}_discussions_filtered.json"
    all_json.write_text(json.dumps(rows_all, ensure_ascii=False, indent=2), encoding="utf-8")
    filtered_json.write_text(json.dumps(rows_filtered, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(RUN_DIR / f"{chat['slug']}_discussions_all.csv", rows_all)
    write_csv(RUN_DIR / f"{chat['slug']}_discussions_filtered.csv", rows_filtered)

    starts = [r.get("开始时间") for r in rows_all if r.get("开始时间")]
    ends = [r.get("结束时间") for r in rows_all if r.get("结束时间")]
    return {
        "chat_id": chat["chat_id"],
        "chat_name": chat["chat_name"],
        "slug": chat["slug"],
        "fetched_from_lark": fetched,
        "top_level_messages": len(top_msgs),
        "discussion_hosts": len(hosts),
        "candidate_hosts_prefilter": len(candidate_hosts),
        "threads_fetched_this_run": done,
        "discussion_rows_all": len(rows_all),
        "discussion_rows_candidate": len(rows_candidates),
        "discussion_rows_filtered_whitelist": len(rows_filtered),
        "start_min": min(starts) if starts else None,
        "start_max": max(starts) if starts else None,
        "end_max": max(ends) if ends else None,
    }


def main():
    per_chat = []
    combined_all = []
    combined_filtered = []
    for chat in CHATS:
        print(f"=== {chat['chat_name']} ===", flush=True)
        summary = process_chat(chat)
        per_chat.append(summary)
        all_rows = json.loads((RUN_DIR / f"{chat['slug']}_discussions_all.json").read_text(encoding="utf-8"))
        filtered_rows = json.loads(
            (RUN_DIR / f"{chat['slug']}_discussions_filtered.json").read_text(encoding="utf-8")
        )
        combined_all.extend(all_rows)
        combined_filtered.extend(filtered_rows)

    for i, row in enumerate(combined_all, 1):
        row["序号"] = i
    for i, row in enumerate(combined_filtered, 1):
        row["序号"] = i

    combined_all_path = RUN_DIR / "three_chat_gap_discussions_all.json"
    combined_filtered_path = RUN_DIR / "three_chat_gap_discussions_filtered.json"
    combined_all_path.write_text(json.dumps(combined_all, ensure_ascii=False, indent=2), encoding="utf-8")
    combined_filtered_path.write_text(
        json.dumps(combined_filtered, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_csv(RUN_DIR / "three_chat_gap_discussions_all.csv", combined_all)
    write_csv(RUN_DIR / "three_chat_gap_discussions_filtered.csv", combined_filtered)

    summary = {
        "window": {
            "start": START_DT.isoformat(),
            "end": END_DT.isoformat(),
            "timezone": "Asia/Shanghai",
            "note": "end exclusive; covers through 2026-09-03",
        },
        "auth_user": "金萤",
        "api": "raw GET /open-apis/im/v1/messages (chat + thread)",
        "whitelist": WHITELIST,
        "per_chat": per_chat,
        "combined_all_rows": len(combined_all),
        "combined_filtered_rows": len(combined_filtered),
        "combined_filtered_group_distribution": Counter(r.get("群名称") for r in combined_filtered).most_common(),
        "outputs": {
            "combined_all_json": str(combined_all_path),
            "combined_filtered_json": str(combined_filtered_path),
            "combined_all_csv": str(RUN_DIR / "three_chat_gap_discussions_all.csv"),
            "combined_filtered_csv": str(RUN_DIR / "three_chat_gap_discussions_filtered.csv"),
            "summary": str(RUN_DIR / "gap_pull_summary.json"),
        },
    }
    (RUN_DIR / "gap_pull_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
