import json
import os
import re
import glob
import requests
import urllib3

urllib3.disable_warnings()

AUTH = glob.glob(r"D:/DA/AI_EXPERT/TOM/**/共享认证", recursive=True)[0]
with open(os.path.join(AUTH, "playwright_cookies.json"), encoding="utf-8") as f:
    cookies = json.load(f)

session = requests.Session()
session.verify = False
for c in cookies:
    session.cookies.set(c["name"], c["value"], domain=c.get("domain", ""), path=c.get("path", "/"))

pages = [
    "https://cnpmstom.winit.com.cn/PlanEvent/standardExceptionDetail/id/1827/isView/Y",
    "https://cnpmstom.winit.com.cn/PlanEvent/valueAddedServiceDetail/id/1825/isView/Y",
]
apis = [
    "pms.PlanEventService_queryPlanEventDetail",
    "pms.PlanEventService_getPlanEventDetail",
    "pms.PlanEventService_findPlanEventById",
    "pms.PlanEventService_queryPlanEventById",
    "pms.PlanEventService_getPlanEventById",
    "pms.PlanEventService_queryPlanEvent",
    "pms.PlanEventService_queryPlanEventInfo",
]

for page in pages:
    resp = session.get(page, timeout=60)
    print("PAGE", page, resp.status_code, resp.url[:120])
    csrf = re.search(r"window\.__CSRF_TOKEN__\s*=\s*['\"]([^'\"]+)['\"]", resp.text)
    if not csrf:
        print("  no csrf")
        continue
    session.headers.update(
        {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "x-csrf-token": csrf.group(1),
            "Referer": page,
        }
    )
    for api in apis:
        for params in (
            {"api": api, "where[vo][id]": "1827" if "1827" in page else "1825"},
            {"api": api, "where[id]": "1827" if "1827" in page else "1825"},
            {"api": api, "id": "1827" if "1827" in page else "1825"},
        ):
            r = session.post(
                "https://cnpmstom.winit.com.cn/PlanEvent/ajaxProcess",
                data=params,
                timeout=30,
            )
            try:
                data = r.json()
            except Exception:
                continue
            info = data.get("info")
            if data.get("status") == 1 and info:
                text = json.dumps(info, ensure_ascii=False)[:300]
                print("  HIT", api, params, text)
