# -*- coding: utf-8 -*-
"""OMS scene -> VASC -> EB/WI -> Udesk reverse lookup for F-001."""
from __future__ import annotations

import csv
import json
import os
import re
from collections import defaultdict

ROOT = r"D:\DA\Nonsta_Valueadded_Combined"
SCENE = "【入库】尺重/标签辨识后换标上架"
SCENE_KEY = "尺重/标签辨识后换标上架"
REPULL = r"D:\DA\outputs\value_added_related_probe\all_interface_repull.json"
CACHE = os.path.join(ROOT, r"_runs\20260829_udesk_sample\oms_vasc_scene_cache.json")
CSV = os.path.join(ROOT, r"workspace\data\raw\data_udesk_log_database_增值.csv")
OUT_DIR = os.path.join(ROOT, r"agent-inventory-assist\03_evaluation\datasets\oms-scene-f001-v0.1")
RUN_DIR = os.path.join(ROOT, r"_runs\20260831_oms_scene_f001")


def load_scene_vascs():
    by = {}
    if os.path.exists(REPULL):
        j = json.load(open(REPULL, encoding="utf-8"))
        for a in j.get("vaAtomRows") or []:
            s = a.get("sceneOverviewName") or ""
            if SCENE_KEY not in s:
                continue
            no = a.get("orderNo")
            if not no:
                continue
            row = by.setdefault(
                no,
                {
                    "vasc": no,
                    "sceneOverviewName": s,
                    "sop": a.get("sop") or "",
                    "serviceName": a.get("serviceName"),
                    "requirementDescription": a.get("requirementDescription") or "",
                    "eb": set(),
                    "wi": set(),
                },
            )
            blob = "\n".join(
                [
                    a.get("sop") or "",
                    a.get("requirementDescription") or "",
                    a.get("requirementBackground") or "",
                    a.get("vasDes") or "",
                ]
            )
            row["eb"].update(re.findall(r"EB\d{6,}", blob, flags=re.I))
            row["wi"].update(re.findall(r"WI\d{6,}", blob, flags=re.I))
            if (a.get("sop") or "") and len(a.get("sop") or "") > len(row["sop"]):
                row["sop"] = a.get("sop") or ""
    if os.path.exists(CACHE):
        c = json.load(open(CACHE, encoding="utf-8"))
        for no, info in c.items():
            scenes = info.get("scenes") or []
            if not any(SCENE_KEY in (s or "") for s in scenes):
                continue
            row = by.setdefault(
                no,
                {
                    "vasc": no,
                    "sceneOverviewName": next((s for s in scenes if SCENE_KEY in (s or "")), SCENE),
                    "sop": (info.get("sops") or [""])[0] if info.get("sops") else "",
                    "serviceName": (info.get("services") or [None])[0],
                    "requirementDescription": "",
                    "eb": set(),
                    "wi": set(),
                },
            )
            blob = "\n".join(info.get("sops") or [])
            row["eb"].update(re.findall(r"EB\d{6,}", blob, flags=re.I))
            row["wi"].update(re.findall(r"WI\d{6,}", blob, flags=re.I))
            if info.get("sops") and info["sops"][0] and len(info["sops"][0]) > len(row["sop"]):
                row["sop"] = info["sops"][0]
            row["statusDesc"] = info.get("statusDesc")
    for row in by.values():
        row["eb"] = sorted({x.upper() for x in row["eb"]})
        row["wi"] = sorted({x.upper() for x in row["wi"]})
    return by


def parse_messages(raw: str):
    messages = []
    cur = None
    for line in (raw or "").split("\n"):
        m = re.match(
            r"^(客户|系统|CE-\S+|\S+)\s+(20\d{2}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})\s*$",
            line,
        )
        if m:
            if cur and cur["content"].strip():
                messages.append(cur)
            name = m.group(1)
            sender = "customer" if name == "客户" else ("system" if name == "系统" else "agent")
            cur = {"sender": sender, "name": name, "time": m.group(2), "content": ""}
            continue
        if cur is None:
            continue
        if line.startswith("----") or "满意度" in line[:30]:
            continue
        cur["content"] += ("\n" if cur["content"] else "") + line
    if cur and cur["content"].strip():
        messages.append(cur)
    return [{"sender": m["sender"], "time": m["time"], "content": m["content"].strip()} for m in messages if m["content"].strip()]


