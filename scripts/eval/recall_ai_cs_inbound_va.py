# -*- coding: utf-8 -*-
"""Scheme B recall on AI CS conversations_v4 + Scheme C local OMS anchors.

Pilot only. Not gold. Not candidates.jsonl.
User-turn dual condition: inbound-exception AND open/create VA order.
Scene tags: F-001 / A / B keyword families (human still judges).
"""
from __future__ import annotations

import csv
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
CSV_PATH = ROOT / "workspace" / "AI客服对话_conversations_v4.csv"
OUT = ROOT / "_runs" / "20260903_ai_cs_inbound_va_hits"
OMS_SUMMARIES = [
    (ROOT / "_runs" / "20260901_oms_facts" / "orders_summary.json", "F-001", "20250407004"),
    (ROOT / "_runs" / "20260902_oms_facts_a" / "orders_summary.json", "A", "20250407008"),
    (ROOT / "_runs" / "20260902_oms_facts_b" / "orders_summary.json", "B", "20250522001"),
]

VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
TURN_RE = re.compile(
    r"\[(user|assistant|human_agent)\][^\n]*\n(.*?)(?=\n\[(?:user|assistant|human_agent)\]|\Z)",
    re.I | re.S,
)

# Dual-condition families: only applied to [user] text.
INBOUND_EXC = [
    (r"入库异常", "入库异常"),
    (r"异常单", "异常单"),
    (r"异常货", "异常货"),
    (r"条码异常", "条码异常"),
    (r"包裹异常", "包裹异常"),
    (r"包裹类异常", "包裹类异常"),
    (r"无法上架", "无法上架"),
    (r"不能上架", "不能上架"),
    (r"上不了架", "上不了架"),
    (r"换标", "换标"),
    (r"换标签", "换标签"),
    (r"贴标", "贴标"),
    (r"补贴.{0,8}标", "补贴标"),
    (r"更换.{0,8}条码", "更换条码"),
    (r"商品条码", "商品条码"),
    (r"包裹条码", "包裹条码"),
    (r"尺重", "尺重"),
    (r"称重", "称重"),
    (r"辨识", "辨识"),
    (r"拍照暂存", "拍照暂存"),
    (r"指定商品拍照", "指定商品拍照"),
    (r"入库单", "入库单"),
    (r"到仓", "到仓"),
    (r"WI\d{6,}", "WI"),
    (r"EB\d{10,}", "EB"),
]
VA_OPEN = [
    (r"增值单", "增值单"),
    (r"开增值", "开增值"),
    (r"下增值", "下增值"),
    (r"提交增值", "提交增值"),
    (r"创建增值", "创建增值"),
    (r"做增值", "做增值"),
    (r"走增值", "走增值"),
    (r"非标增值", "非标增值"),
    (r"非标服务", "非标服务"),
    (r"处理异常", "处理异常"),
    (r"VASC\d*", "VASC"),
]
SCENE_F001 = [
    (r"换标", "换标"),
    (r"辨识", "辨识"),
    (r"尺重", "尺重"),
    (r"称重", "称重"),
    (r"贴标", "贴标"),
    (r"商品条码", "商品条码"),
    (r"包裹条码", "包裹条码"),
    (r"对应关系", "对应关系"),
]
SCENE_A = [
    (r"包裹异常", "包裹异常"),
    (r"包裹类异常", "包裹类异常"),
    (r"换商品标签", "换商品标签"),
    (r"商品标签", "商品标签"),
    (r"补贴商品", "补贴商品"),
]
SCENE_B = [
    (r"拍照暂存", "拍照暂存"),
    (r"指定商品拍照", "指定商品拍照"),
    (r"暂存", "暂存"),
    (r"拍照", "拍照"),
]

HARD_OUT = re.compile(r"(尾程|退货|出库|头程|索赔|钱包|充值)")
INBOUND_KEEP = re.compile(r"(入库|增值|异常单|换标|上架|EB\d|WI\d|VASC)")


