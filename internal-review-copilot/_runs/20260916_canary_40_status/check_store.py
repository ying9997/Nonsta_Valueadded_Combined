import json, os

p = os.path.expanduser("~/.agents/services/internal-review-copilot/_runs/live_poll/case-store.json")
d = json.load(open(p, encoding="utf-8"))
meta = d.get("_meta") or {}
print("canaryPromoted", meta.get("canaryPromoted"))
print("canaryMode", meta.get("canaryMode"))
print("canaryCount", meta.get("canaryCount"))
print("canaryLimitNotified", meta.get("canaryLimitNotified"))
nos = meta.get("canaryOrderNos") or []
print("canaryOrderNos", ",".join(nos))
by = {c.get("vascNo"): c for c in d.get("cases") or []}
for no in nos:
    c = by.get(no) or {}
    title = ((c.get("lastCard") or {}).get("header") or {}).get("title") or {}
    template = ((c.get("lastCard") or {}).get("header") or {}).get("template")
    blob = json.dumps(c.get("lastCard") or {}, ensure_ascii=False)
    print(
        "|".join(
            [
                no,
                str(c.get("status") or ""),
                str(c.get("aiOutputPath") or ""),
                str(c.get("failureType") or ""),
                str(template or ""),
                str(title.get("content") or ""),
                str(c.get("customer") or ""),
                "STARS" if "***" in blob or "＊" * 3 in blob else "name_ok",
                "SOP_ERR" if "SOP 生成失败" in blob else "ok",
            ]
        )
    )