def summarize(msgs):
    cust = [m["content"] for m in msgs if m["sender"] == "customer"]
    agent = [m["content"] for m in msgs if m["sender"] == "agent"]
    first = next((c for c in cust if len(c) >= 4 and c not in ("你好", "在吗", "嗯嗯", "好")), cust[0] if cust else "")
    # crude demand lines
    demand_hits = [c for c in cust if re.search(r"换标|贴标|辨识|条码|上架|标签|尺码|SKU", c)]
    return {
        "背景": f"客户消息{len(cust)}条，客服消息{len(agent)}条。首句有效诉求：{(' '.join(first.split())[:120])}",
        "客户诉求线索": [(" ".join(x.split())[:160]) for x in demand_hits[:5]],
        "客服已确认线索": [
            (" ".join(x.split())[:160])
            for x in agent
            if re.search(r"标准|非标|换标|上架|辨识|提交|附件|标签", x)
        ][:5],
        "卡在哪_待人工补全": "自动摘要仅作线索；正式四件套需人工/业务确认收束后的需求描述。",
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(RUN_DIR, exist_ok=True)
    vascs = load_scene_vascs()
    print("scene_vascs", len(vascs))

    # index udesk by vasc/eb/wi
    with open(CSV, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    hits_by_session = defaultdict(lambda: {"vascs": set(), "eb": set(), "wi": set(), "row": None})
    for r in rows:
        text = (r.get("messages") or "") + "\n" + (r.get("场景分类") or "")
        cid = r.get("对话ID") or ""
        if not cid:
            continue
        found_v = set(x.upper() for x in re.findall(r"VASC\d+", text, flags=re.I))
        found_e = set(x.upper() for x in re.findall(r"EB\d{6,}", text, flags=re.I))
        found_w = set(x.upper() for x in re.findall(r"WI\d{6,}", text, flags=re.I))
        matched_v = found_v & set(vascs.keys())
        # also match via eb/wi from scene vascs
        matched_via = set()
        for v, meta in vascs.items():
            if found_e & set(meta["eb"]) or found_w & set(meta["wi"]):
                matched_via.add(v)
        matched = matched_v | matched_via
        if not matched:
            continue
        h = hits_by_session[cid]
        h["vascs"] |= matched
        h["eb"] |= found_e
        h["wi"] |= found_w
        h["row"] = r

    print("udesk_sessions_hit", len(hits_by_session))

    # build candidate list ranked by: has exact vasc mention, customer msg count, has sop
    candidates = []
    for cid, h in hits_by_session.items():
        r = h["row"]
        msgs = parse_messages(r.get("messages") or "")
        cust_n = sum(1 for m in msgs if m["sender"] == "customer")
        vasc_list = sorted(h["vascs"])
        has_direct = any(
            re.search(re.escape(v), r.get("messages") or "", flags=re.I) for v in vasc_list
        )
        sop_ok = any((vascs[v].get("sop") or "").strip() for v in vasc_list if v in vascs)
        candidates.append(
            {
                "conversationId": cid,
                "date": r.get("对话开始时间") or "",
                "customerMsgCount": int(r.get("对话客户消息数") or cust_n or 0),
                "parsedCustomerTurns": cust_n,
                "matchedVascs": vasc_list,
                "matchedViaDirectVascInChat": has_direct,
                "hasSop": sop_ok,
                "sceneClassification": r.get("场景分类") or "",
                "oms": [
                    {
                        "vasc": v,
                        "sceneOverviewName": vascs[v]["sceneOverviewName"],
                        "sop": vascs[v]["sop"],
                        "ebFromOms": vascs[v]["eb"],
                        "wiFromOms": vascs[v]["wi"],
                        "statusDesc": vascs[v].get("statusDesc"),
                    }
                    for v in vasc_list
                    if v in vascs
                ],
                "summaryAuto": summarize(msgs),
                "score": (2 if has_direct else 0)
                + (2 if sop_ok else 0)
                + min(cust_n, 20) / 10
                + (1 if cust_n >= 5 else 0),
            }
        )
    candidates.sort(key=lambda x: (-x["score"], -x["parsedCustomerTurns"], x["conversationId"]))

    selected = candidates[:3]
    # if fewer than 3, keep all
    payload = {
        "version": "oms-scene-f001-v0.1",
        "status": "scaffold_probe",
        "说明": "试用阶段核心场景集：从 OMS 场景概述倒查 Udesk。先做需求收束可读样本，不作八桶分层。",
        "sceneOverviewName": SCENE,
        "pipeline": [
            "定场景名",
            "拉该场景 VASC（含 sop）",
            "抽 EB/WI",
            "Udesk 反查命中会话",
            "会话摘要（本版 auto 线索，待人工收束）",
            "再切叶/标方向（尚未做）",
            "评测（尚未做）",
        ],
        "source": {
            "omsRepull": REPULL if os.path.exists(REPULL) else None,
            "omsCache": CACHE if os.path.exists(CACHE) else None,
            "udeskCsv": "workspace/data/raw/data_udesk_log_database_增值.csv",
        },
        "sceneVascCount": len(vascs),
        "udeskHitSessionCount": len(candidates),
        "selectedCount": len(selected),
        "targetSelected": 3,
        "sceneVascs": [
            {
                "vasc": v["vasc"],
                "sceneOverviewName": v["sceneOverviewName"],
                "sop": v["sop"],
                "eb": v["eb"],
                "wi": v["wi"],
                "statusDesc": v.get("statusDesc"),
            }
            for v in vascs.values()
        ],
        "allHitsRanked": [
            {
                "conversationId": c["conversationId"],
                "date": c["date"],
                "score": c["score"],
                "matchedVascs": c["matchedVascs"],
                "parsedCustomerTurns": c["parsedCustomerTurns"],
            }
            for c in candidates
        ],
        "sessions": selected,
    }

    with open(os.path.join(OUT_DIR, "sessions.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    with open(os.path.join(RUN_DIR, "probe_summary.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "sceneVascCount": len(vascs),
                "udeskHitSessionCount": len(candidates),
                "selected": [s["conversationId"] for s in selected],
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(json.dumps({"sceneVascs": len(vascs), "hits": len(candidates), "selected": [s["conversationId"] for s in selected]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
