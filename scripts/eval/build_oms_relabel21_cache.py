# -*- coding: utf-8 -*-
"""
Build OMS scene cache for Udesk VASC numbers, then list sessions that are
true §2.1 / 换标上架 affinity by sceneOverviewName.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    _new_session,
    get_vas_list,
    page_query,
    refresh_oms_csrf,
)

ROOT = r"D:\DA\Nonsta_Valueadded_Combined"
CSV = os.path.join(ROOT, r"workspace\data\raw\data_udesk_log_database_增值.csv")
OUT_DIR = os.path.join(ROOT, r"_tmp\20260829_udesk_probe")
CACHE_PATH = os.path.join(OUT_DIR, "oms_vasc_scene_cache.json")
HIT_PATH = os.path.join(OUT_DIR, "oms_relabel21_hits.json")

# Exact / affinity scenes accepted as §2.1 亲缘（OMS 审核场景名）
SCENE_OK = re.compile(
    r"(尺重.*/?\s*标签辨识后换标上架|"
    r"标签辨识后换标上架|"
    r"包裹类异常换商品标签上架|"
    r"换商品标签上架|"
    r"【入库】[^】]*换标上架)"
)


def parse_csv(content: str):
    rows = []
    current = []
    field = ""
    in_q = False
    i = 0
    while i < len(content):
        ch = content[i]
        if in_q:
            if ch == '"':
                if i + 1 < len(content) and content[i + 1] == '"':
                    field += '"'
                    i += 1
                else:
                    in_q = False
            else:
                field += ch
        elif ch == '"':
            in_q = True
        elif ch == ",":
            current.append(field)
            field = ""
        elif ch == "\n":
            current.append(field)
            rows.append(current)
            current = []
            field = ""
        elif ch != "\r":
            field += ch
        i += 1
    if field or current:
        current.append(field)
        rows.append(current)
    headers = [h.strip() for h in rows[0]]
    return [
        {headers[j]: (cols[j] if j < len(cols) else "") for j in range(len(headers))}
        for cols in rows[1:]
    ]


def extract_vasc(text: str):
    return sorted(set(m.upper() for m in re.findall(r"VASC\d+", text or "", flags=re.I)))


def judge_scenes(scenes: list[str]) -> dict:
    hits = [s for s in scenes if s and SCENE_OK.search(s)]
    exact = [s for s in hits if "尺重" in s and "标签辨识" in s]
    return {
        "ok": bool(hits),
        "exact21": bool(exact),
        "matchedScenes": hits,
        "allScenes": [s for s in scenes if s],
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    cache = {}
    if os.path.exists(CACHE_PATH):
        cache = json.load(open(CACHE_PATH, encoding="utf-8"))

    rows = parse_csv(open(CSV, encoding="utf-8").read())
    session_vasc = {}
    all_vasc = set()
    for r in rows:
        cid = r.get("对话ID") or ""
        if not cid:
            continue
        cust_n = int(r.get("对话客户消息数") or "0") or 0
        if cust_n < 2:
            continue
        vascs = extract_vasc(r.get("messages") or "")
        if not vascs:
            continue
        session_vasc[cid] = {
            "vascs": vascs,
            "date": r.get("对话开始时间") or "",
            "sceneClassification": r.get("场景分类") or "",
        }
        all_vasc.update(vascs)

    print(f"sessions_with_vasc={len(session_vasc)} unique_vasc={len(all_vasc)}")

    need = [v for v in sorted(all_vasc) if v not in cache or cache[v].get("error")]
    print(f"cache_hit={len(all_vasc) - len(need)} to_query={len(need)}")

    if need:
        session = _new_session()
        refresh_oms_csrf(session)
        for i, v in enumerate(need, 1):
            try:
                header = page_query(session, orderNo=v)
                atoms = get_vas_list(session, v)
                scenes = [a.get("sceneOverviewName") or "" for a in atoms]
                sops = [(a.get("sop") or "")[:240] for a in atoms]
                services = [a.get("serviceName") or "" for a in atoms]
                j = judge_scenes(scenes)
                cache[v] = {
                    "statusDesc": (header[0] or {}).get("statusDesc") if header else None,
                    "productName": (header[0] or {}).get("productName") if header else None,
                    "scenes": scenes,
                    "services": services,
                    "sops": sops,
                    "ok": j["ok"],
                    "exact21": j["exact21"],
                    "matchedScenes": j["matchedScenes"],
                }
                tag = "OK21" if j["exact21"] else ("OK_AFF" if j["ok"] else "NO")
                print(f"[{i}/{len(need)}] {v} {tag} {j['matchedScenes'] or scenes}")
            except Exception as e:
                cache[v] = {"error": f"{type(e).__name__}: {e}", "ok": False, "exact21": False}
                print(f"[{i}/{len(need)}] {v} ERR {e}")
                # refresh csrf on auth-ish errors
                if "Cookie" in str(e) or "CSRF" in str(e) or "登录" in str(e):
                    raise
            if i % 20 == 0:
                json.dump(cache, open(CACHE_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                time.sleep(0.2)
        json.dump(cache, open(CACHE_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    hits = []
    for cid, meta in session_vasc.items():
        matched = []
        exact = False
        details = []
        for v in meta["vascs"]:
            c = cache.get(v) or {}
            if c.get("ok"):
                matched.append(v)
                if c.get("exact21"):
                    exact = True
                details.append(
                    {
                        "vasc": v,
                        "matchedScenes": c.get("matchedScenes") or [],
                        "exact21": bool(c.get("exact21")),
                        "services": c.get("services") or [],
                        "sops": c.get("sops") or [],
                    }
                )
        if matched:
            hits.append(
                {
                    "conversationId": cid,
                    "date": meta["date"],
                    "sceneClassification": meta["sceneClassification"],
                    "vascs": meta["vascs"],
                    "matchedVascs": matched,
                    "exact21": exact,
                    "details": details,
                }
            )

    hits.sort(key=lambda x: (0 if x["exact21"] else 1, x["date"]))
    payload = {
        "n": len(hits),
        "exact21": sum(1 for h in hits if h["exact21"]),
        "affinityOnly": sum(1 for h in hits if not h["exact21"]),
        "sceneRule": SCENE_OK.pattern,
        "hits": hits,
    }
    json.dump(payload, open(HIT_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps({"hit_sessions": payload["n"], "exact21": payload["exact21"], "affinityOnly": payload["affinityOnly"]}, ensure_ascii=False))
    print("wrote", CACHE_PATH)
    print("wrote", HIT_PATH)


if __name__ == "__main__":
    main()
