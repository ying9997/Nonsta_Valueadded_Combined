# T1–T4 HQ 候选池摘要

- 生成时间: 本机构建
- OMS 缓存: `D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_inbound_scene_probe\_oms_cache`
- 群聊: `three_chat_full_window.json`（EB literal OR VASC）
- HQ 定义: 有 EB + 有群聊 + 对话 ≥ 500 字
- details 条数: **47**（仅 HQ）
- 附件: `D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_t14_eval\_oms_files\files.csv`（1044 行）

| 场景 | OMS码 | 场景订单 | 有 EB | 有群聊 | HQ 候选 | HQ 中 qualityFlag |
|------|-------|--------:|------:|-------:|--------:|------------------:|
| T1 | `20250430` | 76 | 43 | 34 | 15 | 1 |
| T2 | `20250522001` | 61 | 21 | 38 | 13 | 1 |
| T3 | `202506120001` | 42 | 18 | 21 | 8 | 1 |
| T4 | `20250407004` | 37 | 21 | 24 | 11 | 0 |

## 说明

- 本表 **HQ / 有 EB / 有群聊** 均为 **订单（VASC）级**。v4 排序里的 HQ=37/22/16/19 是 **EB 去重级**，口径不同。
- `customerIntent` 仅由 BEOR + VAS_ATTR_REL_RD 拼接，不含 sceneOverviewNames。
- `qualityFlag`：场景名含冲突关键词（且非本场景名自带）、RD 像退回引用/过短。
- T2 对应 B 卡 / T4 对应 F-001 卡；meta 用 T1–T4 分桶。