def compile_pairs(pairs: list[tuple[str, str]]) -> list[tuple[re.Pattern[str], str]]:
    return [(re.compile(p, re.I), name) for p, name in pairs]


INBOUND_EXC_RX = compile_pairs(INBOUND_EXC)
VA_OPEN_RX = compile_pairs(VA_OPEN)
SCENE_F001_RX = compile_pairs(SCENE_F001)
SCENE_A_RX = compile_pairs(SCENE_A)
SCENE_B_RX = compile_pairs(SCENE_B)


def hit_names(text: str, pairs: list[tuple[re.Pattern[str], str]]) -> list[str]:
    found = []
    for rx, name in pairs:
        if rx.search(text):
            found.append(name)
    return found


def extract_user_text(messages_h: str) -> str:
    chunks = []
    for role, body in TURN_RE.findall(messages_h or ""):
        if role.lower() == "user":
            chunks.append(body.strip())
    return "\n".join(chunks)


def redact(text: str) -> str:
    text = EMAIL_RE.sub("[EMAIL]", text or "")
    text = re.sub(r"1[3-9]\d{9}", "[PHONE]", text)
    return text


def extract_ids(text: str) -> dict[str, list[str]]:
    return {
        "vasc": sorted({x.upper() for x in VASC_RE.findall(text or "")}),
        "eb": sorted({x.upper() for x in EB_RE.findall(text or "")}),
        "wi": sorted({x.upper() for x in WI_RE.findall(text or "")}),
    }


def load_oms_index() -> tuple[dict[str, list[dict]], dict[str, int]]:
    by_key: dict[str, list[dict]] = defaultdict(list)
    counts = Counter()
    for path, alias, code in OMS_SUMMARIES:
        if not path.exists():
            continue
        rows = json.loads(path.read_text(encoding="utf-8"))
        counts[alias] = len(rows)
        for r in rows:
            slim = {
                "alias": alias,
                "sceneOverviewCode": code,
                "sceneOverviewName": r.get("sceneOverviewName"),
                "orderNo": r.get("orderNo"),
                "statusDesc": r.get("statusDesc"),
                "createdIso": r.get("createdIso"),
                "warehouseCode": r.get("warehouseCode"),
                "isAuditThrough": r.get("isAuditThrough"),
            }
            no = (r.get("orderNo") or "").upper()
            if no:
                by_key[no].append(slim)
            for eb in r.get("ebsOfficial") or r.get("ebsAll") or []:
                if eb:
                    by_key[str(eb).upper()].append(slim)
            for wi in r.get("wis") or []:
                if wi:
                    by_key[str(wi).upper()].append(slim)
    # dedup order rows per key
    for k, xs in list(by_key.items()):
        seen = set()
        uniq = []
        for x in xs:
            sig = (x["alias"], x["orderNo"])
            if sig in seen:
                continue
            seen.add(sig)
            uniq.append(x)
        by_key[k] = uniq
    return by_key, dict(counts)


def oms_anchors(ids: dict[str, list[str]], index: dict[str, list[dict]]) -> list[dict]:
    hits = []
    seen = set()
    for kind, values in ids.items():
        for value in values:
            for row in index.get(value, ()):
                sig = (kind, value, row["alias"], row["orderNo"])
                if sig in seen:
                    continue
                seen.add(sig)
                hits.append({"matchKind": kind, "matchValue": value, **row})
    return hits


def score_row(row: dict) -> float:
    s = 0.0
    s += 10 * len(row["inboundHits"])
    s += 10 * len(row["vaHits"])
    s += 6 * len(row["sceneTags"])
    s += 8 if row["ids"]["vasc"] else 0
    s += 6 if row["ids"]["eb"] else 0
    s += 4 if row["ids"]["wi"] else 0
    s += 8 if row["omsAnchors"] else 0
    s += min(len(row["userText"]), 400) / 50
    if (row.get("分类") or "") == "增值":
        s += 2
    if "入库" in (row.get("category") or ""):
        s += 2
    if re.fullmatch(r"(转人工|人工客服|\s)*", row["userText"] or ""):
        s -= 20
    return s


