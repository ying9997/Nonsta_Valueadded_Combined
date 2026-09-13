# Case 按作业环节拆分 v2（入库 / 库内 / 出库 / 尾程 / 其他）

## 已确认口径

- **尾程单独成桶**，不并入出库
- **UNUSUAL 归「其他」**，不归入库
- 交叉场景 tie **不单独拎出人工复核**；按稳定优先级打破平局：入库 > 库内 > 出库 > 尾程 > 其他

## thread 口径

- 一条 thread = 一个讨论ID = 一个 case（不是全对话汇总）

- 源 case 总数：3848
- 输出目录：`D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2\by_flow`

| flow | case数 | thread(chat_driven) | oms_direct_pass | verified附件 | conversation found |
|---|---:|---:|---:|---:|---:|
| 入库 | 537 | 211 | 141 | 352 | 211 |
| 库内 | 762 | 239 | 200 | 578 | 239 |
| 出库 | 1504 | 163 | 268 | 1103 | 163 |
| 尾程 | 609 | 57 | 2 | 0 | 57 |
| 其他 | 436 | 142 | 141 | 326 | 142 |

## flag 统计

| flag | 次数 |
|---|---:|
| va_source=UNUSUAL→其他 | 424 |
| partial_UNUSUAL_mixed_case | 68 |
| multi_flow_tie:出库/库内→resolved | 9 |
| cannot_classify→其他 | 9 |
| multi_flow_tie:入库/库内→resolved | 7 |
| multi_flow_tie:库内/入库→resolved | 7 |
| multi_flow_tie:库内/出库→resolved | 5 |
| multi_flow_tie:出库/尾程→resolved | 4 |
| multi_flow_tie:其他/入库→resolved | 2 |
| multi_flow_tie:库内/尾程→resolved | 2 |
| multi_flow_tie:入库/出库→resolved | 1 |
| multi_flow_tie:尾程/出库→resolved | 1 |

## 文件

- `case_level_dataset_入库/库内/出库/尾程/其他.json|.xlsx`
- `sample-cases-readable_*.md`

完整原文以 JSON 为准。
