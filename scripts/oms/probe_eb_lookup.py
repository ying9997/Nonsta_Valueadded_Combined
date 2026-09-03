# -*- coding: utf-8 -*-
"""Probe how OMS can list VASCs by EB / related business order."""
import json
import sys

sys.path.insert(0, r"D:\DA\AI_EXPERT\TOM\PlanEvent查询")
from query_vas_order import (  # noqa: E402
    _new_session,
    get_related_orders,
    oms_post,
    page_query,
    refresh_oms_csrf,
)

EB = "EB0126042429050425"
VASC = "VASC000000257703"
OUT = r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260901_oms_eb_expand\probe_eb_lookup.json"


def safe(fn, *a, **kw):
    try:
        return {"ok": True, "data": fn(*a, **kw)}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def main():
    s = _new_session()
    refresh_oms_csrf(s)
    results = {}
    results["page_businessOrderNo"] = safe(page_query, s, businessOrderNo=EB)
    results["page_eventNo"] = safe(page_query, s, eventNo=EB)
    results["page_orderNo_eb"] = safe(page_query, s, orderNo=EB)
    results["related"] = safe(get_related_orders, s, VASC, EB)
    results["related_wi"] = safe(get_related_orders, s, VASC, "WI51547628")

    # raw variants
    for name, params in [
        ("vo.businessOrderNo", {"api": "oms.VaOrderService_pageQuery", "draw": "1", "start": "0", "length": "20", "where[vo][businessOrderNo]": EB}),
        ("unusualEventNo", {"api": "oms.VaOrderService_pageQuery", "draw": "1", "start": "0", "length": "20", "where[unusualEventNo]": EB}),
        ("eventOrderNo", {"api": "oms.VaOrderService_pageQuery", "draw": "1", "start": "0", "length": "20", "where[eventOrderNo]": EB}),
    ]:
        try:
            data = oms_post(s, params)
            rows = data.get("info")
            results[name] = {"ok": True, "preview": str(rows)[:400]}
        except Exception as exc:
            results[name] = {"ok": False, "error": str(exc)}

    from pathlib import Path
    Path(OUT).parent.mkdir(parents=True, exist_ok=True)
    Path(OUT).write_text(json.dumps(results, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    for k, v in results.items():
        if v.get("ok") and isinstance(v.get("data"), list):
            nos = [r.get("orderNo") for r in v["data"] if isinstance(r, dict)]
            print(k, "n", len(v["data"]), "nos", nos[:8])
        else:
            print(k, v.get("ok"), (v.get("error") or v.get("preview") or "")[:180])


if __name__ == "__main__":
    main()