def scene_bucket(tags: list[str]) -> str:
    has = set(tags)
    n = len(has)
    if n == 0:
        return "none"
    if n > 1:
        return "multi"
    return next(iter(has))


def sample_stratified(rows: list[dict], n: int, seed: int = 20260903) -> list[dict]:
    buckets = defaultdict(list)
    for r in rows:
        buckets[scene_bucket(r["sceneTags"])].append(r)
    for k in buckets:
        buckets[k].sort(key=lambda x: (-x["score"], x["id"]))
    order = ["F-001", "A", "B", "multi", "none"]
    picked = []
    seen = set()
    # round-robin from ranked lists, prefer some OMS-anchored first
    anchored = [r for r in rows if r["omsAnchors"]]
    anchored.sort(key=lambda x: (-x["score"], x["id"]))
    for r in anchored[: min(8, n)]:
        if r["id"] not in seen:
            picked.append(r)
            seen.add(r["id"])
    i = 0
    while len(picked) < n:
        progressed = False
        for key in order:
            xs = [r for r in buckets.get(key, []) if r["id"] not in seen]
            if not xs:
                continue
            take = xs[i] if i < len(xs) else None
            if take is None:
                continue
            picked.append(take)
            seen.add(take["id"])
            progressed = True
            if len(picked) >= n:
                break
        if not progressed:
            break
        i += 1
    if len(picked) < n:
        rest = [r for r in rows if r["id"] not in seen]
        rest.sort(key=lambda x: (-x["score"], x["id"]))
        picked.extend(rest[: n - len(picked)])
    random.Random(seed).shuffle(picked)
    picked.sort(key=lambda x: (scene_bucket(x["sceneTags"]), -x["score"]))
    return picked[:n]


def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def slim_for_jsonl(row: dict) -> dict:
    return {
        "id": row["id"],
        "conversation_id": row["conversation_id"],
        "start_at": row["start_at"],
        "category": row["category"],
        "分类": row["分类"],
        "rounds": row["rounds"],
        "inboundHits": row["inboundHits"],
        "vaHits": row["vaHits"],
        "sceneTags": row["sceneTags"],
        "ids": row["ids"],
        "omsAnchors": row["omsAnchors"],
        "score": round(row["score"], 2),
        "userTextRedacted": redact(row["userText"])[:2000],
    }


