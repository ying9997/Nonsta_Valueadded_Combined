# 非标页内嵌智能引导候选评测用例抽取报告

## 产物

- `candidate_eval_cases.json`: JSON 数组，供人工复核和后续导入。
- `candidate_eval_cases.jsonl`: JSONL，每行一个候选用例。

## 统计

- 候选输出数：60
- 分支分布：{'2d_standard_value_added_correction': 45, '2b_other_service_demand_sop': 6, '2a_named_nonstandard_service_direct_select': 9}
- 附件检查状态分布：{'warning': 53, 'not_checked': 7}

## 口径

- 来源：`agentic/qa-gen_base.csv`。
- 所有用例 `humanReviewStatus` 均为 `pending`。
- `systemScopedVascList`、页面上下文、费用、审核结论、附件真实校验结果均不从 CSV 补造。
- 附件相关内容仅作为候选信号，未经过飞书群聊 TOP3 人工确认前不得写成已支持规则。

## Top 20

| caseId | score | route | category |
|---|---:|---|---|
| csdb-nonstandard-guide-2730 | 90 | 2d_standard_value_added_correction | 基本业务和政策介绍 |
| csdb-nonstandard-guide-3572 | 90 | 2b_other_service_demand_sop | 入库 |
| csdb-nonstandard-guide-400 | 85 | 2d_standard_value_added_correction | 入库 |
| csdb-nonstandard-guide-3623 | 84 | 2a_named_nonstandard_service_direct_select | 入库 |
| csdb-nonstandard-guide-3546 | 83 | 2a_named_nonstandard_service_direct_select | 库存管理 |
| csdb-nonstandard-guide-2763 | 81 | 2a_named_nonstandard_service_direct_select | 基本业务和政策介绍 |
| csdb-nonstandard-guide-1650 | 78 | 2d_standard_value_added_correction | 入库 |
| csdb-nonstandard-guide-1656 | 78 | 2a_named_nonstandard_service_direct_select | 入库 |
| csdb-nonstandard-guide-4200 | 76 | 2b_other_service_demand_sop | 库存管理 |
| csdb-nonstandard-guide-3847 | 75 | 2d_standard_value_added_correction | 出厂发运 |
| csdb-nonstandard-guide-396 | 75 | 2d_standard_value_added_correction | 入库 |
| csdb-nonstandard-guide-4124 | 75 | 2d_standard_value_added_correction | 基本业务和政策介绍 |
| csdb-nonstandard-guide-4 | 74 | 2d_standard_value_added_correction | 退货 |
| csdb-nonstandard-guide-4103 | 74 | 2d_standard_value_added_correction | 入库 |
| csdb-nonstandard-guide-3002 | 72 | 2d_standard_value_added_correction | 出库 |
| csdb-nonstandard-guide-4013 | 72 | 2b_other_service_demand_sop | 出库 |
| csdb-nonstandard-guide-183 | 70 | 2a_named_nonstandard_service_direct_select | 出库 |
| csdb-nonstandard-guide-2299 | 70 | 2d_standard_value_added_correction | 库存管理 |
| csdb-nonstandard-guide-3544 | 70 | 2d_standard_value_added_correction | 退货 |
| csdb-nonstandard-guide-3574 | 70 | 2d_standard_value_added_correction | 出库 |
