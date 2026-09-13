# 评测报告 V0.1 (baseline)

## 数据集
- 来源：7 条 demo 用例（L1×1 L2×1 L3×1 L4×4）
- Golden labels：人工标注
- 附录：16 条当日待审核单粗标（不计主表准确率结论）

## 指标

| 指标 | 值 |
|------|---|
| outputPath Accuracy | 7/7 (100.0%) |
| sceneKey Accuracy | 5/5 (100.0%) |
| missingFields Recall | 100.0% |
| missingFields Precision | 100.0% |
| LLM Success Rate | 7/7 (100.0%) |
| sop_generated | 4 |
| transfer_human | 1 |
| needs_*_clarification | 2 |

## 逐条对比

| vascNo | expected | actual | match | scene | missing | 差异说明 |
|--------|----------|--------|-------|-------|---------|----------|
| VASC000000183069 | needs_requirement_clarification | needs_requirement_clarification | ✓ | - | ✓ | - |
| VASC000000344421 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000343821 | needs_field_clarification | needs_field_clarification | ✓ | ✓ | ✓ | - |
| VASC000000333147 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000326061 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000143515 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000080416 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |

## Reflection（sop_generated）

| vascNo | reflectionPass | regenerated | issues |
|--------|----------------|-------------|--------|
| VASC000000333147 | - | - | - |
| VASC000000326061 | - | - | - |
| VASC000000143515 | - | - | - |
| VASC000000080416 | - | - | - |

## 已知问题

- 本批主表无 path/scene/missing 不匹配
- 附录 4 条 LLM 502，规则路径仍正确，最终 outputPath 因降级仍为 transfer_human（与粗标一致）



## Reflection 前后对比（4 条 L4）

| vascNo | reflectionPass | regenerated | issue条数 | 说明 |
|--------|----------------|-------------|----------|------|
| VASC000000333147 | false | false | 4 | 检出问题；重生未落地（校验失败回退初稿） |
| VASC000000326061 | false | true | 5 | 重生成功，采用第二稿 |
| VASC000000143515 | false | false | 4 | 检出问题；重生未落地（校验失败回退初稿） |
| VASC000000080416 | false | false | 4 | 检出问题；重生未落地（校验失败回退初稿） |

- **baseline**（val-results-baseline.json）：无 Reflection；outputPath 7/7
- **post-reflection**：outputPath 仍 7/7；4/4 L4 均检出 issues；**1/4** 重生成功（VASC000000326061）
- Reflection 影响 SOP 文本，不改变规则分流；失败降级不阻断
- 详见 val-report-post-reflection.md


## 版本
- Pipeline: run-pipeline.ts
- LLM model: claude-sonnet-4-5
- tag: baseline
- 日期: 2026-09-08

## 附录：16 条当日单（粗标，shadow）

> 不计主结论准确率。

| 指标 | 值 |
|------|---|
| outputPath Accuracy | 16/16 (100.0%) |
| sceneKey Accuracy | 0/0 (n/a) |
| missingFields Recall | 100.0% |
| missingFields Precision | 93.8% |
| LLM Success Rate | 12/16 (75.0%) |
| sop_generated | 0 |
| transfer_human | 15 |
| needs_*_clarification | 1 |

| vascNo | expected | actual | match | scene | missing | 差异说明 |
|--------|----------|--------|-------|-------|---------|----------|
| VASC000000348495 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000348477 | needs_field_clarification | needs_field_clarification | ✓ | - | ✗ | missing precision fail act extras |
| VASC000000347559 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347556 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347553 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347550 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347547 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347544 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347541 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347538 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347535 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347532 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000347529 | transfer_human | transfer_human | ✓ | - | ✓ | llmError:LLM API error 502: <html>
<head><title>502 Bad Gateway</tit |
| VASC000000347526 | transfer_human | transfer_human | ✓ | - | ✓ | llmError:LLM API error 502: <html>
<head><title>502 Bad Gateway</tit |
| VASC000000347520 | transfer_human | transfer_human | ✓ | - | ✓ | llmError:LLM API error 502: <html>
<head><title>502 Bad Gateway</tit |
| VASC000000347517 | transfer_human | transfer_human | ✓ | - | ✓ | llmError:LLM API error 502: <html>
<head><title>502 Bad Gateway</tit |