def render_review(rows: list[dict]) -> str:
    lines = [
        "# 人工审 30 通（方案 B 命中抽样）",
        "",
        "- 性质：试点召回，**不是 gold**，**不是**正式 candidates。",
        "- 主池：`workspace/AI客服对话_conversations_v4.csv`（AI 客服）。",
        "- 范围：F-001 / A / B 三个入库异常增值场景都找；场景标签只是关键词提示，以你的判断为准。",
        "- 正文只保留客户 `[user]` 轮，已去邮箱/手机。",
        "- 方案 C：仅当对话里的 VASC/EB/WI 能对上本地 OMS F-001/A/B 事实时补锚。对不上的保持空。",
        "",
        "判断栏：`正例` = 入库异常后要下/开增值单；`近例` = 有入库异常但没有开单意图；`否` = 不是这类。",
        "场景栏：`F-001` / `A` / `B` / `混合` / `看不出`。",
        "",
    ]
    for i, r in enumerate(rows, 1):
        anchors = r["omsAnchors"]
        if anchors:
            anc_txt = "；".join(
                f"{a['matchKind']} {a['matchValue']} → {a['alias']} {a['orderNo']} {a.get('statusDesc') or ''}"
                for a in anchors[:6]
            )
        else:
            anc_txt = "无（对话无号，或号不在本地 F-001/A/B 事实里）"
        user = redact(r["userText"]).strip() or "（无客户原文）"
        if len(user) > 1800:
            user = user[:1800] + "\n…[截断]"
        lines.extend(
            [
                f"## {i}. id={r['id']}  conv={r['conversation_id']}",
                "",
                f"- 时间：{r['start_at']}　轮次：{r['rounds']}　分类：{r.get('分类') or '空'}　category：{r.get('category') or '空'}",
                f"- 入库异常命中：{', '.join(r['inboundHits']) or '无'}",
                f"- 开增值单命中：{', '.join(r['vaHits']) or '无'}",
                f"- 场景关键词提示：{', '.join(r['sceneTags']) or '无'}",
                f"- 对话单号：VASC={','.join(r['ids']['vasc']) or '无'}；EB={','.join(r['ids']['eb']) or '无'}；WI={','.join(r['ids']['wi']) or '无'}",
                f"- 方案 C 锚：{anc_txt}",
                f"- 请判断：`[ ] 正例  [ ] 近例  [ ] 否`　场景：`[ ] F-001  [ ] A  [ ] B  [ ] 混合  [ ] 看不出`",
                "",
                "```",
                user,
                "```",
                "",
            ]
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    oms_index, oms_counts = load_oms_index()
    hits = []
    n_total = 0
    n_hard_out = 0
    inbound_only = 0
    va_only = 0

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            n_total += 1
            mh = raw.get("messages_h") or ""
            user = extract_user_text(mh)
            if not user.strip():
                continue
            if HARD_OUT.search(user) and not INBOUND_KEEP.search(user):
                n_hard_out += 1
                continue
            inbound = hit_names(user, INBOUND_EXC_RX)
            va = hit_names(user, VA_OPEN_RX)
            if inbound and not va:
                inbound_only += 1
            if va and not inbound:
                va_only += 1
            if not (inbound and va):
                continue
            scene = []
            if hit_names(user, SCENE_F001_RX):
                scene.append("F-001")
            if hit_names(user, SCENE_A_RX):
                scene.append("A")
            if hit_names(user, SCENE_B_RX):
                scene.append("B")
            ids = extract_ids(mh)
            row = {
                "id": raw.get("id") or "",
                "conversation_id": raw.get("conversation_id") or "",
                "start_at": raw.get("start_at") or "",
                "category": raw.get("category") or "",
                "分类": raw.get("分类") or "",
                "rounds": raw.get("rounds") or "",
                "userText": user,
                "inboundHits": inbound,
                "vaHits": va,
                "sceneTags": scene,
                "ids": ids,
                "omsAnchors": oms_anchors(ids, oms_index),
            }
            row["score"] = score_row(row)
            hits.append(row)

    hits.sort(key=lambda x: (-x["score"], x["id"]))
    review30 = sample_stratified(hits, 30)
    review50 = sample_stratified(hits, 50) if len(hits) >= 50 else hits

    slim_hits = [slim_for_jsonl(r) for r in hits]
    (OUT / "hits.jsonl").write_text(
        "\n".join(json.dumps(x, ensure_ascii=False) for x in slim_hits) + ("\n" if slim_hits else ""),
        encoding="utf-8",
    )
    with (OUT / "hits.csv").open("w", encoding="utf-8-sig", newline="") as f:
        cols = [
            "id",
            "conversation_id",
            "start_at",
            "分类",
            "category",
            "rounds",
            "score",
            "inboundHits",
            "vaHits",
            "sceneTags",
            "vasc",
            "eb",
            "wi",
            "omsAlias",
            "omsOrderNo",
        ]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in hits:
            aliases = sorted({a["alias"] for a in r["omsAnchors"]})
            orders = sorted({a["orderNo"] for a in r["omsAnchors"] if a.get("orderNo")})
            w.writerow(
                {
                    "id": r["id"],
                    "conversation_id": r["conversation_id"],
                    "start_at": r["start_at"],
                    "分类": r["分类"],
                    "category": r["category"],
                    "rounds": r["rounds"],
                    "score": round(r["score"], 2),
                    "inboundHits": "|".join(r["inboundHits"]),
                    "vaHits": "|".join(r["vaHits"]),
                    "sceneTags": "|".join(r["sceneTags"]),
                    "vasc": "|".join(r["ids"]["vasc"]),
                    "eb": "|".join(r["ids"]["eb"]),
                    "wi": "|".join(r["ids"]["wi"]),
                    "omsAlias": "|".join(aliases),
                    "omsOrderNo": "|".join(orders),
                }
            )

    write_json(OUT / "review-30.json", [slim_for_jsonl(r) for r in review30])
    write_json(OUT / "sample-50.json", [slim_for_jsonl(r) for r in review50])
    (OUT / "review-30.md").write_text(render_review(review30), encoding="utf-8")

    scene_c = Counter(scene_bucket(r["sceneTags"]) for r in hits)
    review_c = Counter(scene_bucket(r["sceneTags"]) for r in review30)
    with_ids = sum(1 for r in hits if any(r["ids"].values()))
    with_oms = sum(1 for r in hits if r["omsAnchors"])
    review_oms = sum(1 for r in review30 if r["omsAnchors"])
    summary = {
        "source": str(CSV_PATH),
        "nConversations": n_total,
        "nHits": len(hits),
        "nInboundOnlyDropped": inbound_only,
        "nVaOnlyDropped": va_only,
        "nHardOutDropped": n_hard_out,
        "sceneTagCounts": dict(scene_c),
        "hitsWithAnyOrderId": with_ids,
        "hitsWithOmsAnchor": with_oms,
        "omsIndexCounts": oms_counts,
        "review30": {
            "n": len(review30),
            "sceneTagCounts": dict(review_c),
            "withOmsAnchor": review_oms,
            "ids": [r["id"] for r in review30],
        },
        "sample50n": len(review50),
        "note": "试点召回，不是 gold。方案 C 只对本地 F-001/A/B OMS 事实补锚。",
    }
    write_json(OUT / "summary.json", summary)

    md = [
        "# AI 客服会话召回试点（入库异常后开增值单）",
        "",
        "- 性质：方案 B 召回 + 方案 C 本地 OMS 补锚。**不是 gold。**",
        "- 主池：`workspace/AI客服对话_conversations_v4.csv`",
        f"- 全量会话：{n_total}；双条件命中：{len(hits)}",
        f"- 只中入库异常、未中开单（已丢）：{inbound_only}",
        f"- 只中开单、未中入库异常（已丢）：{va_only}",
        f"- 客户原话明显尾程/退货/出库且无入库锚（已丢）：{n_hard_out}",
        f"- 命中里能抽出 VASC/EB/WI：{with_ids}；能对上本地 F-001/A/B：{with_oms}",
        f"- 本地 OMS 索引规模：F-001={oms_counts.get('F-001', 0)} / A={oms_counts.get('A', 0)} / B={oms_counts.get('B', 0)}",
        "",
        "## 命中场景关键词分布（不是人工判定）",
        "",
        "| 提示桶 | 命中通数 |",
        "|---|---:|",
    ]
    for k in ("F-001", "A", "B", "multi", "none"):
        md.append(f"| {k} | {scene_c.get(k, 0)} |")
    md.extend(
        [
            "",
            "## 人工先看",
            "",
            f"- `review-30.md`：分层抽出 {len(review30)} 通（含 {review_oms} 通已有 C 锚）",
            f"- `sample-50.json`：同逻辑扩到 {len(review50)} 通，备着，先不必全看",
            "- `hits.csv` / `hits.jsonl`：完整命中清单",
            "",
            "下一步只请你标 `review-30.md` 里的正例/近例/否和场景。未点名之前不扩抽、不写 jsonl 金标。",
            "",
        ]
    )
    (OUT / "summary.md").write_text("\n".join(md), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
