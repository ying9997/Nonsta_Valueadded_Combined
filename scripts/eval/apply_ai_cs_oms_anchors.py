# -*- coding: utf-8 -*-
"""Attach Scheme C DWS anchors onto the 20260903 AI-CS hit list. Not gold."""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260903_ai_cs_inbound_va_hits")

TARGET = {
    "【入库】尺重/标签辨识后换标上架": "F-001",
    "【入库】包裹类异常换商品标签上架": "A",
    "【入库】指定商品拍照暂存": "B",
}

# Live DWS rows collected this session from bi_dw.whs_vas_online_details_f
DWS_ROWS = [
    {"vas_order_no": "VASC000000313551", "status": "已取消", "business_no": "IH000000103341", "event_no": None, "event_name": None, "warehouse_code": "USWC2", "product_name": "库内非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": "【库内】覆盖A包包裹外箱上的商品标签", "is_audit_through": "Y"},
    {"vas_order_no": "VASC000000339267", "status": "已完成", "business_no": None, "event_no": "EB0126082132375985", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "新單上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000262299", "status": "已完成", "business_no": None, "event_no": "EB0126040628614246", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000267531", "status": "已取消", "business_no": "WI48959400", "event_no": None, "event_name": None, "warehouse_code": "USKY5", "product_name": "入库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000314709", "status": "已完成", "business_no": "WI49957235", "event_no": "EB0126070931142061", "event_name": "A+包裹质量异常", "warehouse_code": "USGA", "product_name": "原单上架", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000207828", "status": "已取消", "business_no": "WO11470286671", "event_no": None, "event_name": None, "warehouse_code": "USWC2", "product_name": "出库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": None, "is_audit_through": "N"},
    {"vas_order_no": "VASC000000287730", "status": "已完成", "business_no": "WO11470286671", "event_no": None, "event_name": None, "warehouse_code": "USWC5", "product_name": "Winit 尾程询价服务", "vas_type": "非标增值", "scene_overview_name": "【尾程】winit线下尾程询价", "is_audit_through": "Y"},
    {"vas_order_no": "VASC000000282264", "status": "已取消", "business_no": "WI49375740", "event_no": "EB0126051529459043", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USWC2", "product_name": "新单上架（WINIT创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000290724", "status": "已完成", "business_no": "WO11476177502", "event_no": None, "event_name": None, "warehouse_code": "USKY5", "product_name": "出库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": "【出库】补贴/更换商品标签", "is_audit_through": "Y"},
    {"vas_order_no": "VASC000000294237", "status": "已完成", "business_no": "IH000000097431", "event_no": None, "event_name": None, "warehouse_code": "USKY5", "product_name": "库内非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": "仓库已完成 需补收费用", "is_audit_through": "Y"},
    {"vas_order_no": "VASC000000145897", "status": "异常终止", "business_no": "WI44697017", "event_no": "EB0125081421861895", "event_name": "商品质量异常(影响销售)", "warehouse_code": "USKY3", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000153870", "status": "已完成", "business_no": "IH000000047628", "event_no": None, "event_name": None, "warehouse_code": "USWC5", "product_name": "库内商品拍照", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000297426", "status": "已完成", "business_no": "WI50338356", "event_no": "EB0126061230350610", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USWC2", "product_name": "新单上架（WINIT创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000299823", "status": "已完成", "business_no": "IH000000099525", "event_no": "EB0526061730468936,EB0526061730469488,EB0526061730469494", "event_name": "包裹内商品错装", "warehouse_code": "USGA", "product_name": "库内轻加工", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000282270", "status": "已取消", "business_no": "WI49375740", "event_no": "EB0126051529459253", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USWC2", "product_name": "新单上架（WINIT创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000282261", "status": "已取消", "business_no": "WI49375740", "event_no": "EB0126051529458860,EB0126051529458878,EB0126051529458950,EB0126051529458974", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USWC2", "product_name": "新单上架（WINIT创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000145888", "status": "已取消", "business_no": None, "event_no": "EB0125081421862033", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000335862", "status": "已取消", "business_no": "WI51723153", "event_no": None, "event_name": None, "warehouse_code": "USWC5", "product_name": None, "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000337068", "status": "已完成", "business_no": None, "event_no": "EB0126081832280636", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "新單上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000271959", "status": "已完成", "business_no": "WI49323068", "event_no": "EB0126042429037159", "event_name": "商品有条码但系统无法识别", "warehouse_code": "USKY5", "product_name": "新单上架（客户提供预报单）", "vas_type": "非标增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000319305", "status": "已取消", "business_no": "WI50550847", "event_no": "EB0126070130909525", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": None, "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000285546", "status": "已完成", "business_no": "WI48898026", "event_no": "EB0126052029604774", "event_name": "客户直发包裹串仓", "warehouse_code": "DE0001", "product_name": "入库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": "【入库】包裹串仓异常调拨", "is_audit_through": "Y"},
    {"vas_order_no": "VASC000000282267", "status": "已取消", "business_no": "WI49375740", "event_no": "EB0126051529459205", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USWC2", "product_name": "新单上架（WINIT创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000334710", "status": "已取消", "business_no": None, "event_no": "EB0126072531606959,EB0126072531607064,EB0126072531607166,EB0126072531607307,EB0126072531607673,EB0126072531607832,EB0126072531607844,EB0126072531607862,EB0126072531607868,EB0126072531607880,EB0126072531607889", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": "入库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": None, "is_audit_through": "N"},
    {"vas_order_no": "VASC000000197898", "status": "已取消", "business_no": None, "event_no": "EB0125112624601155", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": "新单上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000265047", "status": "已取消", "business_no": "WI48864424", "event_no": "EB0126041128738830", "event_name": "A+包裹质量异常", "warehouse_code": "US0001", "product_name": None, "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000333915", "status": "已取消", "business_no": None, "event_no": "EB0126081232158380", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "入库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000316971", "status": "已完成", "business_no": None, "event_no": "EB0126071331235295", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "UKGF", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000251025", "status": "已完成", "business_no": "WI48567547", "event_no": "EB0126031127872772", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "原单上架", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000334821", "status": "已取消", "business_no": None, "event_no": "EB0126081232158380", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "入库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": "【入库】批量辨识商品后补贴商品条码及包裹条码上架", "is_audit_through": None},
    {"vas_order_no": "VASC000000201336", "status": "已取消", "business_no": None, "event_no": "EB0125112624601155", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": "原单上架", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000294384", "status": "已取消", "business_no": "WI48752558", "event_no": "EB0126060230022710", "event_name": "入库单状态异常", "warehouse_code": "UKTW", "product_name": "原单上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000331593", "status": "已完成", "business_no": "WI51441811", "event_no": "EB0126080732049456", "event_name": "商品条码异常(需客户处理)", "warehouse_code": "USWC2", "product_name": "原单上架", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000324000", "status": "已完成", "business_no": "WI49922736", "event_no": "EB0126072331542522", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "UKGF", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000268920", "status": "已取消", "business_no": "WI48273393", "event_no": "EB0326041028727481", "event_name": "包裹内出现订单外商品", "warehouse_code": "UKTW", "product_name": "新单上架（WINIT创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000334815", "status": "已取消", "business_no": None, "event_no": "EB0126081232158380", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000186279", "status": "已完成", "business_no": None, "event_no": "EB0125110423872992", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "UKTW", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000265050", "status": "已完成", "business_no": "WI48864424", "event_no": "EB0126041128738734,EB0126041128738761,EB0126041128738830", "event_name": "A+包裹质量异常", "warehouse_code": "US0001", "product_name": "原单上架", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000268926", "status": "已完成", "business_no": "WI48273393", "event_no": "EB0326041028727481", "event_name": "包裹内出现订单外商品", "warehouse_code": "UKTW", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000335184", "status": "已完成", "business_no": None, "event_no": "EB0126081232158380", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000294390", "status": "已完成", "business_no": "WI48752558", "event_no": "EB0126060230022659,EB0126060230022707,EB0126060230022710", "event_name": "入库单状态异常", "warehouse_code": "UKTW", "product_name": "原单上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000334548", "status": "已取消", "business_no": None, "event_no": "EB0126081232158380", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY5", "product_name": "入库非标增值（特批）", "vas_type": "非标增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000287532", "status": "已完成", "business_no": "WI49965788", "event_no": "EB0126052229716230", "event_name": "商品有条码但系统无法识别", "warehouse_code": "UKTW", "product_name": "原单上架", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000332706", "status": "已取消", "business_no": "WI51527133", "event_no": "EB0126080832104293", "event_name": "入库单状态异常", "warehouse_code": "USWC5", "product_name": None, "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000202023", "status": "已取消", "business_no": None, "event_no": "EB0125112024470886,EB0125112624601155", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": None, "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000202032", "status": "已完成", "business_no": None, "event_no": "EB0125112024470886,EB0125112624601155", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000197421", "status": "已取消", "business_no": None, "event_no": "EB0125112624601155", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": None, "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000201987", "status": "已取消", "business_no": None, "event_no": "EB0125112624601155", "event_name": "包裹条码异常(需客户处理)", "warehouse_code": "USKY3", "product_name": "新单上架（客户创建入库单）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000332709", "status": "已取消", "business_no": "WI51527133", "event_no": "EB0126080832104293", "event_name": "入库单状态异常", "warehouse_code": "USWC5", "product_name": "原单上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
    {"vas_order_no": "VASC000000332712", "status": "异常终止", "business_no": "WI51527133", "event_no": "EB0126080832104293", "event_name": "入库单状态异常", "warehouse_code": "USWC5", "product_name": "原单上架（直接上架）", "vas_type": "标准增值", "scene_overview_name": None, "is_audit_through": None},
]


def classify(row: dict) -> str:
    scene = row.get("scene_overview_name") or ""
    if scene in TARGET:
        return f"target:{TARGET[scene]}"
    prod = row.get("product_name") or ""
    blob = scene + prod
    if any(x in blob for x in ("尾程", "出库", "库内")):
        return "out_of_scope"
    if scene.startswith("【入库】") or "入库非标" in prod or "上架" in prod:
        return "inbound_other"
    if row.get("event_name"):
        return "inbound_other"
    return "unknown"


def build_index() -> dict[str, list[dict]]:
    idx = defaultdict(list)
    for r in DWS_ROWS:
        slim = {**r, "cClass": classify(r)}
        no = (r.get("vas_order_no") or "").upper()
        if no:
            idx[no].append(slim)
        for eb in (r.get("event_no") or "").split(","):
            eb = eb.strip().upper()
            if eb:
                idx[eb].append(slim)
        wi = (r.get("business_no") or "").upper()
        if wi.startswith("WI"):
            idx[wi].append(slim)
    for k, xs in list(idx.items()):
        seen = set()
        uniq = []
        for x in xs:
            sig = x["vas_order_no"]
            if sig in seen:
                continue
            seen.add(sig)
            uniq.append(x)
        idx[k] = uniq
    return idx


def rank_key(row: dict) -> tuple:
    cls = row["cClass"]
    pri = {"target:F-001": 0, "target:A": 0, "target:B": 0, "inbound_other": 1, "unknown": 2, "out_of_scope": 3}
    has_scene = 0 if row.get("scene_overview_name") else 1
    return (pri.get(cls, 9), has_scene, row.get("vas_order_no") or "")


def anchors_for(ids: dict) -> list[dict]:
    idx = ANCHOR_INDEX
    hits = []
    seen = set()
    for kind, values in (("vasc", ids.get("vasc") or []), ("eb", ids.get("eb") or []), ("wi", ids.get("wi") or [])):
        for value in values:
            for row in idx.get(value.upper(), ()):
                sig = (kind, value, row["vas_order_no"])
                if sig in seen:
                    continue
                seen.add(sig)
                hits.append(
                    {
                        "matchKind": kind,
                        "matchValue": value,
                        "orderNo": row["vas_order_no"],
                        "statusDesc": row.get("status"),
                        "sceneOverviewName": row.get("scene_overview_name"),
                        "productName": row.get("product_name"),
                        "eventName": row.get("event_name"),
                        "vasType": row.get("vas_type"),
                        "warehouseCode": row.get("warehouse_code"),
                        "cClass": row["cClass"],
                    }
                )
    hits.sort(key=rank_key)
    return hits[:6]


def fmt_anchor(a: dict) -> str:
    scene = a.get("sceneOverviewName") or "场景空"
    prod = a.get("productName") or "产品空"
    return f"{a['matchKind']} {a['matchValue']} → {a['orderNo']} {a.get('statusDesc') or ''} | {scene} | {prod} | {a['cClass']}"


def patch_review_md(path: Path, by_id: dict) -> None:
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        "- 方案 C：仅当对话里的 VASC/EB/WI 能对上本地 OMS F-001/A/B 事实时补锚。对不上的保持空。",
        "- 方案 C：对话单号对 DWS `bi_dw.whs_vas_online_details_f`。能对上号就补锚；是否 F-001/A/B 看 `scene_overview_name`。",
    )
    lines = text.splitlines()
    out = []
    current_id = None
    for line in lines:
        if line.startswith("## ") and "id=" in line:
            current_id = line.split("id=", 1)[1].split()[0]
        if line.startswith("- 方案 C 锚："):
            r = by_id.get(current_id or "")
            ancs = (r or {}).get("omsAnchors") or []
            if ancs:
                line = "- 方案 C 锚：" + "；".join(fmt_anchor(a) for a in ancs)
            else:
                line = "- 方案 C 锚：无（对话无号，或号在 DWS 未查到 / 是服务编码不是单号）"
        out.append(line)
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


ANCHOR_INDEX = build_index()


def main() -> None:
    hits = []
    for line in (OUT / "hits.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            hits.append(json.loads(line))
    for r in hits:
        r["omsAnchors"] = anchors_for(r.get("ids") or {})

    (OUT / "hits.jsonl").write_text(
        "\n".join(json.dumps(x, ensure_ascii=False) for x in hits) + "\n",
        encoding="utf-8",
    )
    (OUT / "oms_dws_anchors.json").write_text(
        json.dumps(DWS_ROWS, ensure_ascii=False, indent=2),
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
            "omsClass",
            "omsOrderNo",
            "omsScene",
        ]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in hits:
            ancs = r["omsAnchors"]
            w.writerow(
                {
                    "id": r["id"],
                    "conversation_id": r["conversation_id"],
                    "start_at": r["start_at"],
                    "分类": r.get("分类"),
                    "category": r.get("category"),
                    "rounds": r.get("rounds"),
                    "score": r.get("score"),
                    "inboundHits": "|".join(r.get("inboundHits") or []),
                    "vaHits": "|".join(r.get("vaHits") or []),
                    "sceneTags": "|".join(r.get("sceneTags") or []),
                    "vasc": "|".join((r.get("ids") or {}).get("vasc") or []),
                    "eb": "|".join((r.get("ids") or {}).get("eb") or []),
                    "wi": "|".join((r.get("ids") or {}).get("wi") or []),
                    "omsClass": "|".join(sorted({a["cClass"] for a in ancs})),
                    "omsOrderNo": "|".join(sorted({a["orderNo"] for a in ancs})),
                    "omsScene": "|".join(sorted({a["sceneOverviewName"] for a in ancs if a.get("sceneOverviewName")})),
                }
            )

    def refresh(name: str) -> list:
        rows = json.loads((OUT / name).read_text(encoding="utf-8"))
        by = {r["id"]: r for r in hits}
        for r in rows:
            if r["id"] in by:
                r["omsAnchors"] = by[r["id"]]["omsAnchors"]
        (OUT / name).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
        return rows

    review30 = refresh("review-30.json")
    refresh("sample-50.json")
    patch_review_md(OUT / "review-30.md", {r["id"]: r for r in hits})

    cls = Counter()
    n_anc = 0
    n_target = 0
    n_in = 0
    n_out = 0
    for r in hits:
        if r["omsAnchors"]:
            n_anc += 1
        classes = {a["cClass"] for a in r["omsAnchors"]}
        for c in classes:
            cls[c] += 1
        if any(c.startswith("target:") for c in classes):
            n_target += 1
        if "inbound_other" in classes:
            n_in += 1
        if "out_of_scope" in classes:
            n_out += 1

    summary = json.loads((OUT / "summary.json").read_text(encoding="utf-8"))
    summary["hitsWithOmsAnchor"] = n_anc
    summary["omsAnchorClassCounts"] = dict(cls)
    summary["hitsWithTargetSceneFAB"] = n_target
    summary["hitsWithInboundOtherOms"] = n_in
    summary["hitsWithOutOfScopeOms"] = n_out
    summary["review30"]["withOmsAnchor"] = sum(1 for r in review30 if r.get("omsAnchors"))
    summary["note"] = (
        "试点召回，不是 gold。方案 C 已对 DWS 补锚。"
        "对话单号对上的 OMS 单里，F-001/A/B 场景名为 0。"
    )
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    md = (OUT / "summary.md").read_text(encoding="utf-8")
    extra = [
        "",
        "## 方案 C（DWS 补锚）",
        "",
        f"- 命中里能对上 OMS 单：{n_anc} / {len(hits)}",
        f"- 对上且场景是 F-001 / A / B：**{n_target}**",
        f"- 对上但是其他入库异常增值（标准上架/入库非标/近亲场景）：{n_in}",
        f"- 对上但是库内/出库/尾程：{n_out}",
        "- 近亲一例：`VASC000000334821` 场景=【入库】批量辨识商品后补贴商品条码及包裹条码上架（挂在 EB0126081232158380，不是 F-001/A/B）",
        "- `VASC202407…` 在对话里是服务编码，DWS 没有对应增值单号。",
        "",
    ]
    if "## 方案 C" not in md:
        (OUT / "summary.md").write_text(md.rstrip() + "\n" + "\n".join(extra), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ("nHits", "hitsWithOmsAnchor", "hitsWithTargetSceneFAB", "hitsWithInboundOtherOms", "hitsWithOutOfScopeOms", "omsAnchorClassCounts")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
