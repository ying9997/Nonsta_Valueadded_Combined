# -*- coding: utf-8 -*-
import json
import sys

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import _new_session, get_related_orders, page_query, refresh_oms_csrf

s = _new_session()
refresh_oms_csrf(s)

tests = [
    ("rel_332778_eb", lambda: get_related_orders(s, "VASC000000332778", "EB0126080632030982")),
    ("rel_332778_wi", lambda: get_related_orders(s, "VASC000000332778", "WI51547628")),
    ("page_wi", lambda: page_query(s, businessOrderNo="WI51547628")),
    ("rel_257703_eb", lambda: get_related_orders(s, "VASC000000257703", "EB0126042429050425")),
]
out = {}
for name, fn in tests:
    try:
        rows = fn()
        nos = []
        for r in rows:
            if isinstance(r, dict):
                nos.append((r.get("orderNo"), r.get("statusDesc"), r.get("status")))
        out[name] = {"n": len(rows), "nos": nos[:20]}
        print(name, "n", len(rows), nos[:12])
    except Exception as e:
        out[name] = {"error": str(e)}
        print(name, "ERR", e)

from pathlib import Path
p = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260901_oms_eb_expand\probe_eb_lookup2.json")
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
