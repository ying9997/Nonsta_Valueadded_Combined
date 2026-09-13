# coding: utf-8
"""Build T1-T4 HQ details.json from OMS cache + full-window chat."""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

PROBE = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_inbound_scene_probe")
CACHE = PROBE / "_oms_cache"
CHAT_PATH = PROBE / "three_chat_full_window.json"
FILES_CSV = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_t14_eval\_oms_files\files.csv")
OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_t14_eval")

SCENES = [
    {
        "alias": "T1",
        "code": "20250430",
        "sceneKey": "inbound_package_barcode_batch_relabel",
        "name": "【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架",
    },
    {
        "alias": "T2",
        "code": "20250522001",
        "sceneKey": "inbound_photo_hold",
        "name": "【入库】指定商品拍照暂存",
    },
    {
        "alias": "T3",
        "code": "202506120001",
        "sceneKey": "inbound_third_party_merchandise_barcode",
        "name": "【入库】关联第三方商品条码上架",
    },
    {
        "alias": "T4",
        "code": "20250407004",
        "sceneKey": "inbound_label_identify",
        "name": "【入库】尺重/标签辨识后换标上架",
    },
]
CODE_TO_SCENE = {s["code"]: s for s in SCENES}
CODES = set(CODE_TO_SCENE)

EB_RE = re.compile(r"EB\d{6,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)
VASC_RE = re.compile(r"VASC\d{6,}", re.I)

# Conflict keywords only when not already part of expected scene name
SUSPECT_SCENE_KEYWORDS = ["新单上架", "关联第三方", "覆盖指定", "直接上架"]

ATTR_KEEP = {
    "BEOR",
    "VAS_ATTR_REL_RD",
    "VAS_ATTR_REL_NWEON",
    "NSVASTN",
    "PACKAGE_SERNO",
    "MERCHANDISE_SERNO",
}


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def looks_like_reject_only(rd: str) -> bool:
    t = rd.strip()
    if not t:
        return True
    if re.match(r"^VASC\d{6,}", t, re.I):
        return True
    if re.match(r"^因.*退回|^退回原因|^驳回", t):
        return True
    return False


def quality_flags(scene_name: str, names: list[str], rd: str) -> list[str]:
    flags: list[str] = []
    name_blob = " | ".join(names)
    for kw in SUSPECT_SCENE_KEYWORDS:
        if kw in name_blob and kw not in scene_name:
            flags.append(f"suspect_scene_keyword:{kw}")
    if looks_like_reject_only(rd):
        flags.append("suspect_rd_reject_or_empty")
    if 0 < len(rd.strip()) < 8:
        flags.append("suspect_rd_too_short")
    return sorted(set(flags))


def chat_field(thread: dict, *names: str) -> str:
    for n in names:
        if n in thread and thread[n] is not None:
            return str(thread[n])
    # encoding-safe fallback by known semantic
    return ""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    orders = {r["order_no"]: r for r in read_csv(CACHE / "orders.csv")}
    atoms_by_order: dict[str, list[dict]] = defaultdict(list)
    for r in read_csv(CACHE / "atoms.csv"):
        if r.get("scene_overview_code") in CODES:
            atoms_by_order[r["order_no"]].append(r)

    attrs_by_order: dict[str, list[dict]] = defaultdict(list)
    for r in read_csv(CACHE / "attrs_submit.csv"):
        if r["order_no"] in atoms_by_order:
            attrs_by_order[r["order_no"]].append(r)

    files_by_order: dict[str, list[dict]] = defaultdict(list)
    if FILES_CSV.exists():
        for r in read_csv(FILES_CSV):
            files_by_order[r["order_no"]].append(r)

    chats = json.loads(CHAT_PATH.read_text(encoding="utf-8"))
    # index: token -> list of thread idxs
    eb_index: dict[str, list[int]] = defaultdict(list)
    vasc_index: dict[str, list[int]] = defaultdict(list)
    for i, th in enumerate(chats):
        blob = "\n".join(str(v) for v in th.values() if v)
        for eb in set(EB_RE.findall(blob)):
            eb_index[eb.upper()].append(i)
        for vn in set(VASC_RE.findall(blob)):
            vasc_index[vn.upper()].append(i)

    stats = {
        s["alias"]: {
            "orders": 0,
            "withEb": 0,
            "withChat": 0,
            "hq": 0,
            "qualityFlag": 0,
        }
        for s in SCENES
    }

    details: list[dict] = []

    for order_no, atoms in sorted(atoms_by_order.items()):
        # Prefer OW01V1602 atom matching scene code
        ow = [a for a in atoms if a.get("service_code") == "OW01V1602"]
        atom = ow[0] if ow else atoms[0]
        code = atom.get("scene_overview_code") or ""
        scene = CODE_TO_SCENE.get(code)
        if not scene:
            continue
        alias = scene["alias"]
        stats[alias]["orders"] += 1

        order = orders.get(order_no, {})
        attrs = attrs_by_order.get(order_no, [])
        # Prefer attrs for this atom
        atom_id = str(atom.get("atom_id") or "")
        attrs_atom = [a for a in attrs if str(a.get("va_atom_id") or "") == atom_id] or attrs

        attr_map: dict[str, dict] = {}
        blob_parts: list[str] = []
        for a in attrs_atom:
            key = (a.get("attribute_key") or "").strip()
            name = (a.get("attribute_name") or "").strip()
            val = (a.get("attribute_value") or "").strip()
            if not val:
                continue
            blob_parts.append(val)
            if key and key not in attr_map:
                attr_map[key] = {"key": key, "name": name, "value": val}

        beor = (attr_map.get("BEOR") or {}).get("value", "")
        rd = (attr_map.get("VAS_ATTR_REL_RD") or {}).get("value", "")
        nweon = (attr_map.get("VAS_ATTR_REL_NWEON") or {}).get("value", "")
        nsvastn = (attr_map.get("NSVASTN") or {}).get("value", "")

        text_blob = "\n".join(blob_parts)
        ebs = sorted({m.upper() for m in EB_RE.findall(text_blob)})
        wis = sorted({m.upper() for m in WI_RE.findall("\n".join([text_blob, nweon, nsvastn]))})

        if ebs:
            stats[alias]["withEb"] += 1

        # chat match: EB literal OR VASC
        hit_idxs: list[int] = []
        seen = set()
        for eb in ebs:
            for idx in eb_index.get(eb, []):
                if idx not in seen:
                    seen.add(idx)
                    hit_idxs.append(idx)
        for idx in vasc_index.get(order_no.upper(), []):
            if idx not in seen:
                seen.add(idx)
                hit_idxs.append(idx)

        conv_parts: list[str] = []
        case_id = ""
        for idx in hit_idxs[:5]:
            th = chats[idx]
            # Chinese keys
            detail = th.get("对话详情") or ""
            group = th.get("群名称") or ""
            gid = th.get("群ID") or ""
            tid = th.get("讨论ID") or ""
            if not case_id and tid:
                case_id = f"thread:{tid}"
            if detail:
                header = f"--- 群聊: {group} ({gid}) ---" if group or gid else "--- 群聊 ---"
                conv_parts.append(f"{header}\n{detail}")
        conversation_raw = "\n\n".join(conv_parts).strip()
        conversation_available = bool(conversation_raw)
        if conversation_available:
            stats[alias]["withChat"] += 1

        is_hq = bool(ebs) and conversation_available and len(conversation_raw) >= 500
        if not is_hq:
            continue
        stats[alias]["hq"] += 1

        scene_name = atom.get("scene_overview_name") or scene["name"]
        # Ensure full 【入库】 prefix if missing
        if scene_name and not scene_name.startswith("【"):
            scene_name = scene["name"]

        qflags = quality_flags(scene["name"], [scene_name], rd)
        if qflags:
            stats[alias]["qualityFlag"] += 1

        va_attrs = []
        for key in ("BEOR", "VAS_ATTR_REL_RD", "VAS_ATTR_REL_NWEON", "NSVASTN", "PACKAGE_SERNO", "MERCHANDISE_SERNO"):
            if key not in attr_map:
                continue
            item = attr_map[key]
            va_attrs.append(
                {
                    "attributeKey": item["key"],
                    "attributeKeyOriginal": item["key"],
                    "attributeName": item["name"] or key,
                    "attributeValue": item["value"],
                    "attributeValueOriginal": item["value"],
                }
            )

        va_files = []
        for f in files_by_order.get(order_no, []):
            ft = (f.get("file_type") or f.get("type") or "").strip()
            fn = (f.get("file_name") or "").strip()
            if not ft and not fn:
                continue
            # Prefer SUBMIT-node files if marked
            node = (f.get("input_node") or "").upper()
            if node and node not in ("SUBMIT", ""):
                continue
            va_files.append({"fileType": ft, "fileName": fn})

        # de-dupe files by type+name
        seen_f = set()
        uniq_files = []
        for f in va_files:
            k = (f["fileType"], f["fileName"])
            if k in seen_f:
                continue
            seen_f.add(k)
            uniq_files.append(f)

        customer_intent = "\n".join(x for x in (beor, rd) if x).strip()
        # Hard: never put scene overview name into intent — already only BEOR+RD

        detail = {
            "orderNo": order_no,
            "listHeader": {
                "orderNo": order_no,
                "warehouseCode": order.get("warehouse_code") or "",
                "warehouseName": order.get("warehouse_name") or "",
                "customerCode": order.get("customer_code") or "",
                "customerName": order.get("customer_name") or "",
                "vaSource": order.get("va_source") or "INHOUSE",
                "createdby": "",
                "vasc": {
                    "productCode": order.get("product_code") or "VASC202411192246131",
                    "productName": order.get("product_name") or "入库非标增值（特批）",
                },
                "businessOrder": {
                    "businessNo": wis[0] if wis else nweon or nsvastn,
                    "childBusinessOrders": [{"businessNo": w} for w in wis[1:6]],
                },
            },
            "atoms": [
                {
                    "serviceCode": atom.get("service_code") or "OW01V1602",
                    "serviceName": atom.get("service_name") or "入库其他服务需求",
                    "sceneOverviewCode": code,
                    "sceneOverviewName": scene_name,
                    "vaAtomAttrs": va_attrs,
                    "vaAtomFiles": uniq_files,
                }
            ],
            "events": [{"eventNo": eb, "businessNo": eb} for eb in ebs],
            "errors": [],
            "conversationAvailable": True,
            "conversationRaw": conversation_raw,
            "qualityFlag": qflags,
            "_caseMeta": {
                "caseId": case_id or f"oms:{order_no}",
                "expectedSceneAlias": alias,
                "expectedSceneKey": scene["sceneKey"],
                "expectedSceneCode": code,
                "expectedSceneName": scene["name"],
                "customerIntentPreview": customer_intent[:500],
                "conversationAvailable": True,
                "conversationRaw": conversation_raw,
                "conversationRawStatus": "found",
                "qualityFlag": qflags,
                "sceneOverviewNames": [scene_name],
                "vascNos": [order_no],
                "ebNos": ebs,
                "wiNos": wis,
            },
        }
        details.append(detail)

    (OUT / "details.json").write_text(
        json.dumps(details, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    lines = [
        "# T1–T4 HQ 候选池摘要",
        "",
        f"- 生成时间: 本机构建",
        f"- OMS 缓存: `{CACHE}`",
        f"- 群聊: `{CHAT_PATH.name}`（EB literal OR VASC）",
        f"- HQ 定义: 有 EB + 有群聊 + 对话 ≥ 500 字",
        f"- details 条数: **{len(details)}**（仅 HQ）",
        f"- 附件: `{FILES_CSV}`（{sum(1 for _ in FILES_CSV.open(encoding='utf-8-sig')) - 1 if FILES_CSV.exists() else 0} 行）",
        "",
        "| 场景 | OMS码 | 场景订单 | 有 EB | 有群聊 | HQ 候选 | HQ 中 qualityFlag |",
        "|------|-------|--------:|------:|-------:|--------:|------------------:|",
    ]
    for s in SCENES:
        a = s["alias"]
        st = stats[a]
        lines.append(
            f"| {a} | `{s['code']}` | {st['orders']} | {st['withEb']} | {st['withChat']} | {st['hq']} | {st['qualityFlag']} |"
        )
    lines.append("")
    lines.append("## 说明")
    lines.append("")
    lines.append("- `customerIntent` 仅由 BEOR + VAS_ATTR_REL_RD 拼接，不含 sceneOverviewNames。")
    lines.append("- `qualityFlag`：场景名含冲突关键词（且非本场景名自带）、RD 像退回引用/过短。")
    lines.append("- T2 alias=B 卡 / T4 alias=F-001 卡；meta 里用 T2/T4 便于分桶。")
    (OUT / "hq-pool-summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (OUT / "hq-pool-stats.json").write_text(
        json.dumps({"stats": stats, "hqTotal": len(details)}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"hqTotal": len(details), "stats": stats}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
