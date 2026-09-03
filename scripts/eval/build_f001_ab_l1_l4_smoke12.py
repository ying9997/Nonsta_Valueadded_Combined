# -*- coding: utf-8 -*-
"""Build 12-case F-001/A/B L1-L4 target-state smoke set.

Not formal gold. Not written to eval-v0.1. Does not change runtime.
A/B L3/L4 are future_target / target_spec only.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
XLSX = ROOT / "workspace" / "data" / "raw" / "全量_增值单接口口径事实补齐.xlsx"
CUT = ROOT / "_tmp" / "raw_vas_eval_cut_20260903"
DEFAULT_OUT = ROOT / "_tmp" / "f001_ab_b_l1_l4_smoke_20260903"

F001_NAME = "【入库】尺重/标签辨识后换标上架"
A_NAME = "【入库】包裹类异常换商品标签上架"
B_NAME = "【入库】指定商品拍照暂存"
NOT_F001 = "【入库】批量辨识商品后补贴商品条码及包裹条码上架"

MUST_NOT = ["审核通过", "自动批准", "公开价", "1个工作日"]
F001_ATTACH = ("操作说明附件", "商品和标签的对应关系", "标签文件")

VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)")
COMPANY_RE = re.compile(r"[\u4e00-\u9fff]{2,12}(?:有限公司|股份有限公司|公司|贸易|仓储|集团)")
PERSON_RE = re.compile(r"袁帅")
BRAND_RE = re.compile(r"子不语")

# 12 slots: orderNo is the real OMS row to bind.
SLOTS = [
    {
        "id": "smoke-f001-l1-01",
        "orderNo": "VASC000000271086",
        "scenario": "F001",
        "layer": "L1_requirement_incomplete",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_supported_f001",
        "guessed_scene": "inbound_label_identify",
        "source_type": "raw_oms_excel",
        "why": "官方 F-001 名，需求描述/背景均为空，只用 OMS 空字段做 L1。",
        "expected_next_node": "check-requirement",
        "expected_output_path": "needs_requirement_clarification",
        "expected_decision": "unsupported",
        "expected_tools": ["check-requirement"],
        "forbidden_tools": ["match-template", "generate_sop"],
        "must_contain": ["对象或单据", "动作或去向"],
        "include_scene_in_input": False,
        "omit_sop_from_input": True,
    },
    {
        "id": "smoke-f001-l2-01",
        "orderNo": "VASC000000323364",
        "scenario": "F001",
        "layer": "L2_template_routing",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_supported_f001",
        "guessed_scene": "",
        "source_type": "raw_oms_excel",
        "why": "官方 F-001 名，正文只有「更换产品标签并上架」，无辨识、无包裹类异常，测 F-001↔A 边界。",
        "expected_next_node": "match-template",
        "expected_output_path": "transfer_human",
        "expected_decision": "ambiguous",
        "expected_tools": ["check-requirement", "match-template"],
        "forbidden_tools": ["generate_sop", "check-completeness"],
        "must_contain": ["无法唯一确定场景"],
        "include_scene_in_input": True,
        "omit_sop_from_input": True,
    },
    {
        "id": "smoke-f001-l3-01",
        "orderNo": "VASC000000287082",
        "scenario": "F001",
        "layer": "L3_materials_incomplete",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_supported_f001",
        "guessed_scene": "inbound_label_identify",
        "source_type": "raw_oms_excel",
        "why": "官方 F-001，需求可匹配；宽表无附件列，按已定义三附件 missing 测当前 L3。",
        "expected_next_node": "check-completeness",
        "expected_output_path": "needs_field_clarification",
        "expected_decision": "supported",
        "expected_tools": ["check-requirement", "match-template", "check-completeness"],
        "forbidden_tools": ["generate_sop"],
        "must_contain": ["操作说明附件"],
        "include_scene_in_input": True,
        "omit_sop_from_input": True,
        "f001_attachments_missing": True,
    },
    {
        "id": "smoke-f001-l4-01",
        "orderNo": "VASC000000292350",
        "scenario": "F001",
        "layer": "L4_end_to_end",
        "target_mode": "current_supported",
        "gold_status": "gold_candidate",
        "scene_family": "known_supported_f001",
        "guessed_scene": "inbound_label_identify",
        "source_type": "raw_oms_excel",
        "why": "官方 F-001，需求/背景/SOP 齐，isAuditThrough=Y，已完成。",
        "expected_next_node": "format-output",
        "expected_output_path": "sop_generated",
        "expected_decision": "supported",
        "expected_tools": ["check-requirement", "match-template", "check-completeness", "generate_sop"],
        "forbidden_tools": [],
        "must_contain": ["辨识", "换标", "上架"],
        "include_scene_in_input": True,
        "omit_sop_from_input": False,
    },
    {
        "id": "smoke-a-l1-01",
        "orderNo": "VASC000000293940",
        "scenario": "A",
        "layer": "L1_requirement_incomplete",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_candidate_a",
        "guessed_scene": "inbound_package_exception_relabel_shelving",
        "source_type": "raw_oms_excel",
        "why": "官方 A 名，需求描述/背景为空。",
        "expected_next_node": "check-requirement",
        "expected_output_path": "needs_requirement_clarification",
        "expected_decision": "unsupported",
        "expected_tools": ["check-requirement"],
        "forbidden_tools": ["match-template", "generate_sop"],
        "must_contain": ["对象或单据", "动作或去向"],
        "include_scene_in_input": False,
        "omit_sop_from_input": True,
    },
    {
        "id": "smoke-a-l2-01",
        "orderNo": "VASC000000296319",
        "scenario": "A",
        "layer": "L2_template_routing",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_candidate_a",
        "guessed_scene": "",
        "source_type": "raw_oms_excel",
        "why": "官方 A 名，正文是按 SN 换包裹条码上新单，不是「包裹条码正常/商品条码异常」。",
        "expected_next_node": "match-template",
        "expected_output_path": "transfer_human",
        "expected_decision": "ambiguous",
        "expected_tools": ["check-requirement", "match-template"],
        "forbidden_tools": ["generate_sop", "check-completeness"],
        "must_contain": ["无法唯一确定场景"],
        "include_scene_in_input": True,
        "omit_sop_from_input": True,
    },
    {
        "id": "smoke-a-l3-target-01",
        "orderNo": "VASC000000296325",
        "scenario": "A",
        "layer": "L3_materials_incomplete",
        "target_mode": "future_target",
        "gold_status": "target_spec_candidate",
        "scene_family": "known_candidate_a",
        "guessed_scene": "inbound_package_exception_relabel_shelving",
        "source_type": "raw_oms_excel",
        "why": "官方 A 名且有需求/背景/SOP。宽表无法判断目标态附件。A/B 不套 F-001 三必填。",
        "expected_next_node": "check-completeness",
        "expected_output_path": "needs_field_clarification",
        "expected_decision": "supported",
        "expected_tools": ["check-requirement", "match-template", "check-completeness"],
        "forbidden_tools": ["generate_sop"],
        "must_contain": ["转人工或待补信息"],
        "include_scene_in_input": True,
        "omit_sop_from_input": True,
        "target_l3": True,
    },
    {
        "id": "smoke-a-l4-target-01",
        "orderNo": "VASC000000271665",
        "scenario": "A",
        "layer": "L4_end_to_end",
        "target_mode": "future_target",
        "gold_status": "target_spec_candidate",
        "scene_family": "known_candidate_a",
        "guessed_scene": "inbound_package_exception_relabel_shelving",
        "source_type": "raw_oms_excel",
        "why": "官方 A 名，需求/背景/SOP 齐，审核通过且已完成。目标态预期 sop_generated。",
        "expected_next_node": "format-output",
        "expected_output_path": "sop_generated",
        "expected_decision": "supported",
        "expected_tools": ["check-requirement", "match-template", "generate_sop"],
        "forbidden_tools": [],
        "must_contain": ["换商品标签", "上架"],
        "include_scene_in_input": True,
        "omit_sop_from_input": False,
        "target_l4": True,
    },
    {
        "id": "smoke-b-l1-01",
        "orderNo": "VASC000000277680",
        "scenario": "B",
        "layer": "L1_requirement_incomplete",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_candidate_b",
        "guessed_scene": "inbound_photo_hold",
        "source_type": "raw_oms_excel",
        "why": "官方 B 名，需求描述/背景为空。",
        "expected_next_node": "check-requirement",
        "expected_output_path": "needs_requirement_clarification",
        "expected_decision": "unsupported",
        "expected_tools": ["check-requirement"],
        "forbidden_tools": ["match-template", "generate_sop"],
        "must_contain": ["对象或单据", "动作或去向"],
        "include_scene_in_input": False,
        "omit_sop_from_input": True,
    },
    {
        "id": "smoke-b-l2-01",
        "orderNo": "VASC000000244686",
        "scenario": "B",
        "layer": "L2_template_routing",
        "target_mode": "current_supported",
        "gold_status": "derived_candidate",
        "scene_family": "known_candidate_b",
        "guessed_scene": "",
        "source_type": "raw_oms_excel",
        "why": "官方 B 名，正文只有补拍正反面，无暂存/客户确认后再处理。",
        "expected_next_node": "match-template",
        "expected_output_path": "transfer_human",
        "expected_decision": "ambiguous",
        "expected_tools": ["check-requirement", "match-template"],
        "forbidden_tools": ["generate_sop", "check-completeness"],
        "must_contain": ["去向未说明"],
        "include_scene_in_input": True,
        "omit_sop_from_input": True,
    },
    {
        "id": "smoke-b-l3-target-01",
        "orderNo": "VASC000000298641",
        "scenario": "B",
        "layer": "L3_materials_incomplete",
        "target_mode": "future_target",
        "gold_status": "target_spec_candidate",
        "scene_family": "known_candidate_b",
        "guessed_scene": "inbound_photo_hold",
        "source_type": "raw_oms_excel",
        "why": "官方 B 名，正文含拍照确认完好，SOP 含暂存等客户后续。宽表无法判断目标态附件。",
        "expected_next_node": "check-completeness",
        "expected_output_path": "needs_field_clarification",
        "expected_decision": "supported",
        "expected_tools": ["check-requirement", "match-template", "check-completeness"],
        "forbidden_tools": ["generate_sop"],
        "must_contain": ["转人工或待补信息"],
        "include_scene_in_input": True,
        "omit_sop_from_input": True,
        "target_l3": True,
    },
    {
        "id": "smoke-b-l4-target-01",
        "orderNo": "VASC000000270000",
        "scenario": "B",
        "layer": "L4_end_to_end",
        "target_mode": "future_target",
        "gold_status": "target_spec_candidate",
        "scene_family": "known_candidate_b",
        "guessed_scene": "inbound_photo_hold",
        "source_type": "raw_oms_excel",
        "why": "官方 B 名，数字标识+拍照+后续销毁/上架，需求/背景/SOP 齐，审核通过。",
        "expected_next_node": "format-output",
        "expected_output_path": "sop_generated",
        "expected_decision": "supported",
        "expected_tools": ["check-requirement", "match-template", "generate_sop"],
        "forbidden_tools": [],
        "must_contain": ["数字标识", "拍照"],
        "include_scene_in_input": True,
        "omit_sop_from_input": False,
        "target_l4": True,
    },
]


def cell(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = str(value).replace("\xa0", " ").strip()
    return "" if text.lower() in {"nan", "none", "nat"} else text


def scrub(text: str) -> str:
    out = EMAIL_RE.sub("[EMAIL]", text or "")
    out = PHONE_RE.sub("[PHONE]", out)
    out = COMPANY_RE.sub("[CO]", out)
    out = PERSON_RE.sub("[NAME]", out)
    out = BRAND_RE.sub("[BRAND]", out)
    return out


class IdMap:
    def __init__(self) -> None:
        self.order: dict[str, str] = {}
        self.eb: dict[str, str] = {}
        self.wi: dict[str, str] = {}

    def add_order(self, real: str, fake: str) -> str:
        self.order[real.upper()] = fake
        return fake

    def _seq(self, store: dict[str, str], real: str, prefix: str) -> str:
        key = real.upper()
        if key not in store:
            store[key] = f"{prefix}_{len(store) + 1:06d}"
        return store[key]

    def replace(self, text: str) -> str:
        out = scrub(text)
        for m in VASC_RE.findall(out):
            fake = self.order.get(m.upper()) or self._seq(self.order, m, "VASC_TGT")
            out = re.sub(re.escape(m), fake, out, flags=re.I)
        for m in EB_RE.findall(out):
            out = re.sub(re.escape(m), self._seq(self.eb, m, "EB_TGT"), out, flags=re.I)
        for m in WI_RE.findall(out):
            out = re.sub(re.escape(m), self._seq(self.wi, m, "WI_TGT"), out, flags=re.I)
        return out

    def dump(self) -> dict:
        return {
            "orders": dict(sorted(self.order.items())),
            "eb": dict(sorted(self.eb.items())),
            "wi": dict(sorted(self.wi.items())),
        }


def load_oms(path: Path) -> dict[str, dict]:
    df = pd.read_excel(path, sheet_name=0, dtype=object)
    rows = {}
    for rec in df.to_dict(orient="records"):
        no = cell(rec.get("orderNo")).upper()
        if no:
            rows[no] = rec
    return rows


def input_message(slot: dict, desc: str, bg: str, scene: str, sop: str) -> str:
    parts = []
    if slot.get("include_scene_in_input") and scene:
        parts.append(f"[场景概述]：{scene}")
    if desc:
        parts.append(f"[客户需求描述]：{desc}")
    else:
        parts.append("[客户需求描述]：（OMS 空）")
    if bg:
        parts.append(f"[需求背景]：{bg}")
    else:
        parts.append("[需求背景]：（OMS 空）")
    if not slot.get("omit_sop_from_input") and sop:
        parts.append(f"[历史SOP]：{sop}")
    return "\n".join(parts)


def risk_notes(slot: dict) -> str:
    bits = [slot["why"], "不写入 eval-v0.1，不计正式准确率。"]
    if slot["layer"].startswith("L1"):
        bits.append("本轮未切开群聊。input_message 只用 OMS 需求字段，未写假定业务句。")
    if slot.get("f001_attachments_missing"):
        bits.append("宽表无附件列。F-001 L3 使用项目已定义三附件名标 missing，未编造新字段。")
    if slot.get("target_l3"):
        bits.append("目标态 L3 规则待业务确认。missingFields=target_rule_pending。未套 F-001 三必填。")
        bits.append("A/B L3 是 future_target / target_spec，不代表当前线上已支持。")
    if slot.get("target_l4"):
        bits.append("A/B L4 target without signed attachment gate。")
        bits.append("A/B L4 是 future_target / target_spec，不代表当前线上已支持。")
    if slot["orderNo"] and NOT_F001:
        bits.append("F-001 只认官方名【入库】尺重/标签辨识后换标上架。")
    return "；".join(bits)


def build_case(slot: dict, oms: dict, idmap: IdMap, fake_order: str) -> tuple[dict, dict, dict]:
    real = slot["orderNo"]
    desc = cell(oms.get("requirementDescription"))
    bg = cell(oms.get("requirementBackground"))
    scene = cell(oms.get("sceneOverviewName"))
    sop = cell(oms.get("sop"))
    if scene == NOT_F001:
        raise ValueError(f"{real} is batch-identify, not official F-001")
    # L1 不把 SOP 里的后验 EB/WI 绑进上下文，避免空需求误过需求门。
    # L2/L3/L4 可以用单据上已有的 EB/WI 作为 OMS 已绑定事实。
    id_src = " ".join([desc, bg] + ([] if slot["layer"].startswith("L1") else [sop]))
    blob = id_src
    ebs = list(dict.fromkeys(m.upper() for m in EB_RE.findall(blob)))
    wis = list(dict.fromkeys(m.upper() for m in WI_RE.findall(blob)))
    desc_d = scrub(idmap.replace(desc))
    bg_d = scrub(idmap.replace(bg))
    sop_d = scrub(idmap.replace(sop))
    scene_d = scene
    fake_ebs = [idmap.replace(x) for x in ebs]
    fake_wis = [idmap.replace(x) for x in wis]

    attach: dict = {}
    extra_ctx = {}
    if slot.get("f001_attachments_missing"):
        attach = {k: "missing" for k in F001_ATTACH}
    if slot.get("target_l3"):
        extra_ctx["missingFields"] = ["target_rule_pending"]

    expected_scene = slot["guessed_scene"] or None
    topk = [slot["guessed_scene"]] if slot["guessed_scene"] else []
    if slot["id"].endswith("l2-01"):
        if slot["scenario"] == "F001":
            topk = ["inbound_label_identify", "inbound_package_exception_relabel_shelving"]
        elif slot["scenario"] == "A":
            topk = ["inbound_package_exception_relabel_shelving"]
        elif slot["scenario"] == "B":
            topk = []

    rec = {
        "id": slot["id"],
        "target_mode": slot["target_mode"],
        "scenario": slot["scenario"],
        "layer": slot["layer"],
        "scene_family": slot["scene_family"],
        "guessed_scene": slot["guessed_scene"],
        "source_type": slot["source_type"],
        "source_ref": f"workspace/data/raw/全量_增值单接口口径事实补齐.xlsx#sheet0#{fake_order}",
        "gold_status": slot["gold_status"],
        "input_message": input_message(slot, desc_d, bg_d, scene_d, sop_d),
        "available_context": {
            "eventNo": fake_ebs[0] if fake_ebs else "",
            "businessOrderNo": fake_wis[0] if fake_wis else "",
            "warehouseCode": cell(oms.get("warehouseCode")),
            "warehouseName": cell(oms.get("warehouseName")),
            "serviceName": cell(oms.get("serviceName")),
            "sceneName": scene_d,
            "attachmentStatus": attach,
            **extra_ctx,
        },
        "expected_next_node": slot["expected_next_node"],
        "expected_output_path": slot["expected_output_path"],
        "expected_scene": expected_scene,
        "expected_topk_contains": topk,
        "expected_decision": slot["expected_decision"],
        "expected_tools": slot["expected_tools"],
        "forbidden_tools": slot["forbidden_tools"],
        "must_contain": slot["must_contain"],
        "must_not_contain": list(MUST_NOT),
        "risk_notes": risk_notes(slot),
        "evidence_notes": (
            f"official_scene={scene}；status={cell(oms.get('status'))}；"
            f"isAuditThrough={cell(oms.get('isAuditThrough'))}；{slot['why']}"
        ),
    }

    detail = {
        "orderNo": fake_order,
        "smokeId": slot["id"],
        "target_mode": slot["target_mode"],
        "listHeader": {
            "orderNo": fake_order,
            "status": cell(oms.get("status")),
            "warehouseCode": cell(oms.get("warehouseCode")),
            "warehouseName": cell(oms.get("warehouseName")),
            "vaSource": cell(oms.get("vaSource")),
            "customerCode": "",
            "customerName": "",
            "warehouse": {
                "warehouseCode": cell(oms.get("warehouseCode")),
                "warehouseName": cell(oms.get("warehouseName")),
            },
            "businessOrder": {"childBusinessOrders": [{"businessNo": n} for n in fake_ebs + fake_wis]},
        },
        "atoms": [
            {
                "serviceCode": "OW01V1602" if "入库其他服务需求" in cell(oms.get("serviceName")) else "",
                "serviceName": cell(oms.get("serviceName")),
                "sceneOverviewName": scene,
                "sop": sop_d if not slot.get("omit_sop_from_input") else "",
                "vaAtomAttrs": [
                    {"attributeKey": "VAS_ATTR_REL_RD", "attributeName": "需求描述", "attributeValue": desc_d},
                    {"attributeKey": "BEOR", "attributeName": "需求背景说明", "attributeValue": bg_d},
                    {
                        "attributeKey": "VAS_ATTR_REL_NWEON",
                        "attributeName": "上架入库单号",
                        "attributeValue": fake_wis[0] if fake_wis else "",
                    },
                    {
                        "attributeKey": "NSVASTN",
                        "attributeName": "非标增值来源单号",
                        "attributeValue": fake_ebs[0] if fake_ebs else "",
                    },
                ],
                "vaAtomFiles": [],
            }
        ],
        "events": [{"eventNo": n} for n in fake_ebs],
        "requirementDescription": desc_d,
        "requirementBackground": bg_d,
    }

    review = {
        "id": slot["id"],
        "fake_id": fake_order,
        "orderNo": real,
        "ebs": ebs,
        "wis": wis,
        "feishuUrls": cell(oms.get("feishuUrls")),
        "scene": scene,
        "desc": scrub(desc),
        "bg": scrub(bg),
        "sop": scrub(sop),
        "status": cell(oms.get("status")),
        "audit": cell(oms.get("isAuditThrough")),
        "audit_evt": cell(oms.get("auditTraceEventCode")),
        "warehouse": cell(oms.get("warehouseName")),
        "service": cell(oms.get("serviceName")),
        "slot": slot,
    }
    return rec, detail, review


def write_matrix(path: Path, reviews: list[dict], cases: list[dict]) -> None:
    lines = [
        "# F-001 / A / B · L1–L4 目标态 smoke 矩阵",
        "",
        "- 不是正式准确率评测，不写入 eval-v0.1。",
        "- F-001 L1–L4：`current_supported`，可按当前代码评估。",
        "- A/B L1–L2：`current_supported`，测当前分流。",
        "- **A/B L3/L4：`future_target` / `target_spec`，不是当前线上能力证明。当前代码转人工不算失败。**",
        "- F-001 只认官方名 `【入库】尺重/标签辨识后换标上架`。",
        "- 当前 dry-run：`_runs/20260903_f001_ab_l1_l4_smoke12/`。A/B L3/L4 转人工不算失败。",
        "",
        "| id | scenario | layer | fake_id | 真实 orderNo | 是否真实 OMS | derived_from_raw | expected_output_path | target_mode | risk_notes |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for rec, rev in zip(cases, reviews):
        risk = rev["slot"]["why"].replace("|", "/")
        lines.append(
            f"| `{rec['id']}` | {rec['scenario']} | {rec['layer']} | `{rev['fake_id']}` | `{rev['orderNo']}` | 是 | 否 | `{rec['expected_output_path']}` | `{rec['target_mode']}` | {risk} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_review(path: Path, reviews: list[dict], cases: list[dict]) -> None:
    lines = [
        "# F-001 / A / B 12 条目标态 smoke 核查",
        "",
        f"- 生成时间：{datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')}",
        "- 内部核查可含真实 orderNo / EB / WI / feishuUrls。不含客户名、邮箱、电话、地址、客户公司名。",
        "- jsonl 使用假 ID。本文件仅内部对照。",
        "- **A/B 的 L3/L4 是目标态用例，不是当前线上能力证明。**",
        "",
        "## 当前代码 dry-run（不是正式准确率）",
        "",
        "路径：`_runs/20260903_f001_ab_l1_l4_smoke12/`",
        "",
        "解读约定：",
        "",
        "- F-001 L1–L4 按**当前能力**看。",
        "- A/B L1–L2 按**当前分流**看。",
        "- **A/B L3/L4 若转人工，不算失败**，只说明 `target_spec` 尚未实现。",
        "",
        "明细表在 dry-run 之后写入本文件；以 `_runs/20260903_f001_ab_l1_l4_smoke12/how_to_read.md` 为准。",
        "",
    ]
    for rec, rev in zip(cases, reviews):
        slot = rev["slot"]
        lines += [
            f"## {rec['id']}",
            "",
            f"- target_mode：`{rec['target_mode']}`",
            f"- scenario / layer：`{rec['scenario']}` / `{rec['layer']}`",
            f"- fake_id：`{rev['fake_id']}`",
            f"- 真实 orderNo：`{rev['orderNo']}`",
            f"- EB：{'、'.join(f'`{x}`' for x in rev['ebs']) or '（未检出）'}",
            f"- WI：{'、'.join(f'`{x}`' for x in rev['wis']) or '（未检出）'}",
            f"- 仓 / 服务：{rev['warehouse']} / {rev['service']}",
            f"- status / isAuditThrough / event：`{rev['status']}` / `{rev['audit']}` / `{rev['audit_evt']}`",
            f"- 官方场景名：{rev['scene']}",
            f"- expected：`{rec['expected_next_node']}` → `{rec['expected_output_path']}` / `{rec['expected_decision']}`",
            f"- 挑选理由：{slot['why']}",
            "",
            "### 需求描述",
            "",
            f"```text\n{rev['desc'] or '（OMS 空）'}\n```",
            "",
            "### 需求背景",
            "",
            f"```text\n{rev['bg'] or '（OMS 空）'}\n```",
            "",
            "### SOP",
            "",
            f"```text\n{rev['sop'] or '（OMS 空）'}\n```",
            "",
            "### feishuUrls",
            "",
            f"```text\n{rev['feishuUrls'] or '（OMS 空）'}\n```",
            "",
            f"- risk_notes：{rec['risk_notes']}",
            "",
        ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", default=str(XLSX))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    oms_rows = load_oms(Path(args.xlsx))
    idmap = IdMap()
    cases = []
    details = []
    reviews = []
    for i, slot in enumerate(SLOTS, start=1):
        real = slot["orderNo"]
        oms = oms_rows.get(real.upper())
        if not oms:
            raise SystemExit(f"missing OMS row {real}")
        fake = f"VASC_TGT_{i:06d}"
        idmap.add_order(real, fake)
        rec, detail, review = build_case(slot, oms, idmap, fake)
        cases.append(rec)
        details.append(detail)
        reviews.append(review)

    with (out / "smoke_12.jsonl").open("w", encoding="utf-8") as f:
        for rec in cases:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    (out / "smoke_12.details.json").write_text(
        json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_review(out / "smoke_12.review.md", reviews, cases)
    write_matrix(out / "smoke_12.matrix.md", reviews, cases)
    mapping = {
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "note": "Real VASC/EB/WI only. smoke_12.jsonl uses fake IDs.",
        "scheme": "f001_ab_l1_l4_target_smoke_12",
        **idmap.dump(),
    }
    (out / "id_mapping.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    probe = out / "_probe.json"
    if probe.exists():
        probe.unlink()
    print(f"out={out}")
    print(f"n={len(cases)}")
    for rec, rev in zip(cases, reviews):
        print(f"{rec['id']} {rev['orderNo']} {rec['target_mode']} {rec['expected_output_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
