# coding: utf-8
"""List OMS inbound names for manual mapping aid."""
import json
from pathlib import Path

oms = json.loads(
    Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_oms_scene_code_map\scene_overview_code_map.json").read_text(
        encoding="utf-8"
    )
)
rows = [
    r
    for r in oms["rows"]
    if r.get("group") == "inbound" or str(r.get("sceneOverviewName", "")).startswith("【入库】")
]
out = Path(r"D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_p3_eval\_oms_inbound_names.txt")
out.write_text("\n".join(f"{r['sceneOverviewCode']}\t{r['sceneOverviewName']}" for r in rows), encoding="utf-8")
print(len(rows), "->", out)
