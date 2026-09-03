# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260903_adhoc_leak_photo\adhoc.details.json`
- 样本数：1
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- SOP：本地 mock，未调用真实 LLM，未拉实时 OMS

## 分流统计

| outputPath | count |
| --- | ---: |
| needs_requirement_clarification | 1 |

## 失败归因

| gate | count |
| --- | ---: |
| check-requirement | 1 |

## 明细

| orderNo | outputPath | 命中节点 | 缺失项 |
| --- | --- | --- | --- |
| VASC000009909101 | needs_requirement_clarification | check-requirement | 需求背景/操作目的/处理去向不清 |

## match-template v0.2

| orderNo | decision | top1 | score | confidenceScore | reason |
| --- | --- | --- | ---: | ---: | --- |
| VASC000009909101 | - | - | - | - | - |

完整 `decision` / `topK` / `confidenceScore` / `reason` 见 `dryrun-results.json` 的 `matchResult`。当前 16 条待审核单无最终结论，不能当 gold。
