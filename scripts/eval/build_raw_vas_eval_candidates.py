# -*- coding: utf-8 -*-
"""Cut a raw VAS eval candidate pool from the OMS wide table (scheme A).

One Excel row -> one candidate. Feishu/Udesk are not opened.
Outputs are candidate-state only: not formal gold, not accuracy denominator.
Does not modify eval-v0.1 or runtime code.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
XLSX = ROOT / "workspace" / "data" / "raw" / "全量_增值单接口口径事实补齐.xlsx"
DEFAULT_OUT = ROOT / "_tmp" / "raw_vas_eval_cut_20260903"

READ_FIELDS = [
    "orderNo",
    "status",
    "statusDesc",
    "warehouseCode",
    "warehouseName",
    "customerCode",
    "customerName",
    "vasType",
    "vaSource",
    "isAuditThrough",
    "requirementDescription",
    "requirementBackground",
    "sceneOverviewName",
    "sop",
    "vasDes",
    "serviceName",
    "auditTraceEventCode",
    "auditTraceSupplementDesc",
    "discussionSeqs",
    "discussionDates",
    "chatNames",
    "discussionServices",
    "feishuUrls",
    "factSource",
    "apiDirectCallStatus",
]

STATUS_ZH = {
    "PD": "已完成",
    "CD": "已取消",
    "ES": "异常终止",
    "OD": "已下单",
}

F001_SCENE_NAMES = {"【入库】尺重/标签辨识后换标上架"}
A_SCENE_NAMES = {"【入库】包裹类异常换商品标签上架"}
B_SCENE_NAMES = {"【入库】指定商品拍照暂存"}

F001_IDENTIFY = (
    "辨识",
    "尺重",
    "绿标",
    "露出的SKU",
    "露出的sku",
    "SKU对应",
    "混SKU",
    "混sku",
    "商品条码与包裹条码不对应",
)
F001_RELABEL = ("换标", "贴标", "补贴条码", "更换标签", "补贴商品条码", "补贴包裹标签")
F001_SHELVE = ("上架", "新入库单", "新 WI", "新WI")

A_PACKAGE_EXC = ("包裹类异常",)
A_BARCODE_PAIR = (("包裹条码正常",), ("商品条码异常",))
A_RELABEL = ("换商品标签",)
A_SHELVE = ("新入库单", "新 WI", "新WI", "上架")

B_PHOTO = ("拍照", "拍摄")
B_MARK = ("数字标识", "编号", "标识")
B_HOLD = ("暂存区", "拍照暂存", "客户确认后再处理", "等客户确认")

NEGATIVE_PHRASES = (
    "拦截不上架",
    "先放一边",
    "暂存不上架",
    "直接扫描上架",
    "库内拍照后直接上架",
    "库内拍照后上架",
    "标准增值已覆盖",
    "无需非标",
    "仅催审",
    "仅询价",
    "仅确认费用",
)
NEGATIVE_LOOSE = (
    "直接上架",
    "标准增值",
    "走标准",
    "无需非标",
    "只询价",
    "仅询价",
    "催审核",
    "仅催审",
    "确认费用",
    "确认报价",
    "上架前拦截",
)
GENERIC_REQ = (
    "帮忙处理一下",
    "帮我处理一下",
    "看下这个单",
    "看一下这个单",
    "按客户要求处理",
    "帮我看一下",
    "帮忙看一下",
    "请处理",
    "请尽快处理",
    "帮忙处理",
    "处理一下",
    "看一下",
)
GENERIC_EXACT = {"无", "无。", "/", "-", "处理", "请处理一下"}

FEE_REMINDER = "请查看预估费用"
NEED_MATERIAL = (
    "补资料",
    "补充附件",
    "请上传",
    "缺少附件",
    "未上传",
    "请提供附件",
    "资料不齐",
    "请补充",
    "附件缺失",
    "补充材料",
)
F001_KNOWN_FIELDS = ("操作说明附件", "商品和标签的对应关系", "标签文件")
MUST_NOT_CONTAIN_L4 = ["审核通过", "自动批准", "公开价", "1个工作日"]
THREE_SCENES = [
    "inbound_label_identify",
    "inbound_package_exception_relabel_shelving",
    "inbound_photo_hold",
]

VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)")
COMPANY_RE = re.compile(r"[\u4e00-\u9fff]{2,12}(?:有限公司|股份有限公司|公司|贸易|仓储|集团)")
SPACE_RE = re.compile(r"\s+")

SHORT_LEN = 8
PREVIEW_LEN = 160
SOP_REASONABLE = (40, 480)


def cell(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    text = str(value).replace("\xa0", " ").strip()
    if text.lower() in {"nan", "none", "nat"}:
        return ""
    return text


def compact(text: str) -> str:
    return SPACE_RE.sub(" ", text or "").strip()


def is_short(text: str) -> bool:
    t = compact(text)
    return (not t) or (len(t) < SHORT_LEN) or (t in GENERIC_EXACT)


def is_generic_req(text: str) -> bool:
    t = compact(text)
    if not t:
        return False
    if t in GENERIC_EXACT:
        return True
    return any(t == g or t.startswith(g) and len(t) <= len(g) + 4 for g in GENERIC_REQ)


def count_urls(text: str) -> int:
    return len(re.findall(r"https?://", text or "", flags=re.I))


def scene_scope(scene_name: str) -> str:
    if scene_name.startswith("【入库】") or scene_name.startswith("入库"):
        return "inbound"
    if scene_name.startswith("【库内】"):
        return "inhouse"
    if scene_name.startswith("【出库】"):
        return "outbound"
    if scene_name.startswith("【尾程】"):
        return "lastmile"
    return "unknown"


def contains_any(text: str, needles: tuple[str, ...] | list[str]) -> bool:
    return any(n and n in text for n in needles)


def detect_signals(blob: str, scene_name: str, vas_type: str) -> dict:
    official_f001 = scene_name in F001_SCENE_NAMES
    official_a = scene_name in A_SCENE_NAMES
    official_b = scene_name in B_SCENE_NAMES
    scope = scene_scope(scene_name)

    identify = contains_any(blob, F001_IDENTIFY)
    relabel = contains_any(blob, F001_RELABEL)
    shelve = contains_any(blob, F001_SHELVE)
    text_f001 = identify and relabel and shelve and scope in {"inbound", "unknown"}

    a_exc = contains_any(blob, A_PACKAGE_EXC) or (
        contains_any(blob, A_BARCODE_PAIR[0]) and contains_any(blob, A_BARCODE_PAIR[1])
    )
    a_relabel = contains_any(blob, A_RELABEL)
    a_shelve = contains_any(blob, A_SHELVE)
    text_a = a_exc and a_relabel and a_shelve and scope in {"inbound", "unknown"}

    photo = contains_any(blob, B_PHOTO)
    mark = contains_any(blob, B_MARK)
    hold = contains_any(blob, B_HOLD)
    text_b = photo and mark and hold and scope in {"inbound", "unknown"}
    photo_only = photo and not hold and scope in {"inbound", "unknown"}

    neg = contains_any(blob, NEGATIVE_PHRASES)
    if vas_type == "STANDARD_VASC":
        neg = True
    if (not neg) and contains_any(blob, NEGATIVE_LOOSE) and not (text_f001 or official_f001):
        if any(p in blob for p in ("直接上架", "拦截", "标准增值", "无需非标", "仅询价", "仅催审", "确认费用")):
            neg = True

    return {
        "official_f001": official_f001,
        "official_a": official_a,
        "official_b": official_b,
        "text_f001": text_f001,
        "text_a": text_a,
        "text_b": text_b,
        "photo_only": photo_only,
        "neg": neg,
        "scope": scope,
        "identify": identify,
        "relabel": relabel,
        "shelve": shelve,
        "photo": photo,
        "hold": hold,
    }


def assign_scene_family(sig: dict, scene_name: str, sop: str, audit_y: bool, completed: bool) -> tuple[str, str, str]:
    positive = []
    if sig["official_f001"] or sig["text_f001"]:
        positive.append("f001")
    if sig["official_a"] or sig["text_a"]:
        positive.append("a")
    if sig["official_b"] or sig["text_b"]:
        positive.append("b")

    unique_pos = list(dict.fromkeys(positive))
    if len(unique_pos) > 1:
        return "manual_review_needed", "", "medium"
    if unique_pos and sig["neg"]:
        return "manual_review_needed", "", "low"
    if sig["photo_only"] and not unique_pos:
        return "manual_review_needed", "inbound_photo_hold", "low"

    if unique_pos == ["f001"]:
        return "known_supported_f001", "inbound_label_identify", "high" if sig["official_f001"] or sig["text_f001"] else "medium"
    if unique_pos == ["a"]:
        return "known_candidate_a", "inbound_package_exception_relabel_shelving", "high" if sig["official_a"] else "medium"
    if unique_pos == ["b"]:
        if sig["official_b"] and not sig["hold"] and not sig["text_b"]:
            return "manual_review_needed", "inbound_photo_hold", "low"
        return "known_candidate_b", "inbound_photo_hold", "high" if sig["text_b"] else "medium"
    if sig["neg"]:
        return "negative_or_unsupported_candidate", "", "high"

    has_scene_or_sop = bool(scene_name or sop)
    if has_scene_or_sop and (audit_y or completed):
        return "unknown_scene_candidate", "", "medium"
    return "manual_review_needed", "", "low"


def oms_requirement_insufficient(desc: str, bg: str) -> bool:
    return is_short(desc) or is_short(bg) or is_generic_req(desc)


def materials_incomplete(sop: str, audit: str) -> tuple[bool, list[str], str]:
    reasons = []
    if not compact(sop):
        reasons.append("sop为空")
    if any(k in audit for k in NEED_MATERIAL) and FEE_REMINDER not in audit:
        reasons.append("审核说明要求补资料")
        mentioned = [f for f in F001_KNOWN_FIELDS if f in audit]
        return True, mentioned, "；".join(reasons)
    return bool(reasons), [], "；".join(reasons)


def assign_layer(desc: str, bg: str, scene_name: str, sop: str, audit: str, feishu_n: int, family: str, guessed: str) -> tuple[str, str]:
    if oms_requirement_insufficient(desc, bg) or is_generic_req(desc):
        note = []
        if is_short(desc) or is_generic_req(desc):
            note.append("requirementDescription为空/极短/泛化")
        if is_short(bg):
            note.append("requirementBackground为空/极短")
        if feishu_n and (is_short(desc) or is_short(bg)):
            note.append("有feishuUrls但OMS需求字段不足")
        return "L1_requirement_incomplete", "；".join(note)

    f001 = family == "known_supported_f001" or guessed == "inbound_label_identify"
    if f001:
        incomplete, _mentioned, why = materials_incomplete(sop, audit)
        if incomplete:
            return "L3_materials_incomplete", why or "F-001命中但资料不齐"

    if (
        compact(desc)
        and compact(bg)
        and compact(scene_name)
        and compact(sop)
        and True
    ):
        # L4 still requires isAuditThrough=Y; caller passes that via extra flag in wrapper
        pass
    return "", ""


def assign_gold_status(
    status: str,
    audit_y: bool,
    audit_n: bool,
    event: str,
    desc: str,
    bg: str,
    sop: str,
    family: str,
    layer: str,
) -> str:
    rejected = (
        status in {"CD", "ES"}
        or audit_n
        or ("不通过" in event)
        or ("取消" in event)
    )
    if rejected:
        return "reject_candidate"
    if status == "OD" or (status not in {"PD", "CD", "ES"} and not audit_y):
        return "shadow_candidate"
    complete = bool(compact(desc) and compact(bg) and compact(sop))
    scene_clear = family in {
        "known_supported_f001",
        "known_candidate_a",
        "known_candidate_b",
        "unknown_scene_candidate",
        "negative_or_unsupported_candidate",
    }
    if status == "PD" and audit_y and complete and scene_clear and layer == "L4_end_to_end":
        return "gold_candidate"
    return "derived_candidate"


def sop_keywords(sop: str, guessed: str, scene_name: str) -> list[str]:
    preferred = []
    pool = [
        "辨识",
        "尺重",
        "绿标",
        "换标",
        "贴标",
        "补贴",
        "上架",
        "暂存",
        "拍照",
        "数字标识",
        "包裹类异常",
        "换商品标签",
        "拦截",
        "直接上架",
    ]
    for w in pool:
        if w in sop and w not in preferred:
            preferred.append(w)
    if scene_name and 2 <= len(scene_name) <= 16 and scene_name not in preferred:
        # do not hard-match long official names
        pass
    if guessed == "inbound_label_identify" and "辨识" not in preferred and "辨识" in sop:
        preferred.insert(0, "辨识")
    return preferred[:4]


def build_expectations(layer: str, family: str, guessed: str, sop: str) -> dict:
    three = list(THREE_SCENES)
    if layer == "L1_requirement_incomplete":
        return {
            "expected_next_node": "check-requirement",
            "expected_output_path": "needs_requirement_clarification",
            "expected_scene": "",
            "expected_topk_contains": [],
            "expected_decision": "unsupported",
            "expected_tools": ["check-requirement"],
            "forbidden_tools": ["match-template", "generate_sop"],
            "must_not": three,
            "must_contain": ["对象或单据", "动作或去向"],
            "must_not_contain": ["SOP", "审核通过"],
        }
    if layer == "L3_materials_incomplete":
        return {
            "expected_next_node": "check-completeness",
            "expected_output_path": "needs_field_clarification",
            "expected_scene": "inbound_label_identify",
            "expected_topk_contains": ["inbound_label_identify"],
            "expected_decision": "supported",
            "expected_tools": ["check-requirement", "match-template", "check-completeness"],
            "forbidden_tools": ["generate_sop"],
            "must_not": ["inbound_photo_hold"],
            "must_contain": [],
            "must_not_contain": ["已生成SOP", "审核通过"],
        }
    if layer == "L4_end_to_end":
        tools = ["check-requirement", "match-template"]
        if family == "known_supported_f001":
            tools.extend(["check-completeness", "generate_sop"])
        decision = "unsupported" if family == "negative_or_unsupported_candidate" else "supported"
        if family == "manual_review_needed":
            decision = "ambiguous"
        path = "transfer_human" if family in {"negative_or_unsupported_candidate", "known_candidate_a", "known_candidate_b", "manual_review_needed"} else "sop_generated"
        must_not = []
        if family == "known_supported_f001":
            must_not = ["inbound_photo_hold"]
        elif family == "known_candidate_a":
            must_not = ["inbound_photo_hold"]
        elif family == "known_candidate_b":
            must_not = ["inbound_label_identify", "inbound_package_exception_relabel_shelving"]
        elif family == "negative_or_unsupported_candidate":
            must_not = list(three)
        return {
            "expected_next_node": "format-output" if path == "sop_generated" else "match-template",
            "expected_output_path": path,
            "expected_scene": guessed,
            "expected_topk_contains": [guessed] if guessed else [],
            "expected_decision": decision,
            "expected_tools": tools if path == "sop_generated" else ["check-requirement", "match-template"],
            "forbidden_tools": [] if (family == "known_supported_f001" and path == "sop_generated") else ["generate_sop"],
            "must_not": must_not,
            "must_contain": sop_keywords(sop, guessed, ""),
            "must_not_contain": list(MUST_NOT_CONTAIN_L4),
        }

    # L2
    decision = "unsupported"
    topk = []
    must_not = []
    if family == "known_supported_f001":
        decision = "supported"
        topk = ["inbound_label_identify"]
        must_not = ["inbound_photo_hold"]
    elif family == "known_candidate_a":
        decision = "supported"
        topk = ["inbound_package_exception_relabel_shelving"]
        must_not = ["inbound_photo_hold"]
    elif family == "known_candidate_b":
        decision = "supported"
        topk = ["inbound_photo_hold"]
        must_not = ["inbound_label_identify", "inbound_package_exception_relabel_shelving"]
    elif family == "manual_review_needed":
        decision = "ambiguous"
        if guessed:
            topk = [guessed]
        must_not = []
    elif family == "unknown_scene_candidate":
        decision = "unsupported"
        must_not = list(three)
    else:
        decision = "unsupported"
        must_not = list(three)
    return {
        "expected_next_node": "match-template",
        "expected_output_path": "transfer_human",
        "expected_scene": guessed,
        "expected_topk_contains": topk,
        "expected_decision": decision,
        "expected_tools": ["check-requirement", "match-template"],
        "forbidden_tools": ["generate_sop"],
        "must_not": must_not,
        "must_contain": [],
        "must_not_contain": ["正式附件必填", "审核通过"],
    }


class IdMap:
    def __init__(self) -> None:
        self.order: dict[str, str] = {}
        self.eb: dict[str, str] = {}
        self.wi: dict[str, str] = {}
        self._order_n = 0
        self._eb_n = 0
        self._wi_n = 0

    def fake_order(self, real: str) -> str:
        key = real.upper()
        if key not in self.order:
            self._order_n += 1
            self.order[key] = f"VASC_FAKE_{self._order_n:06d}"
        return self.order[key]

    def _seq(self, store: dict[str, str], real: str, prefix: str, attr: str) -> str:
        key = real.upper()
        if key not in store:
            n = getattr(self, attr) + 1
            setattr(self, attr, n)
            store[key] = f"{prefix}_{n:06d}"
        return store[key]

    def replace(self, text: str) -> str:
        if not text:
            return ""
        out = text
        for m in VASC_RE.findall(out):
            out = re.sub(re.escape(m), self.fake_order(m), out, flags=re.I)
        for m in EB_RE.findall(out):
            out = re.sub(re.escape(m), self._seq(self.eb, m, "EB_FAKE", "_eb_n"), out, flags=re.I)
        for m in WI_RE.findall(out):
            out = re.sub(re.escape(m), self._seq(self.wi, m, "WI_FAKE", "_wi_n"), out, flags=re.I)
        out = EMAIL_RE.sub("[EMAIL]", out)
        out = PHONE_RE.sub("[PHONE]", out)
        out = COMPANY_RE.sub("[CO]", out)
        return out

    def dump(self) -> dict:
        return {
            "orders": dict(sorted(self.order.items())),
            "eb": dict(sorted(self.eb.items())),
            "wi": dict(sorted(self.wi.items())),
        }


def preview(text: str, n: int = PREVIEW_LEN) -> str:
    t = compact(text)
    return t if len(t) <= n else t[: n - 1] + "…"


def rank_score(row: dict) -> float:
    desc = row["desc"]
    bg = row["bg"]
    scene = row["scene_name"]
    sop = row["sop"]
    audit = row["audit"]
    score = 0.0
    if desc:
        score += 3
    if bg:
        score += 3
    if desc and bg:
        score += 2
    if scene:
        score += 2
    sop_n = len(sop)
    if SOP_REASONABLE[0] <= sop_n <= SOP_REASONABLE[1]:
        score += 3
    elif sop_n > SOP_REASONABLE[1]:
        score += 1
    elif sop_n >= 20:
        score += 0.5
    if audit and FEE_REMINDER not in audit:
        score += 2
    score += min(row["feishu_n"], 3) * 0.4
    if row["family"] == "unknown_scene_candidate":
        score += 0.3
    if row["gold"] == "gold_candidate":
        score += 5
    elif row["gold"] == "reject_candidate":
        score -= 1.5
    if row["status"] == "PD":
        score += 2
    return score


def fingerprint(row: dict) -> str:
    return compact(f"{row['scene_name']}|{row['desc'][:80]}|{row['bg'][:80]}|{row['family']}")


def pick_unique(rows: list[dict], limit: int) -> list[dict]:
    seen: set[str] = set()
    out = []
    for r in sorted(rows, key=lambda x: (-x["rank"], x["fake_order"])):
        fp = fingerprint(r)
        if fp in seen:
            continue
        seen.add(fp)
        out.append(r)
        if len(out) >= limit:
            break
    return out


def build_input_message(layer: str, warehouse: str, vas_type: str, service: str, scene: str, desc: str, bg: str) -> str:
    if layer == "L1_requirement_incomplete":
        body = desc or "看下这个单"
        return compact(body)
    parts = [
        "[系统背景]：客户在 Winit 系统发起了增值服务申请。",
        f"[仓库信息]：{warehouse or '（未填）'}",
        f"[业务类型]：{vas_type or '（未填）'}/{service or '（未填）'}",
        f"[场景概述]：{scene or '（未填）'}",
        f"[客户需求描述]：{desc or '（未填）'}",
        f"[需求背景]：{bg or '（未填）'}",
        "请开始核查该单据当前状态，并判断下一步动作。",
    ]
    return "\n".join(parts)


def load_wide_table(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"missing OMS wide table: {path}")
    df = pd.read_excel(path, sheet_name=0, dtype=object)
    missing = [c for c in READ_FIELDS if c not in df.columns]
    if missing:
        raise ValueError(f"wide table missing columns: {missing}")
    return df


def cut_row(i: int, raw: dict, idmap: IdMap) -> dict:
    order_real = cell(raw["orderNo"])
    fake_order = idmap.fake_order(order_real) if order_real else f"VASC_FAKE_{i:06d}"
    status = cell(raw["status"]).upper()
    status_desc = cell(raw["statusDesc"]).upper() or status
    warehouse_code = cell(raw["warehouseCode"])
    warehouse_name = cell(raw["warehouseName"])
    vas_type = cell(raw["vasType"])
    audit_flag = cell(raw["isAuditThrough"]).upper()
    desc = cell(raw["requirementDescription"])
    bg = cell(raw["requirementBackground"])
    scene_name = cell(raw["sceneOverviewName"])
    sop = cell(raw["sop"])
    service = cell(raw["serviceName"])
    event = cell(raw["auditTraceEventCode"])
    audit = cell(raw["auditTraceSupplementDesc"])
    feishu = cell(raw["feishuUrls"])
    feishu_n = count_urls(feishu)
    blob = "\n".join([desc, bg, scene_name, sop, audit, cell(raw["vasDes"]), service])
    sig = detect_signals(blob, scene_name, vas_type)
    audit_y = audit_flag == "Y"
    audit_n = audit_flag == "N"
    completed = status == "PD"
    family, guessed, conf = assign_scene_family(sig, scene_name, sop, audit_y, completed)

    if oms_requirement_insufficient(desc, bg) or is_generic_req(desc):
        layer, layer_note = assign_layer(desc, bg, scene_name, sop, audit, feishu_n, family, guessed)
    elif family == "known_supported_f001" and materials_incomplete(sop, audit)[0]:
        layer, layer_note = "L3_materials_incomplete", materials_incomplete(sop, audit)[2]
    elif compact(desc) and compact(bg) and compact(scene_name) and compact(sop) and audit_y:
        layer, layer_note = "L4_end_to_end", "需求/背景/场景/SOP齐全且审核通过"
    else:
        reasons = []
        if not scene_name:
            reasons.append("sceneOverviewName为空")
        if family == "unknown_scene_candidate":
            reasons.append("不属于当前F-001/A/B三张card")
        if family == "negative_or_unsupported_candidate":
            reasons.append("出现不应自动支持信号")
        if family == "manual_review_needed":
            reasons.append("场景边界模糊或信号冲突")
        if family in {"known_candidate_a", "known_candidate_b"}:
            reasons.append("A/B仅测L2分流，不得测正式附件hard gate")
        if not reasons:
            reasons.append("未达L4齐全条件，进入分流层")
        layer, layer_note = "L2_template_routing", "；".join(reasons)

    gold = assign_gold_status(status, audit_y, audit_n, event, desc, bg, sop, family, layer)
    exp = build_expectations(layer, family, guessed, sop)

    desc_d = idmap.replace(desc)
    bg_d = idmap.replace(bg)
    sop_d = idmap.replace(sop)
    audit_d = idmap.replace(audit)
    input_message = build_input_message(layer, warehouse_name, vas_type, service, scene_name, desc_d, bg_d)

    mentioned = []
    if layer == "L3_materials_incomplete":
        mentioned = materials_incomplete(sop, audit)[1]
    attachment_status = {}
    missing_note = ""
    if layer == "L3_materials_incomplete":
        if mentioned:
            attachment_status = {k: "missing" for k in mentioned}
            missing_note = "missingAttachments仅来自审核说明点名的已定义字段"
        else:
            missing_note = "宽表无附件列，未编造F-001三必填"

    ebs = [idmap._seq(idmap.eb, m, "EB_FAKE", "_eb_n") for m in EB_RE.findall(" ".join([desc, bg, sop]))]
    wis = [idmap._seq(idmap.wi, m, "WI_FAKE", "_wi_n") for m in WI_RE.findall(" ".join([desc, bg, sop]))]

    layer_tag = {
        "L1_requirement_incomplete": "l1",
        "L2_template_routing": "l2",
        "L3_materials_incomplete": "l3",
        "L4_end_to_end": "l4",
    }[layer]
    cand_id = f"auto-{layer_tag}-{fake_order}"
    source_ref = f"workspace/data/raw/全量_增值单接口口径事实补齐.xlsx#sheet0#row{i + 2}#{fake_order}"
    if feishu_n:
        source_ref += f"#feishuUrls={feishu_n}"

    risk = layer_note
    extra_risk = []
    if family in {"known_candidate_a", "known_candidate_b"}:
        extra_risk.append("A/B为candidate/pending，不得当正式gold，不得进正式附件hard gate")
    if family == "unknown_scene_candidate":
        extra_risk.append("未知场景，保留作后续scenario card候选")
    if gold != "gold_candidate":
        extra_risk.append("候选态，不进入正式准确率分母")
    if missing_note:
        extra_risk.append(missing_note)
    if extra_risk:
        risk = "；".join([p for p in [risk, *extra_risk] if p])

    evidence = []
    if scene_name:
        evidence.append(f"sceneOverviewName={scene_name}")
    if sig["official_f001"]:
        evidence.append("官方F-001场景名")
    if sig["text_f001"]:
        evidence.append("正文命中F-001三组信号")
    if sig["official_a"] or sig["text_a"]:
        evidence.append("命中场景A信号")
    if sig["official_b"] or sig["text_b"]:
        evidence.append("命中场景B信号")
    if sig["neg"]:
        evidence.append("命中负向/不支持信号")
    evidence.append(f"status={status}/{STATUS_ZH.get(status, status)}")
    evidence.append(f"isAuditThrough={audit_flag or 'empty'}")

    return {
        "id": cand_id,
        "excel_row": i + 2,
        "fake_order": fake_order,
        "layer": layer,
        "family": family,
        "guessed": guessed,
        "gold": gold,
        "status": status,
        "status_zh": STATUS_ZH.get(status, status_desc),
        "audit_flag": audit_flag,
        "event": event,
        "desc": desc_d,
        "bg": bg_d,
        "scene_name": scene_name,
        "sop": sop_d,
        "audit": audit_d,
        "service": service,
        "vas_type": vas_type,
        "warehouse_name": warehouse_name,
        "warehouse_code": warehouse_code,
        "feishu_n": feishu_n,
        "source_ref": source_ref,
        "input_message": input_message,
        "confidence": conf,
        "risk": risk,
        "evidence": "；".join(evidence),
        "exp": exp,
        "attachment_status": attachment_status,
        "event_no": ebs[0] if ebs else "",
        "biz_no": wis[0] if wis else "",
        "cancel_reason": event if gold == "reject_candidate" else "",
        "sig": sig,
    }


def to_candidate(row: dict) -> dict:
    exp = row["exp"]
    return {
        "id": row["id"],
        "layer": row["layer"],
        "scene_family": row["family"],
        "guessed_scene": row["guessed"],
        "source_type": "raw_oms_excel",
        "source_ref": row["source_ref"],
        "gold_status": row["gold"],
        "final_order_status": row["status_zh"],
        "approval_result": {"Y": "通过", "N": "不通过"}.get(row["audit_flag"], ""),
        "cancel_or_reject_reason": row["cancel_reason"],
        "input_message": row["input_message"],
        "available_context": {
            "eventNo": row["event_no"],
            "businessOrderNo": row["biz_no"],
            "warehouseCode": row["warehouse_code"],
            "warehouseName": row["warehouse_name"],
            "serviceName": row["service"],
            "sceneName": row["scene_name"],
            "attachmentStatus": row["attachment_status"],
        },
        "expected_next_node": exp["expected_next_node"],
        "expected_output_path": exp["expected_output_path"],
        "expected_scene": exp["expected_scene"] or None,
        "expected_topk_contains": exp["expected_topk_contains"],
        "expected_decision": exp["expected_decision"],
        "confidence_expectation": row["confidence"],
        "must_not": exp["must_not"],
        "expected_tools": exp["expected_tools"],
        "forbidden_tools": exp["forbidden_tools"],
        "must_contain": exp["must_contain"],
        "must_not_contain": exp["must_not_contain"],
        "risk_notes": row["risk"],
        "evidence_notes": row["evidence"],
    }


def write_review_csv(path: Path, rows: list[dict]) -> None:
    fields = [
        "orderNo_fake",
        "layer",
        "scene_family",
        "guessed_scene",
        "gold_status",
        "confidence",
        "risk_notes",
        "input_message_preview",
        "requirementDescription_preview",
        "requirementBackground_preview",
        "sceneOverviewName",
        "sop_preview",
        "auditTraceSupplementDesc_preview",
        "source_ref",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow(
                {
                    "orderNo_fake": r["fake_order"],
                    "layer": r["layer"],
                    "scene_family": r["family"],
                    "guessed_scene": r["guessed"],
                    "gold_status": r["gold"],
                    "confidence": r["confidence"],
                    "risk_notes": preview(r["risk"], 220),
                    "input_message_preview": preview(r["input_message"]),
                    "requirementDescription_preview": preview(r["desc"]),
                    "requirementBackground_preview": preview(r["bg"]),
                    "sceneOverviewName": r["scene_name"],
                    "sop_preview": preview(r["sop"]),
                    "auditTraceSupplementDesc_preview": preview(r["audit"]),
                    "source_ref": r["source_ref"],
                }
            )


def md_table(rows: list[dict]) -> str:
    lines = [
        "| fake_id | layer | scene_family | guessed_scene | gold_status | sceneOverviewName | risk |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        scene = (r["scene_name"] or "（空）").replace("|", "/")
        risk = preview(r["risk"], 80).replace("|", "/")
        lines.append(
            f"| `{r['fake_order']}` | {r['layer']} | {r['family']} | {r['guessed'] or '—'} | {r['gold']} | {scene} | {risk} |"
        )
    return "\n".join(lines)


def write_summary(path: Path, rows: list[dict], n_src: int) -> dict:
    layer_c = Counter(r["layer"] for r in rows)
    fam_c = Counter(r["family"] for r in rows)
    gold_c = Counter(r["gold"] for r in rows)
    unknown_scenes = Counter(
        r["scene_name"] or "（空场景名）"
        for r in rows
        if r["family"] == "unknown_scene_candidate"
    )
    l1 = [r for r in rows if r["layer"] == "L1_requirement_incomplete"]
    l2 = [r for r in rows if r["layer"] == "L2_template_routing"]
    l3 = [r for r in rows if r["layer"] == "L3_materials_incomplete"]
    l4 = [r for r in rows if r["layer"] == "L4_end_to_end"]
    l2_bound = [
        r
        for r in l2
        if r["family"]
        in {
            "negative_or_unsupported_candidate",
            "manual_review_needed",
            "known_candidate_a",
            "known_candidate_b",
        }
    ]
    rec_l4 = pick_unique(l4, 30)
    rec_l3 = pick_unique(l3, 30)
    rec_l2 = pick_unique(l2_bound or l2, 30)
    rec_l1 = pick_unique(l1, 20)

    rec_unknown = []
    by_scene: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        if r["family"] == "unknown_scene_candidate" and r["scene_name"]:
            by_scene[r["scene_name"]].append(r)
    for name, _n in unknown_scenes.most_common():
        if name == "（空场景名）":
            continue
        rec_unknown.extend(pick_unique(by_scene.get(name, []), 2))
        if len(rec_unknown) >= 30:
            break
    rec_unknown = rec_unknown[:30]

    rec_l4_f001 = pick_unique(
        [r for r in l4 if r["family"] == "known_supported_f001" and r["gold"] == "gold_candidate"],
        3,
    )
    rec_l4_ab = pick_unique(
        [r for r in l4 if r["family"] in {"known_candidate_a", "known_candidate_b"} and r["gold"] == "gold_candidate"],
        2,
    )
    rec_l4_unknown_gold = pick_unique(
        [r for r in rec_unknown if r["layer"] == "L4_end_to_end" and r["gold"] == "gold_candidate"]
        or [r for r in rec_l4 if r["family"] == "unknown_scene_candidate" and r["gold"] == "gold_candidate"],
        3,
    )
    top10 = []
    for bucket in (rec_l4_unknown_gold, rec_l4_f001, rec_l4_ab, rec_l3, rec_l2, rec_l1):
        for r in bucket:
            if r["fake_order"] not in {x["fake_order"] for x in top10}:
                top10.append(r)
            if len(top10) >= 10:
                break
        if len(top10) >= 10:
            break

    negatives = [
        r
        for r in rows
        if r["family"] == "negative_or_unsupported_candidate"
        and (r["sig"]["neg"] or r["vas_type"] == "STANDARD_VASC")
    ]
    rec_neg = pick_unique(negatives, 15)

    lines = [
        "# 原始增值单评测候选池（方案 A）",
        "",
        f"- 生成时间：{datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')}",
        f"- 主表：`workspace/data/raw/全量_增值单接口口径事实补齐.xlsx` 第一张宽表",
        f"- 源行数 / 候选数：{n_src} / {len(rows)}（一单一候选）",
        "- 本池全部是候选态，**不是**正式 gold，**不进入**正式准确率分母",
        "- 未改 `internal-review-copilot/eval/datasets/eval-v0.1/candidates.jsonl`，未改运行时代码",
        "- 飞书/Udesk 本轮未切开；`feishuUrls` 只作排序加分和 `source_ref` 线索",
        "",
        "## layer 分布",
        "",
        "| layer | n |",
        "|---|---:|",
    ]
    for k in [
        "L1_requirement_incomplete",
        "L2_template_routing",
        "L3_materials_incomplete",
        "L4_end_to_end",
    ]:
        lines.append(f"| `{k}` | {layer_c.get(k, 0)} |")
    lines += [
        "",
        "## scene_family 分布",
        "",
        "| scene_family | n |",
        "|---|---:|",
    ]
    for k in [
        "known_supported_f001",
        "known_candidate_a",
        "known_candidate_b",
        "unknown_scene_candidate",
        "negative_or_unsupported_candidate",
        "manual_review_needed",
    ]:
        lines.append(f"| `{k}` | {fam_c.get(k, 0)} |")
    lines += [
        "",
        "## gold_status 分布（均为候选态）",
        "",
        "| gold_status | n |",
        "|---|---:|",
    ]
    for k in ["gold_candidate", "derived_candidate", "shadow_candidate", "reject_candidate"]:
        lines.append(f"| `{k}` | {gold_c.get(k, 0)} |")
    lines += [
        "",
        "## 推荐人工优先复核（前 10）",
        "",
        md_table(top10),
        "",
        "### L4 主路径候选（最多 30）",
        "",
        md_table(rec_l4) if rec_l4 else "（无）",
        "",
        "### L3 缺资料候选（最多 30，仅 F-001）",
        "",
        md_table(rec_l3) if rec_l3 else "（无）",
        "",
        "### L2 负样本/边界候选（最多 30）",
        "",
        md_table(rec_l2) if rec_l2 else "（无）",
        "",
        "### L1 需求不完整候选（最多 20）",
        "",
        md_table(rec_l1) if rec_l1 else "（无）",
        "",
        "## 高频未知场景（unknown_scene_candidate）",
        "",
        "| sceneOverviewName | n |",
        "|---|---:|",
    ]
    for name, n in unknown_scenes.most_common(25):
        lines.append(f"| {name.replace('|', '/')} | {n} |")
    lines += [
        "",
        "### 每个高频未知场景推荐 1–2 条",
        "",
        md_table(rec_unknown) if rec_unknown else "（无）",
        "",
        "## 高价值负样本",
        "",
        md_table(rec_neg) if rec_neg else "（无）",
        "",
        "## 不能自动变成正式 gold 的原因",
        "",
        "1. 本池是规则剪切，没有逐条人工核验作业是否等于场景定义。",
        "2. A/B 仍是 candidate/pending：即使字段齐全，也不能进正式附件 hard gate，也不能当正式 gold。",
        "3. `gold_candidate` 只表示「历史通过且文本较完整、场景看起来明确」，升 gold 仍要回到 OMS 事实看终态、人工 SOP、取消/驳回原因。",
        "4. 宽表 `statusDesc` 是 PD/CD/ES/OD 码，不是中文结论；取消/终止单多数没有可引用的原因正文。",
        "5. 宽表没有附件列，L3 不能证明「当时缺哪份附件」，不能编造 F-001 三必填。",
        "6. 全表都有 `feishuUrls`，但本轮未切开群聊，L1 不是真实首轮表达，只是 OMS 字段残缺。",
        "7. 库内/出库/尾程大量场景与 F-001 关键词部分重叠，只能标 unknown，不能靠场景名自动升 gold。",
        "8. `derived` / `shadow` / `reject` 按已确认口径都不进正式准确率分母。",
        "",
        "## 本轮实现备注",
        "",
        f"- 「极短」阈值按 `< {SHORT_LEN}` 字处理。",
        "- 互斥分层：L1 → L3（仅 F-001）→ L4（四字段齐全且 `isAuditThrough=Y`）→ 其余 L2。",
        "- 官方场景名与正文信号冲突、或 F-001/A/B 抢信号时，标 `manual_review_needed`。",
        "- 库内/出库场景名不会仅因「辨识+贴标+上架」被标成 F-001。",
        "- 推荐名单已按字段完整度 / SOP 合理长度 / 非模板审核说明去重排序。",
        "- 本表 968 行全部带飞书链接，排序项「有 feishuUrls」区分度很低。",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {
        "n": len(rows),
        "layer": dict(layer_c),
        "scene_family": dict(fam_c),
        "gold_status": dict(gold_c),
        "top10": [r["fake_order"] for r in top10],
        "top10_rows": top10,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build raw VAS eval candidates (scheme A)")
    parser.add_argument("--xlsx", default=str(XLSX))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    xlsx = Path(args.xlsx)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = load_wide_table(xlsx)
    idmap = IdMap()
    rows: list[dict] = []
    for i, rec in enumerate(df.to_dict(orient="records")):
        cut = cut_row(i, rec, idmap)
        cut["rank"] = 0.0
        rows.append(cut)
    for r in rows:
        r["rank"] = rank_score(r)

    jsonl_path = out_dir / "candidates.raw.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(to_candidate(r), ensure_ascii=False) + "\n")

    write_review_csv(out_dir / "review_table.csv", rows)
    stats = write_summary(out_dir / "summary.md", rows, len(df))
    mapping = {
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "scheme": "A",
        "source": str(xlsx).replace("\\", "/"),
        "note": "Real VASC/EB/WI stay here only. candidates.raw.jsonl uses fake IDs.",
        **idmap.dump(),
    }
    (out_dir / "id_mapping.json").write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"out={out_dir}")
    print(f"n={stats['n']}")
    print("layer=" + json.dumps(stats["layer"], ensure_ascii=False))
    print("scene_family=" + json.dumps(stats["scene_family"], ensure_ascii=False))
    print("gold_status=" + json.dumps(stats["gold_status"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
