import csv
import json
import re
import subprocess
import sys
import time
import shutil
from collections import Counter
from datetime import datetime
from pathlib import Path


RUN_DIR = Path(__file__).resolve().parent
CHAT_ID = "oc_5b8848d27b7b3fa4a10eab865c4f9ffc"
CHAT_NAME = "发货仓入库&增值运营（救火）- IB&VAS"
START = "2026-04-21T00:00:00+08:00"
END = "2026-08-01T00:00:00+08:00"

RAW_JSONL = RUN_DIR / "third_chat_raw_pages.jsonl"
ROWS_ALL_JSON = RUN_DIR / "third_chat_discussions_all.json"
ROWS_FILTERED_JSON = RUN_DIR / "third_chat_discussions_filtered.json"
ROWS_ALL_CSV = RUN_DIR / "third_chat_discussions_all.csv"
ROWS_FILTERED_CSV = RUN_DIR / "third_chat_discussions_filtered.csv"
SUMMARY_JSON = RUN_DIR / "third_chat_extraction_summary.json"
LARK_CLI_PS1 = Path.home() / "AppData" / "Roaming" / "npm" / "lark-cli.ps1"

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


def run_lark_cli(page_token=None):
    if LARK_CLI_PS1.exists():
        cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(LARK_CLI_PS1)]
    else:
        cli = shutil.which("lark-cli") or shutil.which("lark-cli.cmd")
        if not cli:
            raise RuntimeError("Cannot locate lark-cli executable")
        cmd = [cli]

    cmd.extend([
        "im",
        "+chat-messages-list",
        "--as",
        "user",
        "--chat-id",
        CHAT_ID,
        "--start",
        START,
        "--end",
        END,
        "--sort",
        "asc",
        "--page-size",
        "50",
        "--no-reactions",
        "--json",
    ])
    if page_token:
        cmd.extend(["--page-token", page_token])

    proc = subprocess.run(cmd, cwd=RUN_DIR, capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        raise RuntimeError(f"lark-cli failed: {proc.stderr or proc.stdout}")
    return json.loads(proc.stdout)


def load_or_fetch_pages():
    if RAW_JSONL.exists() and RAW_JSONL.stat().st_size > 0:
        pages = []
        with RAW_JSONL.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    pages.append(json.loads(line))
        return pages, False

    pages = []
    page_token = None
    with RAW_JSONL.open("w", encoding="utf-8", newline="\n") as f:
        while True:
            payload = run_lark_cli(page_token)
            if not payload.get("ok") and payload.get("code") not in (0, None):
                raise RuntimeError(json.dumps(payload, ensure_ascii=False)[:2000])
            data = payload.get("data", {})
            pages.append(payload)
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
            f.flush()
            print(
                f"page={len(pages)} messages={len(data.get('messages', []))} "
                f"has_more={data.get('has_more')}",
                flush=True,
            )
            if not data.get("has_more"):
                break
            page_token = data.get("page_token")
            if not page_token:
                raise RuntimeError("has_more=true but no page_token returned")
            time.sleep(0.25)
    return pages, True


def parse_dt(text):
    if not text:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    return None


def clean_content(text):
    if not text:
        return ""
    text = re.sub(r"<card\s+title=\"([^\"]+)\"\s*>", r"【\1】\n", text)
    text = text.replace("</card>", "")
    text = re.sub(r"\((ou_[^)]+)\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sender_name(msg):
    sender = msg.get("sender") or {}
    if sender.get("name"):
        return sender["name"]
    if sender.get("sender_type") == "app":
        return "未知/系统"
    return sender.get("id") or "未知/系统"


def message_mentions(msg):
    names = []
    for item in msg.get("mentions") or []:
        name = item.get("name")
        if name:
            names.append(name)
    return names


def ordered_unique(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


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


def build_row(idx, message):
    messages = [message] + list(message.get("thread_replies") or [])
    messages = [m for m in messages if not m.get("deleted")]
    messages.sort(key=lambda m: parse_dt(m.get("create_time")) or datetime.min)

    lines = []
    mentions = []
    participants = []
    times = []
    raw_parts = []
    for msg in messages:
        name = sender_name(msg)
        content = clean_content(msg.get("content") or "")
        if not content:
            continue
        participants.append(name)
        mentions.extend(message_mentions(msg))
        dt = parse_dt(msg.get("create_time"))
        if dt:
            times.append(dt)
            stamp = dt.strftime("%Y-%m-%d %H:%M")
        else:
            stamp = msg.get("create_time") or ""
        lines.append(f"[{stamp}] {name}: {content}")
        raw_parts.append(content)

    text = "\n".join(raw_parts)
    full_detail = "\n".join(lines)
    matched_keywords = [kw for kw in KEYWORDS if kw.lower() in text.lower()]
    all_mentions = ordered_unique(mentions)
    hit_mentions = [name for name in WHITELIST if name in all_mentions or (name == "未知/系统" and "未知/系统" in participants)]
    start_dt = min(times) if times else parse_dt(message.get("create_time"))
    end_dt = max(times) if times else start_dt

    fire_type = extract_field(text, ["救火类型", "增值服务", "服务类型"])
    customer = extract_field(text, ["客户", "客户/对象", "客户名称"])
    warehouse = extract_field(text, ["仓库"])
    orders = extract_orders(text)

    product = "非标增值" if ("非标" in text or "VASC" in text.upper()) else ("标准库内增值/入库异常" if "增值" in text else "入库/仓库异常")

    return {
        "序号": idx,
        "群名称": CHAT_NAME,
        "群ID": CHAT_ID,
        "日期": start_dt.strftime("%Y-%m-%d") if start_dt else "",
        "开始时间": start_dt.strftime("%Y-%m-%d %H:%M") if start_dt else "",
        "结束时间": end_dt.strftime("%Y-%m-%d %H:%M") if end_dt else "",
        "讨论ID": message.get("thread_id") or message.get("message_id") or "",
        "发起人": sender_name(message),
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
        "原始消息ID": message.get("message_id") or "",
        "飞书链接": message.get("message_app_link") or "",
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


def main():
    pages, fetched = load_or_fetch_pages()
    messages = []
    for page in pages:
        messages.extend((page.get("data") or {}).get("messages") or [])

    rows_all = [build_row(i + 1, msg) for i, msg in enumerate(messages)]
    rows_candidates = [row for row in rows_all if row_is_candidate(row)]
    rows_filtered = [row for row in rows_candidates if row_hits_whitelist(row)]

    ROWS_ALL_JSON.write_text(json.dumps(rows_all, ensure_ascii=False, indent=2), encoding="utf-8")
    ROWS_FILTERED_JSON.write_text(json.dumps(rows_filtered, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(ROWS_ALL_CSV, rows_all)
    write_csv(ROWS_FILTERED_CSV, rows_filtered)

    keyword_counter = Counter()
    for row in rows_candidates:
        for kw in str(row.get("关键词") or "").split("；"):
            if kw:
                keyword_counter[kw] += 1

    summary = {
        "chat_id": CHAT_ID,
        "chat_name": CHAT_NAME,
        "start": START,
        "end": END,
        "fetched_from_lark": fetched,
        "raw_pages": len(pages),
        "top_level_messages": len(messages),
        "discussion_rows_all": len(rows_all),
        "discussion_rows_candidate_keyword_or_order": len(rows_candidates),
        "discussion_rows_filtered_whitelist": len(rows_filtered),
        "whitelist": WHITELIST,
        "top_keywords": keyword_counter.most_common(30),
        "image_markers_in_all_rows": sum(1 for row in rows_all if "[Image:" in str(row.get("对话详情") or "")),
        "outputs": {
            "raw_jsonl": str(RAW_JSONL),
            "all_json": str(ROWS_ALL_JSON),
            "filtered_json": str(ROWS_FILTERED_JSON),
            "all_csv": str(ROWS_ALL_CSV),
            "filtered_csv": str(ROWS_FILTERED_CSV),
        },
    }
    SUMMARY_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
