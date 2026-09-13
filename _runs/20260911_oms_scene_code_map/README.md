# OMS 增值审核场景概述 码–名映射

- 生成：2026-09-11T09:06:34.016870+00:00
- 来源：live `VasOrder` 详情页 `select[name=sceneOverviewCode]`，**入库 + 库内 + 出库** 三张详情合并去重
- 条数：171（inbound=51 / instock=71 / outbound=42 / other=7）
- 原始：`_runs/20260911_oms_scene_code_map/scene_overview_code_map.json`
- 拉业务池仍按码滤；按名滤会被忽略

## 各类型详情页下拉条数

| 类型 | 种子单 | 下拉条数 | 仅该类型独有 |
|------|--------|----------|--------------|
| inbound | `VASC000000344421` | 171 | 0 |
| instock | `VASC000000184008` | 171 | 0 |
| outbound | `VASC000000348573` | 171 | 0 |

## 本轮已核（F-001 / A / B）

| 别名 | 码 | 名 |
|------|----|----|