# -*- coding: utf-8 -*-
"""Read Feishu/Udesk text for scheme-1 picked groups. Verdict only; strip PII."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT = ROOT / "_runs" / "20260902_scene_index_f001_ab"
PICKED = OUT / "picked_groups.json"
GROUPS = OUT / "groups.json"
UDESK = ROOT / "workspace" / "data" / "raw" / "data_udesk_log_database_增值.csv"
FEISHU = ROOT / "workspace" / "data" / "raw" / "飞书群聊_非标增值讨论_20260421-20260801.xlsx"

SKIP_GROUPS = {"g010", "g011"}  # sequential F-001+B; not this round
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"1[3-9]\d{9}")
VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)

STD_HINTS = [
    "标准增值",
    "走标准",
    "用标准产品",
    "标准产品即可",
    "原单上架",
    "换标（标准）",
    "库内换标标准",
]
NONSTD_HINTS = ["非标", "特批", "其他服务需求", "OW01V1602"]
CLARIFY_HINTS = [
    "补充",
    "还缺",
    "请提供",
    "发一下",
    "哪个",
    "确认",
    "是要",
    "还是",
    "怎么填",
    "怎么处理",
    "能否",
    "可以增值吗",
    "如何处理",
]
CLOSE_HINTS = [
    "提交",
    "可以下",
    "按这个填",
    "SOP",
    "已审核",
    "通过",
    "取消",
    "驳回",
    "先这样",
    "按非标",
    "已创建",
    "单号",
]


def scrub(text: str) -> str:
    t = re.sub(r"\s+", " ", text or "").strip()
    t = EMAIL_RE.sub("[EMAIL]", t)
    t = PHONE_RE.sub("[PHONE]", t)
    t = re.sub(r"[\u4e00-\u9fff]{2,8}(有限公司|公司|贸易|仓储|集团)", "[CO]", t)
    t = re.sub(r"(CE-|客服)[\u4e00-\u9fffA-Za-z0-9._-]{1,12}", "[AGENT]", t)
    return t


def flags(text: str) -> dict:
    t = text or ""
    return {
        "std": [k for k in STD_HINTS if k in t],
        "nonstd": [k for k in NONSTD_HINTS if k in t],
        "clarify": [k for k in CLARIFY_HINTS if k in t],
        "close": [k for k in CLOSE_HINTS if k in t],
        "has_vasc": bool(VASC_RE.search(t)),
        "has_eb": bool(EB_RE.search(t)),
        "has_wi": bool(WI_RE.search(t)),
        "chars": len(t),
    }


def load_targets() -> list[dict]:
    picked = json.loads(PICKED.read_text(encoding="utf-8"))
    groups = {g["groupId"]: g for g in json.loads(GROUPS.read_text(encoding="utf-8"))}
    rows = []
    for alias, items in picked.items():
        for g in items:
            gid = g["groupId"]
            if gid in SKIP_GROUPS:
                continue
            if g.get("chatLayer") == "none":
                continue
            full = groups.get(gid, g)
            keys = set()
            for no in g.get("orderNos") or []:
                keys.add(no.upper())
            for eb in g.get("ebs") or []:
                keys.add(str(eb).upper())
            for wi in g.get("wis") or []:
                keys.add(str(wi).upper())
            rows.append(
                {
                    "alias": alias,
                    "groupId": gid,
                    "orderNos": g.get("orderNos") or [],
                    "chatLayer": g.get("chatLayer"),
                    "statusDescs": g.get("statusDescs") or [],
                    "keys": keys,
                    "feishuRows": [
                        h.get("row")
                        for m in (full.get("members") or [])
                        for h in (m.get("feishuHits") or [])
                        if h.get("row") is not None
                    ],
                }
            )
    return rows


def read_feishu(targets: list[dict]) -> dict[str, list[dict]]:
    out = {t["groupId"]: [] for t in targets}
    if not FEISHU.exists():
        return out
    df = pd.read_excel(FEISHU, sheet_name="讨论明细", dtype=str).fillna("")
    text_cols = [c for c in df.columns if df[c].dtype == object]
    for t in targets:
        seen = set()
        for i, row in df.iterrows():
            blob = " ".join(str(row.get(c, "")) for c in text_cols)
            hit = any(k.lower() in blob.upper() for k in t["keys"])
            if not hit and int(i) not in t["feishuRows"]:
                continue
            if int(i) in seen:
                continue
            seen.add(int(i))
            detail = str(row.get("对话详情") or row.get("摘要") or "")
            product = str(row.get("增值产品/服务") or "")
            rec = {
                "row": int(i),
                "date": str(row.get("日期") or ""),
                "product": scrub(product)[:80],
                "summary": scrub(str(row.get("摘要") or ""))[:220],
                "detail": scrub(detail)[:800],
                "detailChars": len(detail),
                "flags": flags(product + " " + str(row.get("摘要") or "") + " " + detail),
            }
            out[t["groupId"]].append(rec)
    return out


def read_udesk(targets: list[dict]) -> dict[str, list[dict]]:
    out = {t["groupId"]: [] for t in targets}
    if not UDESK.exists():
        return out
    with UDESK.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        text = (r.get("messages") or "") + "\n" + (r.get("主题") or "")
        found = {x.upper() for x in VASC_RE.findall(text) + EB_RE.findall(text) + WI_RE.findall(text)}
        for t in targets:
            if not (found & t["keys"]):
                continue
            cust = agent = 0
            for line in (r.get("messages") or "").split("\n"):
                if line.startswith("-----以下是客户"):
                    cust += 1
                elif line.startswith("-----以下是人工") or line.startswith("CE-"):
                    agent += 1
            # better: count 客户 / CE- time headers
            cust = len(re.findall(r"^客户\s+20", r.get("messages") or "", flags=re.M))
            agent = len(re.findall(r"^CE-\S+\s+20", r.get("messages") or "", flags=re.M))
            out[t["groupId"]].append(
                {
                    "conversationId": r.get("对话ID") or "",
                    "date": r.get("对话开始时间") or r.get("date") or "",
                    "custTurns": cust,
                    "agentTurns": agent,
                    "preview": scrub(r.get("messages") or "")[:400],
                    "flags": flags(text),
                }
            )
    return out


def verdict(t: dict, fei: list, ude: list) -> dict:
    blob = " ".join(
        [(x.get("product") or "") + " " + (x.get("summary") or "") + " " + (x.get("detail") or "") for x in fei]
        + [(x.get("preview") or "") for x in ude]
    )
    fl = flags(blob)
    std = bool(fl["std"]) and not fl["nonstd"]
    # standard product named in 增值产品/服务 column
    prod = " ".join(x.get("product") or "" for x in fei)
    if re.search(r"标准|原单上架|换包装上架|清除标签", prod) and "非标" not in prod and "其他服务" not in prod:
        std = True
    fei_chars = sum(x.get("detailChars") or 0 for x in fei)
    ude_turns = sum((x.get("custTurns") or 0) + (x.get("agentTurns") or 0) for x in ude)
    has_bg = bool(fl["has_eb"] or fl["has_wi"] or fl["has_vasc"] or fei_chars >= 40)
    has_q = bool(fl["clarify"]) or any((x.get("custTurns") or 0) >= 2 for x in ude)
    has_c = bool(fl["close"]) or fei_chars >= 80
    # cuttable if background AND (follow-up or close) and not standard-only
    if std:
        cut = "drop_standard"
    elif has_bg and has_q and has_c and (fei_chars >= 80 or ude_turns >= 6):
        cut = "can_cut_l1_l2"
    elif has_bg and (has_q or has_c) and (fei_chars >= 40 or ude_turns >= 3):
        cut = "can_cut_l1_only"
    elif has_bg:
        cut = "hit_too_thin"
    else:
        cut = "no_usable_text"
    return {
        "groupId": t["groupId"],
        "alias": t["alias"],
        "orderNos": t["orderNos"],
        "chatLayer": t["chatLayer"],
        "statusDescs": t["statusDescs"],
        "dropReason": "standard_vas" if std else "",
        "feishuThreads": len(fei),
        "feishuDetailChars": fei_chars,
        "udeskSessions": len(ude),
        "udeskTurns": ude_turns,
        "hasBackground": has_bg,
        "hasClarify": has_q,
        "hasClose": has_c,
        "cutVerdict": cut,
        "productHint": scrub(prod)[:80],
        "feishuSummary": (fei[0].get("summary") if fei else "")[:180],
        "udeskPreview": (ude[0].get("preview") if ude else "")[:180],
    }


def main() -> None:
    targets = load_targets()
    fei = read_feishu(targets)
    ude = read_udesk(targets)
    verdicts = [verdict(t, fei[t["groupId"]], ude[t["groupId"]]) for t in targets]
    by_cut = {}
    for v in verdicts:
        by_cut.setdefault(v["cutVerdict"], []).append(v["groupId"])
    by_alias = {}
    for v in verdicts:
        by_alias.setdefault(v["alias"], {}).setdefault(v["cutVerdict"], 0)
        by_alias[v["alias"]][v["cutVerdict"]] += 1
    payload = {
        "skippedThisRound": sorted(SKIP_GROUPS),
        "skippedWhy": "F-001 then B sequential on shared EB; not single-scene 非标 form",
        "counts": by_alias,
        "byCut": {k: v for k, v in by_cut.items()},
        "verdicts": verdicts,
    }
    (OUT / "chat_cut_verdict.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [
        "# 会话正文切点结论（方案 1 抽出组）",
        "",
        "- g010 / g011：前后双场景，本轮不进准确率，未读作主集。",
        "- 读到「标准增值」形态的标 `drop_standard`，先去掉。",
        "- 正文已脱敏摘要；不含客户名/邮箱。",
        "",
        "## 汇总",
        "",
        "| 场景 | 可读组 | 可切 L1+L2 | 仅 L1 | 太薄 | 标准增值去掉 | 无正文 |",
        "|------|--------|------------|-------|------|--------------|--------|",
    ]
    for alias in ("F-001", "A", "B"):
        c = by_alias.get(alias, {})
        n = sum(c.values())
        lines.append(
            f"| {alias} | {n} | {c.get('can_cut_l1_l2', 0)} | {c.get('can_cut_l1_only', 0)} | "
            f"{c.get('hit_too_thin', 0)} | {c.get('drop_standard', 0)} | {c.get('no_usable_text', 0)} |"
        )
    lines += ["", "## 逐组", "", "| 组 | 场景 | 结论 | 飞书字数 | Udesk轮次 | 摘要 |", "|----|------|------|----------|-----------|------|"]
    for v in verdicts:
        lines.append(
            f"| {v['groupId']} | {v['alias']} | {v['cutVerdict']} | {v['feishuDetailChars']} | "
            f"{v['udeskTurns']} | {(v['feishuSummary'] or v['udeskPreview'] or '-')[:70]} |"
        )
    (OUT / "chat_cut_verdict.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"counts": by_alias, "byCut": {k: len(v) for k, v in by_cut.items()}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
