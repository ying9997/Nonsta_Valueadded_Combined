# -*- coding: utf-8 -*-
"""OMS 场景概述 vs 场景卡对照。"""
import json
import os
import re
import glob

ROOT = r"D:\DA\Nonsta_Valueadded_Combined"
OMS_PATH = os.path.join(ROOT, r"_runs\20260911_oms_scene_code_map\scene_overview_code_map.json")
CARDS_DIR = os.path.join(ROOT, r"internal-review-copilot\knowledge\scenario-cards")
OUT_DIR = os.path.join(ROOT, r"internal-review-copilot\_runs\20260917_oms_scene_gap")

PREFIX = re.compile(r"^[【\[][^】\]]+[】\]]\s*")


def canon(name: str) -> str:
    n = PREFIX.sub("", name or "")
    n = n.replace("（", "(").replace("）", ")").replace(" ", "").replace("-", "").replace("/", "")
    return n.lower()


def load_oms():
    data = json.load(open(OMS_PATH, encoding="utf-8"))
    return data["rows"]


def load_cards():
    cards = []
    for path in glob.glob(os.path.join(CARDS_DIR, "*.json")):
        d = json.load(open(path, encoding="utf-8"))
        cards.append(
            {
                "file": os.path.basename(path),
                "sceneKey": d.get("sceneKey"),
                "sceneName": d.get("sceneName"),
                "status": d.get("status"),
                "category": d.get("category"),
                "oms": str(d.get("omsSceneCode") or "").strip(),
                "core": canon(d.get("sceneName") or ""),
            }
        )
    return cards


def hits_for(o, cards):
    found = []
    ocore = canon(o["sceneOverviewName"])
    ocode = o["sceneOverviewCode"]
    for c in cards:
        how = None
        if ocode and c["oms"] and ocode == c["oms"]:
            how = "code"
        elif ocore and c["core"] and min(len(ocore), len(c["core"])) >= 4:
            if ocore == c["core"] or ocore in c["core"] or c["core"] in ocore:
                how = "name"
        if how:
            found.append((c, how))
    return found


def main():
    oms = load_oms()
    cards = load_cards()
    lines = []
    w = lines.append
    w("# OMS 场景概述 vs 场景卡对照")
    w("")
    w(f"- OMS 下拉：{len(oms)} 条（2026-09-11 入库+库内+出库详情页合并）")
    w(f"- 场景卡：{len(cards)} 张（supported={sum(1 for c in cards if c['status']=='supported')}，retired={sum(1 for c in cards if c['status']=='retired_dedicated_atom')}）")
    w("")

    w("## 1. 已下线卡在 OMS 下拉里有没有对应概述")
    w("")
    w("| 场景卡 | SOP/卡名 | 卡上的 omsSceneCode | OMS 码 | OMS 名 | 对上方式 |")
    w("|---|---|---|---|---|---|")
    retired_oms_codes = set()
    for c in cards:
        if c["status"] != "retired_dedicated_atom":
            continue
        oms_hits = []
        for o in oms:
            ocore = canon(o["sceneOverviewName"])
            if c["oms"] and o["sceneOverviewCode"] == c["oms"]:
                oms_hits.append((o, "code"))
            elif c["core"] and ocore and min(len(c["core"]), len(ocore)) >= 4:
                if c["core"] == ocore or c["core"] in ocore or ocore in c["core"]:
                    oms_hits.append((o, "name"))
        if not oms_hits:
            w(f"| `{c['sceneKey']}` | {c['sceneName']} | `{c['oms'] or '-'}` | — | **下拉里没有同名** | — |")
            continue
        seen = set()
        for o, how in oms_hits:
            key = o["sceneOverviewCode"]
            if key in seen:
                continue
            seen.add(key)
            retired_oms_codes.add(key)
            w(
                f"| `{c['sceneKey']}` | {c['sceneName']} | `{c['oms'] or '-'}` | `{o['sceneOverviewCode']}` | {o['sceneOverviewName']} | {how} |"
            )
    w("")

    inbound_instock = [o for o in oms if (o.get("group") in ("inbound", "instock", "A", "B", "F-001") or str(o.get("sceneOverviewName", "")).startswith(("【入库】", "【库内】")))]
    outbound = [o for o in oms if str(o.get("sceneOverviewName", "")).startswith("【出库】") or o.get("group") == "outbound"]
    other = [o for o in oms if o not in inbound_instock and o not in outbound]

    w("## 2. 入库/库内 OMS 概述：没有「生效场景卡」")
    w("")
    w("判定：下拉有这条，但没有任何 `status=supported` 的卡用码或名字对上。")
    w("")
    w("| 类型 | OMS 码 | OMS 名 | 现况 |")
    w("|---|---|---|---|")
    no_supported = []
    for o in inbound_instock:
        found = hits_for(o, cards)
        supported = [h for h in found if h[0]["status"] == "supported"]
        retired = [h for h in found if h[0]["status"] == "retired_dedicated_atom"]
        if supported:
            continue
        if retired:
            tag = "有卡但已下线：" + "、".join(h[0]["sceneKey"] for h in retired)
        else:
            tag = "无场景卡"
        grp = "入库" if str(o["sceneOverviewName"]).startswith("【入库】") else "库内"
        no_supported.append((grp, o, tag))
        w(f"| {grp} | `{o['sceneOverviewCode']}` | {o['sceneOverviewName']} | {tag} |")
    w("")
    w(f"入库/库内下拉未挂到生效卡：**{len(no_supported)}** / {len(inbound_instock)}")
    w("")

    w("## 3. 和货权转移同类：OMS 有概述 + 卡被标成独立原子下线")
    w("")
    w("这类不是「OMS 没有」，是「概述在下拉里，Copilot 匹配故意不读」。")
    w("")

    w("## 4. 出库 OMS 概述数量")
    w("")
    w(f"出库下拉 {len(outbound)} 条；场景卡目录没有 outbound 卡。")
    w("")
    w("## 5. 无【入库/库内/出库】前缀")
    w("")
    for o in other:
        w(f"- `{o['sceneOverviewCode']}` {o['sceneOverviewName']}")

    text = "\n".join(lines) + "\n"
    os.makedirs(OUT_DIR, exist_ok=True)
    out_md = os.path.join(OUT_DIR, "oms-vs-cards.md")
    open(out_md, "w", encoding="utf-8").write(text)
    summary = {
        "oms": len(oms),
        "inbound_instock": len(inbound_instock),
        "inbound_instock_no_supported": len(no_supported),
        "outbound": len(outbound),
        "retired_with_oms": sorted(retired_oms_codes),
    }
    open(os.path.join(OUT_DIR, "summary.json"), "w", encoding="utf-8").write(json.dumps(summary, ensure_ascii=False, indent=2))
    print(out_md)
    print("inbound_instock", len(inbound_instock), "no_supported", len(no_supported), "outbound", len(outbound))


if __name__ == "__main__":
    main()
