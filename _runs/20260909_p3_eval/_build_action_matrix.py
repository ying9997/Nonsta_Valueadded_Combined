# coding: utf-8
"""Build inbound scene × action matrix for business review (doc only)."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
SOP_PATH = ROOT / "workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md"
OMS_MAP = ROOT / "_runs/20260902_oms_scene_code_map/scene_overview_code_map.json"
V4_PATH = ROOT / "_runs/20260909_inbound_scene_probe/scene-rank-v4.json"
CARDS_DIR = ROOT / "internal-review-copilot/knowledge/scenario-cards"
OUT = ROOT / "_runs/20260909_p3_eval/inbound-scene-action-matrix.md"
DETAILS = ROOT / "_runs/20260904_demo_cases/demo_all.details.json"

# Known core actions vocabulary (ordered for extraction preference)
CORE_ACTION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("辨识", re.compile(r"辨识|辨认")),
    ("批量辨识", re.compile(r"批量辨识")),
    ("换商品标签", re.compile(r"换商品标签|补贴.{0,12}商品标签|补贴.{0,12}SKU|更换.{0,8}商品")),
    ("换标", re.compile(r"换标|更换标签|更换条码")),
    ("补贴包裹标签", re.compile(r"补贴.{0,20}包裹标签|补贴.{0,20}包裹条码|贴包裹标签|重新贴包裹")),
    ("补贴商品条码", re.compile(r"补贴.{0,12}商品条码|补贴商品码|贴商品条码")),
    ("补贴包裹条码", re.compile(r"补贴.{0,12}包裹条码|贴包裹条码")),
    ("拍照暂存", re.compile(r"拍照暂存|拍照后.{0,8}暂存|暂存区")),
    ("拍照", re.compile(r"拍照|拍摄照片")),
    ("拍摄视频", re.compile(r"视频|拍摄")),
    ("直接上架", re.compile(r"直接上架|直接扫描上架|原单扫描上架|原单上架")),
    ("关联第三方", re.compile(r"关联第三方|第三方编码|第三方条码|第三方箱唛")),
    ("销毁", re.compile(r"销毁")),
    ("自提", re.compile(r"自提")),
    ("质检", re.compile(r"质检|检验")),
    ("清除标签", re.compile(r"清除标签|撕掉|撕除|清除")),
    ("加固", re.compile(r"加固")),
    ("调拨", re.compile(r"调拨")),
    ("拆箱", re.compile(r"拆箱|开箱|拆包")),
    ("封箱", re.compile(r"封箱")),
    ("组合", re.compile(r"组合|组包")),
    ("盘点", re.compile(r"盘点|盘亏|L007")),
    ("采集SN码", re.compile(r"SN码|采集SN|收集SN")),
    ("增加包装", re.compile(r"增加包装|换包装|winit包装|纸箱")),
    ("分单入库", re.compile(r"分开|分单|分别.*上架")),
    ("新建入库单", re.compile(r"新入库单|新建.*入库|无箱单")),
    ("覆盖预报SKU", re.compile(r"覆盖|预报SKU|实际到仓SKU")),
    ("上架", re.compile(r"(?<!不)上架")),
    ("关闭异常", re.compile(r"关闭异常|异常单.*完成")),
    ("暂存", re.compile(r"暂存")),
    ("回传", re.compile(r"回传")),
    ("数字标识", re.compile(r"数字标识")),
    ("补贴透明标签", re.compile(r"透明标签|透明计划标签")),
]

# Title verb hints → force core
TITLE_CORE_HINTS: list[tuple[str, re.Pattern[str]]] = [
    ("辨识", re.compile(r"辨识")),
    ("换标", re.compile(r"换标")),
    ("换商品标签", re.compile(r"换商品标签")),
    ("补贴包裹标签", re.compile(r"补贴包裹标签|贴包裹标签")),
    ("补贴商品条码", re.compile(r"补贴商品条码|商品条码及包裹")),
    ("补贴包裹条码", re.compile(r"包裹条码")),
    ("拍照暂存", re.compile(r"拍照暂存")),
    ("拍照", re.compile(r"拍照")),
    ("视频", re.compile(r"视频")),
    ("自提", re.compile(r"自提")),
    ("质检", re.compile(r"质检")),
    ("销毁", re.compile(r"销毁")),
    ("清除标签", re.compile(r"清除标签")),
    ("加固", re.compile(r"加固")),
    ("调拨", re.compile(r"调拨")),
    ("采集SN码", re.compile(r"SN")),
    ("盘点", re.compile(r"盘点")),
    ("组合", re.compile(r"组合")),
    ("关联第三方", re.compile(r"关联第三方")),
    ("直接上架", re.compile(r"直接上架|无包裹条码")),
    ("增加包装", re.compile(r"包装")),
    ("分单入库", re.compile(r"分开退货|分单")),
    ("新建入库单", re.compile(r"建新入库单|新入库单入库")),
    ("覆盖预报SKU", re.compile(r"覆盖预报|预报SKU")),
    ("证明函", re.compile(r"证明函|未收到货")),
    ("补贴透明标签", re.compile(r"透明标签|透明计划")),
]


def clean_title(raw: str) -> str:
    t = raw
    t = re.sub(r"\\([.\-+\(\)])", r"\1", t)
    t = re.sub(r"\*\*", "", t)
    t = re.sub(r"（Top\d+.*?）", "", t)
    t = re.sub(r"（\d+条）", "", t)
    t = re.sub(r"\(\d+条\)", "", t)
    t = re.sub(r"--+.*$", "", t)
    t = re.sub(r"\s+", " ", t).strip(" ：:-")
    # normalize leading 【入库】
    if "【入库】" not in t and t.startswith("入库】"):
        t = "【" + t
    return t.strip()


def extract_oms_name(title: str) -> str:
    """Prefer substring starting at 【入库】."""
    t = clean_title(title)
    if "【入库】" in t:
        start = t.index("【入库】")
        name = t[start:]
        # cut trailing metadata
        name = re.split(r"（|\(", name)[0].strip()
        return name
    return t


def norm_name(s: str) -> str:
    s = s or ""
    s = s.replace("【", "").replace("】", "")
    s = re.sub(r"\s+", "", s)
    s = s.replace('"', "").replace("“", "").replace("”", "").replace("'", "")
    return s.lower()


def parse_sop_sections(text: str) -> list[dict]:
    # cut between ## 二 and ## 三
    m2 = re.search(r"^##\s+[^\n]*入库[^\n]*SOP\s*$", text, re.M)
    m3 = re.search(r"^##\s+[^\n]*库内[^\n]*SOP\s*$", text, re.M)
    if not m2 or not m3:
        raise RuntimeError("cannot find SOP section boundaries")
    chunk = text[m2.end() : m3.start()]
    pat = re.compile(r"^###\s*(2\\\.\d+|2\.\d+)([^\n]*)\n", re.M)
    matches = list(pat.finditer(chunk))
    sections = []
    for i, m in enumerate(matches):
        num = m.group(1).replace("\\", "")
        title_raw = m.group(2)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(chunk)
        body = chunk[start:end]
        # code blocks
        blocks = re.findall(r"```[^\n]*\n(.*?)```", body, flags=re.S)
        # Prefer first template block only — later blocks are often case examples that pollute actions
        plain = blocks[0] if blocks else body
        # definition line
        defn = ""
        dm = re.search(r"\*\*场景定义：\*\*([^\n*]+)", body)
        if dm:
            defn = dm.group(1).strip()
        sections.append(
            {
                "sop": f"§{num}",
                "num": num,
                "title_raw": title_raw,
                "oms_name_from_sop": extract_oms_name(title_raw),
                "definition": defn,
                "body": body,
                "plain": plain,
            }
        )
    return sections


# Manual SOP§ → OMS code (权威对照；alias 表示 SOP 标题与 OMS 全名不完全一致)
MANUAL_OMS: dict[str, tuple[str, str]] = {
    "2.1": ("20250407004", "exact"),
    "2.2": ("202506120003", "exact"),
    "2.3": ("20250929", "exact"),
    "2.4": ("[Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses", "exact"),
    "2.5": ("20250407008", "exact"),
    "2.6": ("INBOUND_PICKUP_BF_SHELVE", "exact"),
    "2.7": ("20250522001", "exact"),
    "2.8": ("20250408002", "exact"),
    # 2.9 无主货异常补贴标签上架 — OMS 无同名；近邻「无主货找回暂存」语义不同 → missing
    "2.12": ("202506120001", "alias"),  # SOP 缺「商品」
    "2.15": ("2026041701", "alias"),  # SOP「补贴透明标签」vs OMS「补贴透明计划标签」
    "2.16": ("20250407003", "alias"),  # SOP「拆包/拆箱上架」vs OMS「上架前拆包装」
    "2.17": ("20250529001", "alias"),  # SOP「收集SN码」vs OMS「上架前采集条码（含SN码…）」
    "2.18": ("202506120002", "exact"),
    "2.19": ("20250407020", "exact"),
    "2.21": ("20260302", "alias"),  # SOP「清除标签」vs OMS「覆盖/清除标签」
    "2.22": ("INBOUND_DESTORY_BF_SHELVE", "exact"),
    "2.23": ("202507151726", "alias"),  # SOP「提供入库视频」vs OMS「入库少单品/少包裹视频调查」
    "2.25": ("20250509", "exact"),
    "2.26": ("202507021814", "alias"),  # 多动作含拦截；近邻「上架前拦截」
    "2.31": ("20250529001", "alias"),  # SN 处理 ↔ 采集条码含 SN
    "2.33": ("20250430", "exact"),
}


def match_oms(sop_num: str, sop_name: str, oms_rows: list[dict]) -> tuple[str, str, str]:
    """return code, matched_name, match_type"""
    by_code = {r["sceneOverviewCode"]: r for r in oms_rows}
    if sop_num in MANUAL_OMS:
        code, mtype = MANUAL_OMS[sop_num]
        r = by_code.get(code)
        if r:
            return code, r["sceneOverviewName"], mtype
        return code, sop_name, mtype

    target = norm_name(sop_name)
    for r in oms_rows:
        name = r.get("sceneOverviewName") or ""
        if norm_name(name) == target:
            return r["sceneOverviewCode"], name, "exact"

    # safer alias: longest common substring ratio
    candidates = []
    for r in oms_rows:
        name = r.get("sceneOverviewName") or ""
        if "库内" in name:
            continue
        nn = norm_name(name)
        if not nn or len(nn) < 6:
            continue
        if target in nn or nn in target:
            score = min(len(target), len(nn)) / max(len(target), len(nn))
            if score >= 0.72:
                candidates.append((score, r))
    if candidates:
        candidates.sort(key=lambda x: -x[0])
        r = candidates[0][1]
        return r["sceneOverviewCode"], r["sceneOverviewName"], "alias"
    return "", "", "missing"


def extract_actions(title: str, plain: str, definition: str) -> tuple[list[str], list[str], dict[str, str]]:
    """Return core, incidental, sources."""
    sources: dict[str, str] = {}
    title_hits: list[str] = []
    for label, pat in TITLE_CORE_HINTS:
        if pat.search(title) or pat.search(definition):
            title_hits.append(label)
            sources[label] = "场景标题/定义"

    # steps: first two numbered steps often core
    steps = re.findall(r"(?:^|\n)\s*\d+[、\.．]\s*([^\n]+)", plain)
    step_text_early = "\n".join(steps[:2])
    step_text_late = "\n".join(steps[2:]) if len(steps) > 2 else ""
    all_text = plain + "\n" + definition

    body_hits_early: list[str] = []
    body_hits_late: list[str] = []
    for label, pat in CORE_ACTION_PATTERNS:
        if pat.search(step_text_early) or (not steps and pat.search(all_text[:400])):
            body_hits_early.append(label)
            sources.setdefault(label, "SOP 前1-2步" if steps else "SOP 正文前段")
        elif pat.search(step_text_late) or pat.search(all_text):
            body_hits_late.append(label)
            sources.setdefault(label, "SOP 后续步骤")

    # merge core: title + early, unique preserve order
    core: list[str] = []
    for x in title_hits + body_hits_early:
        if x not in core:
            core.append(x)
    # refine: 上架/关闭异常 rarely core unless title says so
    incidental_force = {"上架", "关闭异常", "回传"}
    core2 = []
    incidental: list[str] = []
    for x in core:
        if x in incidental_force and x not in title_hits:
            incidental.append(x)
            sources[x] = sources.get(x, "") + "→附带"
        else:
            core2.append(x)
    # late hits → incidental
    for x in body_hits_late:
        if x not in core2 and x not in incidental:
            incidental.append(x)
    # always mention 上架/关闭异常 as incidental if present in text and not core
    for x, pat in [("上架", re.compile(r"(?<!不)上架")), ("关闭异常", re.compile(r"关闭异常"))]:
        if pat.search(all_text) and x not in core2 and x not in incidental:
            incidental.append(x)
            sources.setdefault(x, "SOP 常见收尾")

    # special: if both 换标 and 换商品标签, keep 换商品标签 as core prefer
    if "换商品标签" in core2 and "换标" in core2:
        core2 = [x for x in core2 if x != "换标"]
        if "换标" not in incidental:
            incidental.insert(0, "换标")
    return core2, incidental, sources


def stars(actions: list[str]) -> str:
    if not actions:
        return "—"
    return ", ".join(f"★{a}" for a in actions)


def main() -> None:
    sop_text = SOP_PATH.read_text(encoding="utf-8")
    sections = parse_sop_sections(sop_text)
    assert len(sections) == 33, f"expected 33 sections, got {len(sections)}"

    oms = json.loads(OMS_MAP.read_text(encoding="utf-8"))
    oms_rows = oms.get("rows") or oms

    v4 = json.loads(V4_PATH.read_text(encoding="utf-8"))
    by_code: dict[str, dict] = {}
    for r in (v4.get("allInboundScenesWithEb") or []) + (v4.get("practicalRanking") or []):
        code = r.get("sceneOverviewCode") or ""
        if code:
            by_code[code] = r

    # cards
    cards = {}
    for p in CARDS_DIR.glob("*.json"):
        c = json.loads(p.read_text(encoding="utf-8"))
        cards[c["sceneKey"]] = c

    # ACTION map summary (hardcoded from P1 current code for doc; read file)
    mt = (ROOT / "internal-review-copilot/lib/match-template.ts").read_text(encoding="utf-8")
    action_blocks = re.findall(
        r"action:\s*\"([^\"]+)\"[\s\S]*?candidateScenes:\s*\[([^\]]*)\]([\s\S]*?)(?=\n\s*\{|\n\];)",
        mt,
    )
    action_map = []
    for act, cands, rest in action_blocks:
        excl = re.search(r"excludeScenes:\s*\[([^\]]*)\]", rest)
        action_map.append(
            {
                "action": act,
                "candidates": re.findall(r"\"([^\"]+)\"", cands),
                "excludes": re.findall(r"\"([^\"]+)\"", excl.group(1)) if excl else [],
            }
        )

    rows = []
    action_to_scenes: dict[str, list[dict]] = defaultdict(list)
    for sec in sections:
        code, matched_name, match_type = match_oms(sec["num"], sec["oms_name_from_sop"], oms_rows)
        display_name = matched_name if matched_name else sec["oms_name_from_sop"]
        # ensure 【入库】 prefix on display
        if display_name and not display_name.startswith("【"):
            if "入库" in display_name and not display_name.startswith("【入库】"):
                display_name = "【入库】" + display_name.replace("入库】", "").lstrip("【")
        stats = by_code.get(code) or {}
        eb = int(stats.get("ebDistinctCount") or 0)
        hq = int(stats.get("hqCandidateCount") or 0)
        core, incidental, sources = extract_actions(
            sec["oms_name_from_sop"] + " " + sec["title_raw"],
            sec["plain"],
            sec["definition"],
        )
        # Hand tweaks where first SOP block under-represents known scenes
        if sec["num"] == "2.12":
            if "直接上架" not in core:
                core.append("直接上架")
                sources["直接上架"] = "SOP §2.12 第二模板「直接原单扫描上架」"
            if "补贴包裹条码" in core:
                core = [x for x in core if x != "补贴包裹条码"]
                if "补贴包裹条码" not in incidental:
                    incidental.insert(0, "补贴包裹条码(如需要)")
        if sec["num"] == "2.15" and "补贴透明标签" not in core:
            core = ["补贴透明标签"] + core
            sources["补贴透明标签"] = "场景标题"
        if sec["num"] == "2.3" and "拆箱" in core:
            core = [x for x in core if x != "拆箱"]
            if "拆箱" not in incidental:
                incidental.append("拆箱")
        row = {
            **sec,
            "omsSceneCode": code or "missing",
            "match_type": match_type,
            "oms_full_name": display_name,
            "eb": eb,
            "hq": hq,
            "core": core,
            "incidental": incidental,
            "sources": sources,
        }
        rows.append(row)
        for a in core:
            action_to_scenes[a].append({"role": "核心", **row})
        for a in incidental:
            action_to_scenes[a].append({"role": "附带", **row})

    # 326061 intent
    intent_326061 = ""
    if DETAILS.exists():
        details = json.loads(DETAILS.read_text(encoding="utf-8"))
        d = next((x for x in details if x.get("orderNo") == "VASC000000326061"), None)
        if d:
            attrs = (d.get("atoms") or [{}])[0].get("vaAtomAttrs") or []
            parts = []
            for a in attrs:
                k = a.get("attributeKeyOriginal") or a.get("attributeKey")
                if k in ("BEOR", "VAS_ATTR_REL_RD"):
                    v = a.get("attributeValueOriginal") or a.get("attributeValue") or ""
                    if v:
                        parts.append(f"[{k}]\n{v}")
            intent_326061 = "\n\n".join(parts)

    # shared actions of interest
    focus = ["上架", "辨识", "补贴包裹标签", "拍照", "换商品标签", "换标", "关闭异常", "销毁", "拆箱", "清除标签", "关联第三方", "直接上架"]

    lines: list[str] = []
    lines.append("# 入库场景×动作对照矩阵（供业务方审阅）")
    lines.append("")
    lines.append("## 使用说明")
    lines.append("")
    lines.append("本文档列出了 SOP 知识库中所有 **33** 个入库场景（§2.1～§2.33）的操作动作。")
    lines.append("- 🔴 标记的动作：被 **2 个以上**场景共享，是容易判错的点")
    lines.append("- 「核心」列打 ★ 的：是该场景的区分性动作（最能代表这个场景的操作）")
    lines.append("- 「单量」列：该场景在 2026-04-21～`<2026-09-04` 窗口的 **EB 去重数 / HQ 候选数**（来自 scene-rank-v4；无数据标 0）")
    lines.append("- OMS 匹配：`exact` 全名一致；`alias` 部分一致；`missing` 码表未找到")
    lines.append("")
    lines.append("请逐行确认：")
    lines.append("1. 每个场景的核心动作提取对不对？")
    lines.append("2. 共享动作的区分方法对不对？")
    lines.append("3. 有没有遗漏的动作？")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 一、矩阵总表")
    lines.append("")
    lines.append("| # | SOP | OMS 场景全名 | omsSceneCode | 匹配 | EB 数 | HQ | 核心动作 | 附带动作 |")
    lines.append("|--:|-----|------------|--------------|------|------:|---:|---------|---------|")
    for i, r in enumerate(rows, 1):
        core_s = stars(r["core"])
        inc_s = ", ".join(r["incidental"]) if r["incidental"] else "—"
        name = r["oms_full_name"].replace("|", "\\|")
        lines.append(
            f"| {i} | {r['sop']} | {name} | `{r['omsSceneCode']}` | {r['match_type']} | {r['eb']} | {r['hq']} | {core_s} | {inc_s} |"
        )
    lines.append("")
    lines.append("### 动作来源说明（抽样）")
    lines.append("")
    lines.append("每个动作旁在提取时已区分：场景标题/定义、SOP 前 1–2 步、SOP 后续步骤。完整逐字来源过长，业务方若对某行有疑义可点名章节，我们再贴 SOP 原文步骤。")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 二、共享动作汇总（🔴 容易混淆的点）")
    lines.append("")
    lines.append("按共享场景数从高到低（仅列关注动作；完整矩阵见上表）。")
    lines.append("")

    def scene_label(r: dict) -> str:
        return f"{r['sop']} {r['oms_full_name']}"

    # 上架
    shelf = action_to_scenes.get("上架", [])
    lines.append(f"### 🔴 \"上架\" — 被 {len({id(x['sop']) for x in shelf}) or len(set(x['sop'] for x in shelf))} 个场景共享")
    n_shelf = len({x["sop"] for x in shelf})
    lines[-1] = f"### 🔴 \"上架\" — 被 {n_shelf} 个场景共享"
    lines.append("")
    lines.append("几乎所有入库场景收尾都有上架，**不能**用来区分场景。")
    lines.append("")
    lines.append("**业务方请确认：** 是否同意「上架」一律视为附带动作、不参与场景区分？")
    lines.append("**业务方回复：** ___")
    lines.append("")

    # 辨识
    id_rows = action_to_scenes.get("辨识", []) + action_to_scenes.get("批量辨识", [])
    # dedupe by sop
    seen = set()
    id_uniq = []
    for x in id_rows:
        if x["sop"] in seen:
            continue
        seen.add(x["sop"])
        id_uniq.append(x)
    lines.append(f"### 🔴 \"辨识\" — 被 {len(id_uniq)} 个场景共享")
    lines.append("")
    lines.append("| 场景 | 角色 | 辨识之后做什么（据 SOP/标题推断） |")
    lines.append("|------|------|--------------------------------|")
    for x in id_uniq:
        after = ", ".join(x["core"] + x["incidental"])
        after = after.replace("辨识, ", "").replace("批量辨识, ", "")
        lines.append(f"| {scene_label(x)} | {x['role']} | {after or '—'} |")
    lines.append("")
    lines.append("**业务方请确认：** 区分这些场景时，是看「辨识之后做什么」，还是看「异常类型」，还是两者结合？")
    lines.append("**业务方回复：** ___")
    lines.append("")

    # 补贴包裹标签
    pkg = action_to_scenes.get("补贴包裹标签", []) + action_to_scenes.get("补贴包裹条码", [])
    seen = set()
    pkg_uniq = []
    for x in pkg:
        if x["sop"] in seen:
            continue
        seen.add(x["sop"])
        pkg_uniq.append(x)
    lines.append(f"### 🔴 \"补贴包裹标签\" — 被 {len(pkg_uniq)} 个场景共享")
    lines.append("")
    lines.append("| 场景 | 角色 | 与其他动作的组合 |")
    lines.append("|------|------|----------------|")
    for x in pkg_uniq:
        combo = ", ".join(x["core"])
        lines.append(f"| {scene_label(x)} | {x['role']} | {combo} |")
    lines.append("")
    lines.append("**业务方请确认：** 当客户写了「补贴包裹标签」，审核员怎么判断是 §2.33 还是 §2.1 的附带操作？依据是什么？")
    lines.append("**业务方回复：** ___")
    lines.append("")

    # 拍照
    photo = action_to_scenes.get("拍照", []) + action_to_scenes.get("拍照暂存", []) + action_to_scenes.get("拍摄视频", [])
    seen = set()
    photo_uniq = []
    for x in photo:
        if x["sop"] in seen:
            continue
        seen.add(x["sop"])
        photo_uniq.append(x)
    lines.append(f"### 🔴 \"拍照\" — 被 {len(photo_uniq)} 个场景共享")
    lines.append("")
    lines.append("| 场景 | 角色 | 说明 |")
    lines.append("|------|------|------|")
    for x in photo_uniq:
        role = "核心" if ("拍照暂存" in x["core"] or "拍照" in x["core"] or "拍摄视频" in x["core"]) else x["role"]
        note = "★拍照暂存" if "拍照暂存" in x["core"] else (", ".join(a for a in x["core"] if "拍" in a or "视频" in a) or x["role"])
        lines.append(f"| {scene_label(x)} | {role} | {note} |")
    lines.append("")
    lines.append("**业务方请确认：** 客户只写了「拍照」没写「暂存」时，审核员怎么判断？追问还是直接归 §2.7？")
    lines.append("**业务方回复：** ___")
    lines.append("")

    # 换标
    relabel = action_to_scenes.get("换商品标签", []) + action_to_scenes.get("换标", [])
    seen = set()
    rel_uniq = []
    for x in relabel:
        if x["sop"] in seen:
            continue
        seen.add(x["sop"])
        rel_uniq.append(x)
    lines.append(f"### 🔴 \"换商品标签\" / \"换标\" — 被 {len(rel_uniq)} 个场景共享")
    lines.append("")
    lines.append("| 场景 | 角色 | 换的是什么 / 前置条件 |")
    lines.append("|------|------|---------------------|")
    for x in rel_uniq:
        hint = ""
        if "2.1" in x["sop"]:
            hint = "商品标签（尺重/绿标/混SKU 等辨识后）"
        elif "2.5" in x["sop"]:
            hint = "商品标签；包裹条码正常+商品条码异常"
        elif "2.9" in x["sop"]:
            hint = "标题含换商品标签/相关异常"
        else:
            hint = ", ".join(x["core"][:4])
        lines.append(f"| {scene_label(x)} | {x['role']} | {hint} |")
    lines.append("")
    lines.append("**业务方请确认：** 「换标」是否默认=换**商品**标签？什么情况下是换/补贴**包裹**标签？")
    lines.append("**业务方回复：** ___")
    lines.append("")

    # other shared
    lines.append("### 其他共享动作")
    lines.append("")
    lines.append("| 动作 | 共享场景数 | 涉及 SOP |")
    lines.append("|------|----------:|---------|")
    for act in ["关闭异常", "销毁", "拆箱", "清除标签", "关联第三方", "直接上架", "自提", "质检"]:
        xs = action_to_scenes.get(act, [])
        sops = sorted({x["sop"] for x in xs}, key=lambda s: float(s[1:]))
        if len(sops) >= 2:
            lines.append(f"| {act} | {len(sops)} | {', '.join(sops)} |")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 三、有场景卡的 5 个场景 vs ACTION_SCENE_MAP 对照")
    lines.append("")
    card_by_code = {c.get("omsSceneCode"): c for c in cards.values()}
    key_scenes = [
        ("20250407004", "inbound_label_identify"),
        ("20250430", "inbound_package_barcode_batch_relabel"),
        ("20250522001", "inbound_photo_hold"),
        ("202506120001", "inbound_third_party_merchandise_barcode"),
        ("20250407008", "inbound_package_exception_relabel_shelving"),
    ]
    lines.append("| OMS 场景全名 | 核心动作(矩阵) | ACTION_SCENE_MAP 覆盖? | 场景卡 positiveSignals 覆盖? | 差异 |")
    lines.append("|------------|---------------|---------------------|--------------------------|------|")

    def action_covered_in_map(action: str, scene_key: str) -> bool:
        for am in action_map:
            if scene_key in am["candidates"]:
                # fuzzy name match
                if action in am["action"] or am["action"] in action:
                    return True
                if action == "换标" and am["action"] == "换商品标签":
                    return True
                if action == "关联第三方" and "第三方" in am["action"]:
                    return True
                if action == "拍照" and am["action"] in ("拍照", "拍照暂存"):
                    return True
        return False

    for code, sk in key_scenes:
        row = next((r for r in rows if r["omsSceneCode"] == code), None)
        card = cards.get(sk) or {}
        name = (row or {}).get("oms_full_name") or card.get("sceneName") or sk
        core = (row or {}).get("core") or []
        map_bits = []
        card_bits = []
        diffs = []
        pos = (card.get("positiveSignals") or {})
        strong = pos.get("strong") or []
        weak = pos.get("weak") or []
        blob = " ".join(strong + weak)
        for a in core:
            mc = "✓" if action_covered_in_map(a, sk) else "✗"
            map_bits.append(f"{mc}{a}")
            cc = "✓" if any(a in s or s in a for s in strong + weak) or a in blob else "✗"
            # special
            if a == "辨识" and "辨识" in blob:
                cc = "✓"
            if a == "换标" and ("换标" in blob or "换商品标签" in blob):
                cc = "✓"
            card_bits.append(f"{cc}{a}")
            if mc == "✗":
                diffs.append(f"⚠ SOP/矩阵有「{a}」但 ACTION 未覆盖本场景候选")
            if cc == "✗":
                diffs.append(f"⚠ SOP/矩阵有「{a}」但场景卡 signals 未覆盖")
        # reverse: ACTION candidates for this scene
        for am in action_map:
            if sk in am["candidates"]:
                if not any(am["action"] in a or a in am["action"] for a in core):
                    # check if incidental
                    if am["action"] not in ((row or {}).get("incidental") or []):
                        diffs.append(f"⚠ 代码 ACTION「{am['action']}」候选含本场景，但矩阵未标为核心")
        lines.append(
            f"| {name} | {', '.join(core) or '—'} | {', '.join(map_bits) or '—'} | {', '.join(card_bits) or '—'} | {'; '.join(diffs) or '—'} |"
        )
    lines.append("")
    lines.append("### 当前 ACTION_SCENE_MAP 一览（代码）")
    lines.append("")
    lines.append("| action | candidate sceneKeys | exclude sceneKeys |")
    lines.append("|--------|---------------------|-------------------|")
    for am in action_map:
        lines.append(
            f"| {am['action']} | {', '.join(am['candidates']) or '—'} | {', '.join(am['excludes']) or '—'} |"
        )
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 四、326061 问题专栏")
    lines.append("")
    lines.append("| 项 | 内容 |")
    lines.append("|----|------|")
    lines.append("| VASC | `VASC000000326061` |")
    lines.append("| OMS 原子场景名（系统里选的） | 【入库】尺重/标签辨识后换标上架（`20250407004`） |")
    lines.append("| P1 后 pipeline 曾判 | `inbound_package_barcode_batch_relabel`（批量异常补贴包裹标签） |")
    lines.append("| 评测金标意向（用户） | **保持** `inbound_label_identify`（尺重/标签辨识后换标上架） |")
    lines.append("")
    lines.append("### 需求原文（BEOR + VAS_ATTR_REL_RD）")
    lines.append("")
    lines.append("```text")
    lines.append(intent_326061.strip() or "（未从 demo_all.details.json 读到，请人工补贴）")
    lines.append("```")
    lines.append("")
    lines.append("### 请业务方判断")
    lines.append("")
    lines.append("1. 这条单审核员会归到哪个场景？（OMS 全名）")
    lines.append("2. 为什么正文里同时出现了「包裹条码异常(需客户处理)」和「补贴…包裹标签」？这是否仍应归「尺重/标签辨识后换标上架」？")
    lines.append("3. 这种混合表述在实际审核中常见吗？审核员靠什么判断（异常类型 / 是否换商品标 / 是否批量包裹标异常 / 其他）？")
    lines.append("")
    lines.append("**业务方回复：** ___")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 五、业务方确认清单")
    lines.append("")
    lines.append("在全矩阵审阅完后，请业务方回答：")
    lines.append("")
    lines.append("1. 矩阵总表中每个场景的**核心动作**提取对吗？有没有标错的？（可只点名有问题的 § 编号）")
    lines.append("2. 共享动作的**区分方法**（第二部分每个 🔴 下面的问题）——请逐条填「业务方回复」")
    lines.append("3. 有没有 SOP 里没写但审核员实际会用的**隐性判断依据**？（如异常单类型、客户历史提单模式、是否已有商品-标签对应表等）")
    lines.append("4. **326061** 这条单归哪个场景？")
    lines.append("5. 确认后是否授权进入正式评测（P3 任务 1–4：清洗 + golden + 客观评测 + LLM Judge）？")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 附录：生成说明")
    lines.append("")
    lines.append(f"- SOP：`{SOP_PATH}`")
    lines.append(f"- OMS 码表：`{OMS_MAP}`")
    lines.append(f"- 单量：`{V4_PATH}`（ebDistinctCount / hqCandidateCount）")
    missing = [r for r in rows if r["match_type"] == "missing"]
    alias = [r for r in rows if r["match_type"] == "alias"]
    lines.append(
        f"- OMS `missing` 共 {len(missing)} 个：多为 SOP 有、码表无同名条目（"
        + ", ".join(r["sop"] for r in missing)
        + "）。业务方可补 OMS 码或确认「仅 SOP 场景」。"
    )
    lines.append(f"- OMS `alias` 共 {len(alias)} 个（SOP 标题与 OMS 全名不完全一致，已人工/规则对齐）。")
    lines.append("- 动作提取为规则启发式（标题动词 + 首个 SOP 模板前两步=核心，后续=附带）；**请业务方校正**，不以本表为最终权威。")
    lines.append("- 本文件替代原零散「任务 0 六个问题」确认方式；**不改代码**。")
    lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT} rows={len(rows)}")
    print("missing oms", [(r["sop"], r["oms_name_from_sop"]) for r in missing])
    print("alias count", len(alias))


if __name__ == "__main__":
    main()
