# -*- coding: utf-8 -*-
"""Pull live OMS 增值审核场景概述 码-名映射。

详情页下拉可能随订单类型变化，因此分别打开入库 / 库内 / 出库各一张详情，合并去重。
不下单明细、不拉场景池。
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    LIST_PAGE,
    _new_session,
    _rows,
    oms_post,
    refresh_oms_csrf,
    set_oms_referer,
)

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
OUT_DIR = ROOT / "_runs" / "20260911_oms_scene_code_map"
KNOWLEDGE = (
    ROOT
    / "internal-review-copilot"
    / "knowledge"
    / "scenario-evidence"
    / "oms-scene-overview-code-map.md"
)
SEEDS = [
    {"orderNo": "VASC000000344421", "kind": "inbound", "note": "入库订单 F-001"},
    {"orderNo": "VASC000000184008", "kind": "instock", "note": "库内订单 INHOUSE"},
    {"orderNo": "VASC000000348573", "kind": "outbound", "note": "出库订单 OUTBOUND"},
]
KNOWN = {
    "20250407004": {"alias": "F-001", "name_cn": "【入库】尺重/标签辨识后换标上架"},
    "20250407008": {"alias": "A", "name_cn": "【入库】包裹类异常换商品标签上架"},
    "20250522001": {"alias": "B", "name_cn": "【入库】指定商品拍照暂存"},
}


def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_select_options(html: str) -> list[dict]:
    block = ""
    m = re.search(
        r'<select[^>]*name=["\']sceneOverviewCode["\'][^>]*>(.*?)</select>',
        html,
        flags=re.I | re.S,
    )
    if m:
        block = m.group(1)
    else:
        block = html
    rows = []
    for value, label in re.findall(
        r'<option\s+value="([^"]*)"[^>]*>\s*([^<]*?)\s*</option>',
        block,
        flags=re.I | re.S,
    ):
        value = (value or "").strip()
        label = re.sub(r"\s+", " ", (label or "").strip())
        if not value or label in ("请选择",):
            continue
        rows.append({"sceneOverviewCode": value, "sceneOverviewName": label})
    seen = {}
    for r in rows:
        seen.setdefault(r["sceneOverviewCode"], r)
    return list(seen.values())


def try_baseconfig_apis(session) -> dict:
    tried = []
    hits = []
    set_oms_referer(session, "https://cnomstom.winit.com.cn/BaseConfig/index")
    candidates = [
        ("oms.BaseConfigService_queryPage", {"where[configType]": "VAS_SCENE_OVERVIEW"}),
        ("oms.BaseConfigService_queryPage", {"where[type]": "增值审核场景概述编码"}),
        ("oms.BaseConfigService_pageQuery", {"where[configType]": "VA_AUDIT_SCENE_OVERVIEW"}),
        ("oms.SysConfigService_querySysConfigMap", {"where[configType]": "SCENE_OVERVIEW"}),
        ("pms.SysConfigService_querySysConfigMap", {"where[configType]": "SCENE_OVERVIEW"}),
        ("oms.VaOrderService_querySceneOverview", {}),
    ]
    for api, extra in candidates:
        params = {"api": api, "draw": "1", "start": "0", "length": "500"}
        params.update(extra)
        try:
            data = oms_post(session, params)
            rows = _rows(data.get("info"))
            tried.append({"api": api, "ok": True, "n": len(rows)})
            if rows:
                hits.append({"api": api, "params": extra, "rows": rows[:3], "count": len(rows)})
        except Exception as exc:
            tried.append({"api": api, "ok": False, "error": str(exc)[:240]})
    return {"tried": tried, "hits": hits}


def classify(code: str, name: str) -> str:
    if code in KNOWN:
        return KNOWN[code]["alias"]
    if name.startswith("【入库】"):
        return "inbound"
    if name.startswith("【库内】"):
        return "instock"
    if name.startswith("【出库】"):
        return "outbound"
    return "other"


def detail_url(order_no: str) -> str:
    return f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{order_no}/isView/Y"


def pull_one(session, seed: dict) -> dict:
    url = detail_url(seed["orderNo"])
    html = session.get(url, timeout=60, allow_redirects=True).text
    sel = re.search(
        r'<select[^>]*name=["\']sceneOverviewCode["\'][^>]*>.*?</select>',
        html,
        flags=re.I | re.S,
    )
    snippet_name = f"vasorder_detail_select_{seed['kind']}_{seed['orderNo']}.html"
    (OUT_DIR / snippet_name).write_text(
        sel.group(0) if sel else "<!-- select not found -->",
        encoding="utf-8",
    )
    rows = parse_select_options(html)
    login_redirect = "cniam.winit.com.cn" in html or "请登录" in html[:800]
    return {
        "orderNo": seed["orderNo"],
        "kind": seed["kind"],
        "note": seed["note"],
        "count": len(rows),
        "loginRedirect": login_redirect,
        "rows": rows,
        "snippet": snippet_name,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = _new_session()
    refresh_oms_csrf(session)
    if "cniam.winit.com.cn" in session.get(LIST_PAGE, timeout=60).url:
        raise RuntimeError("Cookie 失效，请先跑 AI_EXPERT/TOM/共享认证/auto_login.py")

    per_seed = []
    merged = {}
    for seed in SEEDS:
        one = pull_one(session, seed)
        summary = {k: v for k, v in one.items() if k != "rows"}
        per_seed.append(summary)
        for item in one["rows"]:
            code = item["sceneOverviewCode"]
            prev = merged.get(code)
            if not prev:
                merged[code] = {
                    **item,
                    "group": classify(code, item["sceneOverviewName"]),
                    "seenOnSeeds": [seed["kind"]],
                    "source": "VasOrder.detail select[name=sceneOverviewCode]",
                }
            else:
                if seed["kind"] not in prev["seenOnSeeds"]:
                    prev["seenOnSeeds"].append(seed["kind"])
        print(
            json.dumps(
                {"seed": seed["orderNo"], "kind": seed["kind"], "count": one["count"], "loginRedirect": one["loginRedirect"]},
                ensure_ascii=False,
            ),
            flush=True,
        )

    api_probe = try_baseconfig_apis(session)
    rows = sorted(merged.values(), key=lambda r: (r["group"], r["sceneOverviewCode"], r["sceneOverviewName"]))

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "live OMS VasOrder 详情页场景概述下拉，入库+库内+出库三张详情合并",
        "seeds": SEEDS,
        "perSeed": per_seed,
        "count": len(rows),
        "knownAliases": KNOWN,
        "baseConfigApiProbe": {"tried": api_probe["tried"], "hitCount": len(api_probe["hits"])},
        "rows": rows,
    }
    write_json(OUT_DIR / "scene_overview_code_map.json", payload)
    write_json(OUT_DIR / "baseconfig_api_probe.json", api_probe)
    write_json(OUT_DIR / "per_seed_counts.json", per_seed)

    csv_lines = ["sceneOverviewCode,sceneOverviewName,group,seenOnSeeds"]
    for r in rows:
        csv_lines.append(
            f"{r['sceneOverviewCode']},{r['sceneOverviewName'].replace(',', '，')},{r['group']},{'|'.join(r['seenOnSeeds'])}"
        )
    (OUT_DIR / "scene_overview_code_map.csv").write_text("\n".join(csv_lines), encoding="utf-8")

    counts = {}
    for r in rows:
        counts[r["group"]] = counts.get(r["group"], 0) + 1
    seed_only = []
    for seed in SEEDS:
        kind = seed["kind"]
        only = [r for r in rows if r["seenOnSeeds"] == [kind]]
        seed_only.append({"kind": kind, "exclusiveCount": len(only)})

    md = [
        "# OMS 增值审核场景概述 码–名映射",
        "",
        f"- 生成：{payload['generatedAt']}",
        "- 来源：live `VasOrder` 详情页 `select[name=sceneOverviewCode]`，**入库 + 库内 + 出库** 三张详情合并去重",
        f"- 条数：{len(rows)}（inbound={counts.get('inbound', 0) + counts.get('F-001', 0) + counts.get('A', 0) + counts.get('B', 0)} / instock={counts.get('instock', 0)} / outbound={counts.get('outbound', 0)} / other={counts.get('other', 0)}）",
        "- 原始：`_runs/20260911_oms_scene_code_map/scene_overview_code_map.json`",
        "- 拉业务池仍按码滤；按名滤会被忽略",
        "",
        "## 各类型详情页下拉条数",
        "",
        "| 类型 | 种子单 | 下拉条数 | 仅该类型独有 |",
        "|------|--------|----------|--------------|",
    ]
    for seed, only in zip(SEEDS, seed_only):
        n = next((x["count"] for x in per_seed if x["orderNo"] == seed["orderNo"]), 0)
        md.append(f"| {seed['kind']} | `{seed['orderNo']}` | {n} | {only['exclusiveCount']} |")
    md += [
        "",
        "## 本轮已核（F-001 / A / B）",
        "",
        "| 别名 | 码 | 名 |",
        "|------|----|----|",
    ]
    for code, meta in KNOWN.items():
        md.append(f"| {meta['alias']} | `{code}` | {meta['name_cn']} |")
    md += [
        "",
        "## 全表",
        "",
        "| 分组 | 码 | 名 | 出现在 |",
        "|------|----|----|--------|",
    ]
    for r in rows:
        md.append(
            f"| {r['group']} | `{r['sceneOverviewCode']}` | {r['sceneOverviewName']} | {'/'.join(r['seenOnSeeds'])} |"
        )
    md += [
        "",
        "## 注意",
        "",
        "- 这是配置下拉，不是订单池。扩展新场景时先查本表再 `pageQuery where[sceneOverviewCode]`。",
        "- 码只圈场景，不能单独当 Copilot 命中，也不能单独进 gold。",
        "- 三张详情若下拉条数不同，以合并全集为准；独有行见 `seenOnSeeds`。",
        "- BaseConfig 列表接口若当天未打通，以本下拉为准；探测记录见同目录 `baseconfig_api_probe.json`。",
    ]
    KNOWLEDGE.write_text("\n".join(md), encoding="utf-8")
    (OUT_DIR / "README.md").write_text("\n".join(md[:20]), encoding="utf-8")
    print(
        json.dumps(
            {"count": len(rows), "perSeed": per_seed, "out": str(OUT_DIR), "knowledge": str(KNOWLEDGE)},
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
