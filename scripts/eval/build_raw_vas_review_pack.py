# -*- coding: utf-8 -*-
"""Build review packs + 10-row smoke set from scheme A outputs.

Does not enlarge eval-v0.1. Does not change runtime code.
Review packs may keep real VASC/EB/WI/feishuUrls; they must not keep
customer name / email / phone / address / company name.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(r"D:\DA\Nonsta_Valueadded_Combined")
CUT = ROOT / "_tmp" / "raw_vas_eval_cut_20260903"
XLSX = ROOT / "workspace" / "data" / "raw" / "全量_增值单接口口径事实补齐.xlsx"

FAKE_RE = re.compile(r"VASC_FAKE_\d+")
VASC_RE = re.compile(r"VASC\d{6,}", re.I)
EB_RE = re.compile(r"EB\d{10,}", re.I)
WI_RE = re.compile(r"WI\d{6,}", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)")
COMPANY_RE = re.compile(r"[\u4e00-\u9fff]{2,12}(?:有限公司|股份有限公司|公司|贸易|仓储|集团)")

STATUS_ZH = {"PD": "已完成", "CD": "已取消", "ES": "异常终止", "OD": "已下单"}

# Named 10-row smoke slots. A was missing from summary recommended lists.
SMOKE_SLOTS = [
    ("L1", "VASC_FAKE_000004", "recommended L1；描述有真实长文本，背景极短"),
    ("L1", "VASC_FAKE_000150", "recommended L1；描述极短「正常扫码入库」"),
    ("L2", "VASC_FAKE_000247", "recommended L2 负样本：覆盖/清除标签 + 无标准增值"),
    ("L2", "VASC_FAKE_000292", "recommended L2 边界：批量异常辨识 vs 直接扫描上架"),
    ("L2", "VASC_FAKE_000373", "recommended L2 边界：商品条码异常换包装+贴标"),
    ("L2", "VASC_FAKE_000714", "recommended L2 负样本：覆盖电池标签后原单上架"),
    ("L4_F001", "VASC_FAKE_000014", "recommended L4；官方 F-001 场景名"),
    ("L4_F001", "VASC_FAKE_000134", "recommended L4；官方 F-001 场景名"),
    ("A", "VASC_FAKE_000553", "推荐名单未覆盖 A，从全量候选补位；官方 A 场景名"),
    ("B", "VASC_FAKE_000055", "recommended L4 B；官方拍照暂存场景名"),
]


def cell(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = str(value).replace("\xa0", " ").strip()
    if text.lower() in {"nan", "none", "nat"}:
        return ""
    return text


def scrub_pii(text: str) -> str:
    out = EMAIL_RE.sub("[EMAIL]", text or "")
    out = PHONE_RE.sub("[PHONE]", out)
    out = COMPANY_RE.sub("[CO]", out)
    return out


def md_fence(text: str) -> str:
    body = (text or "").replace("\r\n", "\n")
    fence = "````" if "```" in body else "```"
    return f"{fence}text\n{body}\n{fence}"


def parse_recommended(summary_text: str) -> list[str]:
    return list(dict.fromkeys(FAKE_RE.findall(summary_text)))


def load_candidates(path: Path) -> dict[str, dict]:
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        fake = obj["id"].split("-")[-1]
        out[fake] = obj
    return out


def load_excel(path: Path) -> dict[str, dict]:
    df = pd.read_excel(path, sheet_name=0, dtype=object)
    rows = {}
    for rec in df.to_dict(orient="records"):
        order = cell(rec.get("orderNo"))
        if order:
            rows[order.upper()] = rec
    return rows


def reverse_map(mapping: dict) -> dict[str, str]:
    return {fake: real for real, fake in mapping["orders"].items()}


def extract_ids(blob: str) -> tuple[list[str], list[str], list[str]]:
    return (
        list(dict.fromkeys(m.upper() for m in VASC_RE.findall(blob))),
        list(dict.fromkeys(m.upper() for m in EB_RE.findall(blob))),
        list(dict.fromkeys(m.upper() for m in WI_RE.findall(blob))),
    )


def real_input_message(desc: str, bg: str, scene: str) -> str:
    parts = []
    if scene:
        parts.append(f"[场景概述]：{scene}")
    parts.append(f"[客户需求描述]：{desc}" if desc else "[客户需求描述]：（OMS 空）")
    parts.append(f"[需求背景]：{bg}" if bg else "[需求背景]：（OMS 空）")
    return "\n".join(parts)


def pack_markdown(fake: str, real: str, cand: dict, oms: dict, extra_note: str) -> str:
    desc = scrub_pii(cell(oms.get("requirementDescription")))
    bg = scrub_pii(cell(oms.get("requirementBackground")))
    sop = scrub_pii(cell(oms.get("sop")))
    audit = scrub_pii(cell(oms.get("auditTraceSupplementDesc")))
    scene = cell(oms.get("sceneOverviewName"))
    blob = "\n".join([desc, bg, sop, cell(oms.get("vasDes"))])
    _vascs, ebs, wis = extract_ids(blob + " " + real)
    status = cell(oms.get("status")).upper()
    lines = [
        f"# 核查包 `{fake}`",
        "",
        "> 内部核查包。候选态，不是正式 gold，不进入准确率分母。",
        "> 可含真实 orderNo / EB / WI / feishuUrls。不含客户名、邮箱、电话、地址、客户公司名。",
        "",
        "## 1. 候选标签",
        "",
        f"- fake_id：`{fake}`",
        f"- candidate id：`{cand.get('id', '')}`",
        f"- layer：`{cand.get('layer', '')}`",
        f"- scene_family：`{cand.get('scene_family', '')}`",
        f"- guessed_scene：`{cand.get('guessed_scene') or '—'}`",
        f"- gold_status：`{cand.get('gold_status', '')}`",
        f"- confidence：`{cand.get('confidence_expectation', '')}`",
        f"- expected_next_node：`{cand.get('expected_next_node', '')}`",
        f"- expected_output_path：`{cand.get('expected_output_path', '')}`",
        f"- expected_decision：`{cand.get('expected_decision', '')}`",
        "",
        "## 2. OMS 单据事实",
        "",
        f"- 真实 orderNo：`{real}`",
        f"- status：`{status}` / {STATUS_ZH.get(status, cell(oms.get('statusDesc')))}",
        f"- isAuditThrough：`{cell(oms.get('isAuditThrough')) or '（空）'}`",
        f"- warehouse：`{cell(oms.get('warehouseCode'))}` / {cell(oms.get('warehouseName'))}",
        f"- vasType / vaSource：`{cell(oms.get('vasType'))}` / `{cell(oms.get('vaSource'))}`",
        f"- serviceName：{cell(oms.get('serviceName')) or '（空）'}",
        f"- factSource：`{cell(oms.get('factSource'))}`",
        f"- 正文中的 EB：{'、'.join(f'`{x}`' for x in ebs) or '（未检出）'}",
        f"- 正文中的 WI：{'、'.join(f'`{x}`' for x in wis) or '（未检出）'}",
        "",
        "## 3. 需求描述",
        "",
        md_fence(desc or "（OMS 空）"),
        "",
        "## 4. 需求背景",
        "",
        md_fence(bg or "（OMS 空）"),
        "",
        "## 5. 场景名",
        "",
        f"- sceneOverviewName：{scene or '（OMS 空）'}",
        "",
        "## 6. SOP",
        "",
        md_fence(sop or "（OMS 空）"),
        "",
        "## 7. 审核轨迹",
        "",
        f"- auditTraceEventCode：`{cell(oms.get('auditTraceEventCode')) or '（空）'}`",
        "",
        md_fence(audit or "（OMS 空）"),
        "",
        "## 8. feishuUrls",
        "",
        md_fence(cell(oms.get("feishuUrls")) or "（OMS 空）"),
        "",
        f"- discussionSeqs：`{cell(oms.get('discussionSeqs'))}`",
        f"- discussionDates：`{cell(oms.get('discussionDates'))}`",
        f"- chatNames：{scrub_pii(cell(oms.get('chatNames'))) or '（空）'}",
        "",
        "## 9. 自动生成 candidate JSON",
        "",
        "```json",
        json.dumps(cand, ensure_ascii=False, indent=2),
        "```",
        "",
        "## 10. 人工复核勾选区",
        "",
        "- [ ] layer 是否正确",
        "- [ ] scene_family / guessed_scene 是否正确",
        "- [ ] 是否误套 F-001 / A / B",
        "- [ ] 是否误进正式附件 hard gate 或 generate_sop",
        "- [ ] 输入是否只含真实 OMS 字段（无假定业务句）",
        "- [ ] 可否保留为候选 / 应降级 / 可进入下一轮人工升 gold 评审",
        "",
        "复核结论：保留候选 / 降级 / 待补群聊切点 / 其他：________",
        "",
        "备注：",
        "",
        extra_note,
        "",
        f"- risk_notes：{cand.get('risk_notes', '')}",
        f"- evidence_notes：{cand.get('evidence_notes', '')}",
        "",
    ]
    return "\n".join(lines)


def build_detail(real: str, oms: dict, desc: str, bg: str) -> dict:
    service = cell(oms.get("serviceName"))
    inbound_other = "入库其他服务需求" in service
    ebs = EB_RE.findall(" ".join([desc, bg, cell(oms.get("sop"))]))
    wis = WI_RE.findall(" ".join([desc, bg, cell(oms.get("sop"))]))
    return {
        "orderNo": real,
        "listHeader": {
            "orderNo": real,
            "status": cell(oms.get("status")),
            "statusDesc": STATUS_ZH.get(cell(oms.get("status")).upper(), cell(oms.get("statusDesc"))),
            "warehouseCode": cell(oms.get("warehouseCode")),
            "warehouseName": cell(oms.get("warehouseName")),
            "vaSource": cell(oms.get("vaSource")),
            "customerCode": "",
            "customerName": "",
            "warehouse": {
                "warehouseCode": cell(oms.get("warehouseCode")),
                "warehouseName": cell(oms.get("warehouseName")),
            },
            "businessOrder": {
                "childBusinessOrders": [{"businessNo": n} for n in ebs + wis],
            },
        },
        "atoms": [
            {
                "serviceCode": "OW01V1602" if inbound_other else "",
                "serviceName": service,
                "sceneOverviewName": cell(oms.get("sceneOverviewName")),
                "sop": cell(oms.get("sop")),
                "vaAtomAttrs": [
                    {
                        "attributeKey": "VAS_ATTR_REL_RD",
                        "attributeName": "需求描述",
                        "attributeValue": desc,
                    },
                    {
                        "attributeKey": "BEOR",
                        "attributeName": "需求背景说明",
                        "attributeValue": bg,
                    },
                    {
                        "attributeKey": "VAS_ATTR_REL_NWEON",
                        "attributeName": "上架入库单号",
                        "attributeValue": wis[0] if wis else "",
                    },
                    {
                        "attributeKey": "NSVASTN",
                        "attributeName": "非标增值来源单号",
                        "attributeValue": ebs[0] if ebs else "",
                    },
                ],
                "vaAtomFiles": [],
            }
        ],
        "events": [{"eventNo": n} for n in ebs],
        "requirementDescription": desc,
        "requirementBackground": bg,
    }


def smoke_risk(slot: str, cand: dict, desc: str, bg: str) -> str:
    notes = [cand.get("risk_notes") or ""]
    if slot.startswith("L1"):
        notes.append("本轮未切开飞书/Udesk，没有真实群聊首轮表达。该条只是 OMS 缺字段 smoke，不能当 L1 金标。")
        if not desc or len(desc) < 8:
            notes.append("requirementDescription 为空或极短，input_message 只用 OMS 原文，未写假定业务句。")
        if not bg or len(bg) < 8:
            notes.append("requirementBackground 为空或极短。")
    if slot == "A":
        notes.append("推荐名单未覆盖 A，从全量 known_candidate_a 补位。A 仍是 candidate/pending，不得测正式附件 hard gate。")
    if slot == "B":
        notes.append("B 仍是 candidate/pending，不得测正式附件 hard gate。")
    notes.append("smoke 不写入 eval-v0.1，不计正式准确率。")
    return "；".join(n for n in notes if n)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cut", default=str(CUT))
    parser.add_argument("--xlsx", default=str(XLSX))
    args = parser.parse_args()
    cut = Path(args.cut)
    pack_dir = cut / "case_review_pack"
    pack_dir.mkdir(parents=True, exist_ok=True)

    summary_text = (cut / "summary.md").read_text(encoding="utf-8")
    recommended = parse_recommended(summary_text)
    a_backfill = ["VASC_FAKE_000514", "VASC_FAKE_000553"]
    pack_ids = list(dict.fromkeys(recommended + a_backfill + [s[1] for s in SMOKE_SLOTS]))

    mapping = json.loads((cut / "id_mapping.json").read_text(encoding="utf-8"))
    fake_to_real = reverse_map(mapping)
    cands = load_candidates(cut / "candidates.raw.jsonl")
    oms_rows = load_excel(Path(args.xlsx))

    index_rows = []
    for fake in pack_ids:
        real = fake_to_real.get(fake)
        cand = cands.get(fake)
        oms = oms_rows.get((real or "").upper()) if real else None
        if not real or not cand or not oms:
            continue
        extra = ""
        if fake in a_backfill and fake not in recommended:
            extra = "补位：summary 推荐名单未覆盖 known_candidate_a，本包从全量候选加入。"
        md = pack_markdown(fake, real, cand, oms, extra)
        md_path = pack_dir / f"{fake}.md"
        md_path.write_text(md, encoding="utf-8")
        rel = md_path.relative_to(ROOT).as_posix()
        index_rows.append(
            {
                "fake_id": fake,
                "orderNo": real,
                "layer": cand.get("layer", ""),
                "scene_family": cand.get("scene_family", ""),
                "sceneOverviewName": cell(oms.get("sceneOverviewName")),
                "risk_notes": cand.get("risk_notes", ""),
                "review_pack_path": rel,
                "in_summary_recommended": "Y" if fake in recommended else "N",
            }
        )

    index_path = cut / "case_review_index.csv"
    fields = [
        "fake_id",
        "orderNo",
        "layer",
        "scene_family",
        "sceneOverviewName",
        "risk_notes",
        "review_pack_path",
        "in_summary_recommended",
    ]
    with index_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(index_rows)

    smoke_jsonl = []
    smoke_details = []
    for slot, fake, why in SMOKE_SLOTS:
        real = fake_to_real[fake]
        cand = cands[fake]
        oms = oms_rows[real.upper()]
        desc = scrub_pii(cell(oms.get("requirementDescription")))
        bg = scrub_pii(cell(oms.get("requirementBackground")))
        scene = cell(oms.get("sceneOverviewName"))
        _vascs, ebs, wis = extract_ids(" ".join([desc, bg, cell(oms.get("sop")), real]))
        risk = smoke_risk(slot, cand, desc, bg)
        rec = {
            "id": f"smoke-{slot.lower()}-{fake}",
            "smoke_slot": slot,
            "pick_reason": why,
            "layer": cand["layer"],
            "scene_family": cand["scene_family"],
            "guessed_scene": cand.get("guessed_scene") or "",
            "source_type": "raw_oms_excel",
            "source_ref": cand.get("source_ref", ""),
            "gold_status": cand.get("gold_status"),
            "orderNo": real,
            "fake_id": fake,
            "input_message": real_input_message(desc, bg, scene),
            "available_context": {
                "eventNo": ebs[0] if ebs else "",
                "businessOrderNo": wis[0] if wis else "",
                "warehouseCode": cell(oms.get("warehouseCode")),
                "warehouseName": cell(oms.get("warehouseName")),
                "serviceName": cell(oms.get("serviceName")),
                "sceneName": scene,
                "attachmentStatus": {},
            },
            "oms_fields": {
                "requirementDescription": desc,
                "requirementBackground": bg,
                "sceneOverviewName": scene,
                "sop": scrub_pii(cell(oms.get("sop"))),
                "status": cell(oms.get("status")),
                "isAuditThrough": cell(oms.get("isAuditThrough")),
            },
            "expected_next_node": cand.get("expected_next_node"),
            "expected_output_path": cand.get("expected_output_path"),
            "expected_scene": cand.get("expected_scene"),
            "expected_decision": cand.get("expected_decision"),
            "expected_tools": cand.get("expected_tools"),
            "forbidden_tools": cand.get("forbidden_tools"),
            "must_not": cand.get("must_not"),
            "risk_notes": risk,
            "evidence_notes": cand.get("evidence_notes"),
            "review_pack_path": f"_tmp/raw_vas_eval_cut_20260903/case_review_pack/{fake}.md",
        }
        smoke_jsonl.append(rec)
        smoke_details.append(build_detail(real, oms, desc, bg))

    jsonl_path = cut / "llm_smoke_10.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for rec in smoke_jsonl:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    details_path = cut / "llm_smoke_10.details.json"
    details_path.write_text(json.dumps(smoke_details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    note = {
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "pack_n": len(index_rows),
        "recommended_n": len(recommended),
        "a_backfill": a_backfill,
        "smoke": [{"slot": s, "fake_id": f, "orderNo": fake_to_real[f], "why": w} for s, f, w in SMOKE_SLOTS],
        "note": "Not written to eval-v0.1. Candidate-state only.",
    }
    (cut / "llm_smoke_10.pick.json").write_text(json.dumps(note, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"pack_n={len(index_rows)}")
    print(f"index={index_path}")
    print(f"smoke={jsonl_path}")
    print(f"details={details_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
