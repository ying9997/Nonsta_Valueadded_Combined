# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders\details.json`
- 样本数：16
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- SOP：本地 mock，未调用真实 LLM，未拉实时 OMS

## 分流统计

| outputPath | count |
| --- | ---: |
| needs_requirement_clarification | 1 |
| needs_field_clarification | 1 |
| transfer_human | 14 |

## 失败归因

| gate | count |
| --- | ---: |
| check-requirement | 1 |
| check-completeness | 1 |
| match-template | 14 |

## 本批读法

- 16 张均为 2026-09-02 待审核 `OW01V1602`，OMS 场景名为空，因此没有按原子码预判 F-001。
- `VASC000000348495`：先在 `check-requirement` 停（缺数量或范围），尚未进入场景匹配。
- `VASC000000348477`：需求完整且命中 F-001，再在 `check-completeness` 停（缺操作说明附件、商品和标签的对应关系；标签文件已传）。
- 其余 14 张：需求完整，作业是「拦截不上架 / 先放一边」，当前模板库不自动支持，归因 `match-template` → `transfer_human`。
- 本批没有 `sop_generated`：唯一 F-001 候选附件未齐，本地 mock LLM 未触发。

## 明细

| orderNo | outputPath | 命中节点 | 缺失项 |
| --- | --- | --- | --- |
| VASC000000348495 | needs_requirement_clarification | check-requirement | 数量或范围 |
| VASC000000348477 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000347559 | transfer_human | match-template | - |
| VASC000000347556 | transfer_human | match-template | - |
| VASC000000347553 | transfer_human | match-template | - |
| VASC000000347550 | transfer_human | match-template | - |
| VASC000000347547 | transfer_human | match-template | - |
| VASC000000347544 | transfer_human | match-template | - |
| VASC000000347541 | transfer_human | match-template | - |
| VASC000000347538 | transfer_human | match-template | - |
| VASC000000347535 | transfer_human | match-template | - |
| VASC000000347532 | transfer_human | match-template | - |
| VASC000000347529 | transfer_human | match-template | - |
| VASC000000347526 | transfer_human | match-template | - |
| VASC000000347520 | transfer_human | match-template | - |
| VASC000000347517 | transfer_human | match-template | - |
