# chat-merge-summary（Round 2.1）

- 生成时间: 2026-09-08T14:50:15.269Z
- case 输入: `D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2\by_flow\case_level_dataset_入库.json`
- 群聊输入: `D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_three_chat_supplement\three_chat_discussions_combined_filtered.json`（3356 条）
- 输出: `D:\DA\Nonsta_Valueadded_Combined\_runs\20260908_3scene_build_v3\case_level_dataset_入库_enriched.json`

## 覆盖率

| 指标 | 数量 | 比例 |
|------|-----:|-----:|
| case 总数 | 537 | 100% |
| 原 conversationRaw 有内容 | 211 | 39.3% |
| 补充后有内容 | 273 | 50.8% |
| 净增有内容 case | 62 | — |
| 从空补齐 | 62 | — |
| 追加第三群对话的 case 次数 | 48 | — |

## 匹配方式分布（发生变更的 case 上累计）

| 方式 | 次数 |
|------|-----:|
| threadId（讨论ID） | 211 |
| ebNo（关联单号/正文） | 26 |
| vascNo（关联单号/正文） | 87 |

## 说明

- 空/not_found：按 threadIds→讨论ID 优先填充；不足再用 VASC/EB 关联。
- 已有对话：检查并追加缺失群（尤其第三群 `oc_5b8848d27b7b3fa4a10eab865c4f9ffc`），块头带群名称与群 ID。
- 变更明细见 `chat-merge-matches.json`（273 条）。
