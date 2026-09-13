# Case-level 数据画像（探索 v2）

- 生成时间：`2026-09-08T17:53:03+08:00`
- **本阶段是探索数据集，不是最终规则 / Eval / SOP / workflow 资产。**
- caseId 优先级：`threadId > EB异常单号 > VASC单号`
- `conversationRaw` 来源：原始群聊 Excel `讨论明细.对话详情`
- `summaryForIndex` **不是**群聊原文，仅索引摘要
- 附件真实来源：OMS `oms.oms_va_execute_file`（关联 `oms_va_atom_attr`）
- `text_mention_only` **不是**已上传事实
- `oms_direct_pass` 从 OMS 全量约 3962 单中补充的无群聊直接通过样本

## 自检结果

| check | result |
|---|---|
| json_case_count | 3848 |
| caseId_unique | True |
| verified_attachments_nonempty_examples | True |
| chat_driven_conversation_nonempty_examples | True |
| oms_direct_pass_no_chat_with_sop_examples | True |
| sample_count | 36 |
| no_formal_assets_generated | True |
| spot_verified_caseIds | ['thread:omt_1a829c7e840e9b9b', 'thread:omt_1a82b9690ecedc91', 'thread:omt_1a82bd39a7cf9b8d', 'thread:omt_1a82c842654d1b81', 'thread:omt_1a82c9dba88fdb98'] |
| spot_chat_caseIds | ['thread:omt_1a83756f894e1be5', 'thread:omt_1a829c7e840e9b9b', 'thread:omt_1a82b9690ecedc91', 'thread:omt_1a82ba24e6cf9b98', 'thread:omt_1a82bd39a7cf9b8d'] |
| spot_direct_caseIds | ['vasc:VASC000000262686', 'vasc:VASC000000267408', 'vasc:VASC000000267465', 'vasc:VASC000000267477', 'vasc:VASC000000267486'] |
| excel_readable | True |
| json_parseable | True |
| excel_main_rows | 3848 |

## 质量摘要

| metric | value | note |
|---|---|---|
| OMS全量非标增值单量 | 3962 | vas_type=NON_STANDARD_VASC, is_delete=N, 2026-04-21~2026-08-01 |
| 群聊命中VASC单量(去重) | 970 | 出现在 chat_driven case 的 vascNos |
| case总数 | 3848 | 一行一个 case |
| thread case数 | 812 | caseId=thread:<threadId> |
| EB case数 | 158 | caseId=eb:<EB> |
| VASC-only case数 | 2878 | caseId=vasc:<VASC> |
| conversationRaw found | 812 | 来自讨论明细.对话详情 |
| conversationRaw not_found | 3036 |  |
| 有submittedFields的case数 | 3614 | INPUT_NODE=SUBMIT 属性 |
| verified附件case数 | 2359 | oms_va_execute_file 命中 |
| text_mention_only case数 | 119 | 文本提及但无文件表记录 |
| not_found_in_oms_va_execute_file case数 | 1370 |  |
| 直接通过且无群聊case数 | 752 | oms_direct_pass |
| SOP覆盖率(case) | 0.8534 | 至少一条 SOP |
| OMS execute_file行数 | 9380 | 窗口内 |
| OMS SUBMIT attr行数 | 43006 | 窗口内 |
| 抽样样本数 | 36 | sample-cases-readable.md |

## caseType 分布

| caseType | 数量 |
|---|---:|
| oms_other | 2284 |
| chat_driven | 812 |
| oms_direct_pass | 752 |

## caseIdType 分布

| caseIdType | 数量 |
|---|---:|
| vasc | 2878 |
| thread | 812 |
| eb | 158 |

## conversationRawStatus / attachmentStatus

| conversationRawStatus | 数量 |
|---|---:|
| not_found | 3036 |
| found | 812 |

| attachmentStatus | 数量 |
|---|---:|
| verified | 2359 |
| not_found_in_oms_va_execute_file | 1370 |
| text_mention_only | 119 |

## 主要数据缺口 / 需人工核准

1. 群聊-VASC 映射依赖飞书讨论命中表；未命中讨论的 OMS 单不会进入 `chat_driven`。
2. EB case 合并仅基于文本抽取的 EB 号，可能漏并或误并，需人工抽查。
3. `possible_chat_completion_then_pass` / `possible_resubmit_*` 为启发式，不是金标。
4. SUBMIT 属性已截断至 4000 字符（导出时），超长字段需回 OMS 原表核对。
5. Excel 单元格上限约 32767 字符：超长 `conversationRaw` 在 `.xlsx` 中可能被截断，**完整原文以 `case_level_dataset.json` 为准**。
6. 客户姓名等敏感字段在可读样本中尽量少展示；完整字段在数据集内，注意权限。
7. 未生成正式 scene_rule / eval_cases / sop_case_library / workflow 规则。

## 下一步人工标注

对 `sample-cases-readable.md` 中每条样本填写 `humanLabelPlaceholder` 的 pipeline trace。
