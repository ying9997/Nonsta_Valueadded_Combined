# coding: utf-8
import csv
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

import pandas as pd

# Excel 禁止的控制字符（保留 \t \n \r）
_ILLEGAL_XML_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def sanitize_excel(s: str) -> str:
    return _ILLEGAL_XML_RE.sub("", s)

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260909_three_chat_full_20260421_20260903")
OUT.mkdir(parents=True, exist_ok=True)

OLD = Path(
    r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_three_chat_supplement\three_chat_discussions_combined_filtered.json"
)
NEW = Path(
    r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260909_three_chat_gap_0801_0903\three_chat_gap_discussions_filtered.json"
)

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


def key(r):
    return (
        str(r.get("讨论ID") or "").strip(),
        str(r.get("原始消息ID") or "").strip(),
        str(r.get("群ID") or "").strip(),
        str(r.get("开始时间") or "").strip(),
    )


def parse_dt(s):
    s = str(s or "").strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    return datetime.min


def main():
    old = json.loads(OLD.read_text(encoding="utf-8"))
    new = json.loads(NEW.read_text(encoding="utf-8"))

    seen = set()
    merged = []
    dup = 0
    for src, rows in (("old_0421_0801", old), ("gap_0801_0903", new)):
        for r in rows:
            k = key(r)
            if k in seen and any(k):
                dup += 1
                continue
            seen.add(k)
            item = {c: (r.get(c, "") if r.get(c, "") is not None else "") for c in COLUMNS}
            item["_source"] = src
            merged.append(item)

    merged.sort(
        key=lambda r: (
            parse_dt(r.get("开始时间")),
            str(r.get("群ID") or ""),
            str(r.get("讨论ID") or ""),
        )
    )
    for i, r in enumerate(merged, 1):
        r["序号"] = i

    rows_out = [{c: r.get(c, "") for c in COLUMNS} for r in merged]

    (OUT / "three_chat_full_discussions_filtered.json").write_text(
        json.dumps(rows_out, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    with (OUT / "three_chat_full_discussions_filtered.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows_out)

    by_group = Counter(r.get("群名称") for r in rows_out).most_common()
    starts = [parse_dt(r.get("开始时间")) for r in rows_out if r.get("开始时间")]
    starts = [d for d in starts if d != datetime.min]

    summary_rows = [
        ["字段", "值"],
        ["窗口", "2026-04-21 00:00 ~ 2026-09-03"],
        ["旧段来源", str(OLD)],
        ["缺口来源", str(NEW)],
        ["旧段条数", len(old)],
        ["缺口条数", len(new)],
        ["去重后完整条数", len(rows_out)],
        ["边界重复剔除", dup],
        ["过滤口径", "关键词/单号候选 + 白名单任一艾特命中（与既有一致）"],
        ["开始时间最小", min(starts).strftime("%Y-%m-%d %H:%M") if starts else ""],
        ["开始时间最大", max(starts).strftime("%Y-%m-%d %H:%M") if starts else ""],
        ["", ""],
        ["群名称", "条数"],
    ]
    for g, n in by_group:
        summary_rows.append([g, n])

    xlsx_path = OUT / "三群_20260421-20260903_群聊讨论_任一艾特命中_不下载图片.xlsx"
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        pd.DataFrame(summary_rows[1:], columns=summary_rows[0]).to_excel(
            writer, sheet_name="汇总", index=False
        )
        df_xlsx = pd.DataFrame(rows_out, columns=COLUMNS).copy()
        for col in df_xlsx.columns:
            df_xlsx[col] = (
                df_xlsx[col]
                .astype(str)
                .map(sanitize_excel)
                .map(lambda x: x[:32000] + ("...(truncated)" if len(x) > 32000 else ""))
            )
        df_xlsx.to_excel(writer, sheet_name="讨论明细", index=False)

    meta = {
        "window": "2026-04-21 ~ 2026-09-03",
        "old_path": str(OLD),
        "gap_path": str(NEW),
        "old_rows": len(old),
        "gap_rows": len(new),
        "merged_rows": len(rows_out),
        "duplicates_skipped": dup,
        "group_distribution": by_group,
        "start_min": min(starts).strftime("%Y-%m-%d %H:%M") if starts else None,
        "start_max": max(starts).strftime("%Y-%m-%d %H:%M") if starts else None,
        "outputs": {
            "json": str(OUT / "three_chat_full_discussions_filtered.json"),
            "csv": str(OUT / "three_chat_full_discussions_filtered.csv"),
            "xlsx": str(xlsx_path),
            "summary": str(OUT / "merge_summary.json"),
        },
    }
    (OUT / "merge_summary.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
