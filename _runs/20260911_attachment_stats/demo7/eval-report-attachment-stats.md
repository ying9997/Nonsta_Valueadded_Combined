# 评测报告 V0.1 (attachment-stats)

## 数据集
- 来源：7 条 demo 用例（L1×1 L2×1 L3×1 L4×4）
- Golden labels：`internal-review-copilot/eval/golden/demo-7.jsonl`（人工标注）
- 附录：16 条当日待审核单粗标（不计主表准确率结论）

## 指标

| 指标 | 值 |
|------|---|
| outputPath Accuracy | 7/7 (100.0%) |
| sceneKey Accuracy | 4/5 (80.0%) |
| missingFields Recall | 100.0% |
| missingFields Precision | 100.0% |
| LLM Success Rate | 7/7 (100.0%) |
| sop_generated | 5 |
| transfer_human | 1 |
| needs_*_clarification | 1 |

## 逐条对比

| vascNo | expected | actual | match | scene | missing | 差异说明 |
|--------|----------|--------|-------|-------|---------|----------|
| VASC000000183069 | needs_requirement_clarification | needs_requirement_clarification | ✓ | - | ✓ | - |
| VASC000000344421 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000343821 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000333147 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000326061 | sop_generated | sop_generated | ✓ | ✗ inbound_package_barcode_batch_relabel | ✓ | scene inbound_label_identify→inbound_package_barcode_batch_relabel |
| VASC000000143515 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000080416 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |

## Reflection（sop_generated）

| vascNo | reflectionPass | regenerated | issues |
|--------|----------------|-------------|--------|
| VASC000000343821 | - | - | - |
| VASC000000333147 | - | - | - |
| VASC000000326061 | - | - | - |
| VASC000000143515 | - | - | - |
| VASC000000080416 | - | - | - |

## 已知问题

- VASC000000326061: scene inbound_label_identify→inbound_package_barcode_batch_relabel

## 版本
- Pipeline: run-pipeline.ts
- LLM model: (skipped)
- skipLlm: true
- tag: attachment-stats
- 日期: 2026-09-11
