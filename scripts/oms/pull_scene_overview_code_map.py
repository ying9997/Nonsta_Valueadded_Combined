# -*- coding: utf-8 -*-
"""Pull live OMS 增值审核场景概述 码-名映射（不下单明细、不拉场景池）。"""
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
OUT_DIR = ROOT / "_runs" / "20260902_oms_scene_code_map"
KNOWLEDGE = (
    ROOT
    / "internal-review-copilot"
    / "knowledge"
    / "scenario-evidence"
    / "oms-scene-overview-code-map.md"
)
SEED_VASC = "VASC000000344421"  # F-001 已完成单，只用来打开详情页下拉
DETAIL = f"https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/{SEED_VASC}/isView/Y"
BASE_CONFIG = "https://cnomstom.winit.com.cn/BaseConfig/index"
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
    # de-dup keep first
    seen = {}
    for r in rows:
        seen.setdefault(r["sceneOverviewCode"], r)
    return list(seen.values())


def try_baseconfig_apis(session) -> dict:
    tried = []
    hits = []
    set_oms_referer(session, BASE_CONFIG)
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


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = _new_session()
    refresh_oms_csrf(session)

    detail_html = session.get(DETAIL, timeout=60, allow_redirects=True).text
    if "cniam.winit.com.cn" in session.get(LIST_PAGE, timeout=60).url:
        raise RuntimeError("Cookie 失效")
    sel = re.search(
        r'<select[^>]*name=["\']sceneOverviewCode["\'][^>]*>.*?</select>',
        detail_html,
        flags=re.I | re.S,
    )
    (OUT_DIR / "vasorder_detail_select_snippet.html").write_text(
        sel.group(0) if sel else "<!-- select not found -->",
        encoding="utf-8",
    )
    from_detail = parse_select_options(detail_html)
    api_probe = try_baseconfig_apis(session)

    rows = []
    for item in from_detail:
        code = item["sceneOverviewCode"]
        name = item["sceneOverviewName"]
        rows.append(
            {
                "sceneOverviewCode": code,
                "sceneOverviewName": name,
                "group": classify(code, name),
                "source": "VasOrder.detail select[name=sceneOverviewCode]",
            }
        )
    rows.sort(key=lambda r: (r["group"], r["sceneOverviewCode"], r["sceneOverviewName"]))

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "live OMS VasOrder 详情页场景概述下拉（当前审核员可选全集）",
        "seedOrderNo": SEED_VASC,
        "count": len(rows),
        "knownAliases": KNOWN,
        "baseConfigApiProbe": {"tried": api_probe["tried"], "hitCount": len(api_probe["hits"])},
        "rows": rows,
    }
    write_json(OUT_DIR / "scene_overview_code_map.json", payload)
    write_json(OUT_DIR / "baseconfig_api_probe.json", api_probe)

    csv_lines = ["sceneOverviewCode,sceneOverviewName,group"]
    for r in rows:
        csv_lines.append(
            f"{r['sceneOverviewCode']},{r['sceneOverviewName'].replace(',', '，')},{r['group']}"
        )
    (OUT_DIR / "scene_overview_code_map.csv").write_text("\n".join(csv_lines), encoding="utf-8")

    md = [
        "# OMS 增值审核场景概述 码–名映射",
        "",
        f"- 生成：{payload['generatedAt']}",
        "- 来源：live `VasOrder` 详情页 `select[name=sceneOverviewCode]`（审核员下拉全集）",
        f"- 条数：{len(rows)}",
        "- 原始：`_runs/20260902_oms_scene_code_map/scene_overview_code_map.json`",
        "- 拉业务池仍按码滤；按名滤会被忽略",
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
        "| 分组 | 码 | 名 |",
        "|------|----|----|",
    ]
    for r in rows:
        md.append(f"| {r['group']} | `{r['sceneOverviewCode']}` | {r['sceneOverviewName']} |")
    md += [
        "",
        "## 注意",
        "",
        "- 这是配置下拉，不是订单池。扩展新场景时先查本表再 `pageQuery where[sceneOverviewCode]`。",
        "- 码只圈场景，不能单独当 Copilot 命中，也不能单独进 gold。",
        "- BaseConfig 列表接口若当天未打通，以本下拉为准；探测记录见同目录 `baseconfig_api_probe.json`。",
    ]
    KNOWLEDGE.write_text("\n".join(md), encoding="utf-8")
    (OUT_DIR / "README.md").write_text("\n".join(md[:12]), encoding="utf-8")
    print(json.dumps({"count": len(rows), "out": str(OUT_DIR), "knowledge": str(KNOWLEDGE)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
