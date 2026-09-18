# 已审核通过单跑批验证报告（v2）

## 统计

- 测试集：同一批 40 条已审核通过的增值单（与 v1 相同）
- Pipeline 配置：sceneLlmVersion=2, **RAG 关**, `--skip-feishu`, OMS_WRITE=0
- **RAG 门禁：** B 类 6 条开 RAG 试跑，判对 0/6（未 ≥3 条变好）→ 本批 **不开 RAG**
- 对照：`_runs/20260915_pass_test_v2/v1-vs-v2.md`

## 核心指标

| 指标 | 值 | 目标 |
|------|---|------|
| L4 到达率 | 30/40 (75.0%) | ≥ 70% |
| 误拦率（预期 L4 却未到） | 10/39 (25.6%) | ≤ 10% |
| 场景匹配准确率 | 15/40 (37.5%) | — |

## 误拦明细

| VASC | 预期出口 | 实际出口 | 停在哪 | 误拦原因 |
|------|---------|---------|--------|---------|
| VASC000000313224 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000298617 | sop_generated | needs_field_clarification | L2.5 | 附件规则过严（样本少定的必填实际不必填） |
| VASC000000305805 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000309966 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000309402 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000309288 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000333423 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000292770 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000338049 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000338076 | sop_generated | transfer_human | L2 | 场景匹配 |

## 误拦原因分布

| 原因 | 次数 | 占比 |
|------|-----:|-----:|
| 信息在附件里 LLM 看不到 | 4 | 40.0% |
| 附件规则过严（样本少定的必填实际不必填） | 1 | 10.0% |
| 场景匹配 | 5 | 50.0% |

## 结论

- 误拦率 25.6% > 10% → **不能部署**，先看误拦明细再修对应场景卡/规则

### 相对 v1（修 L2 前）

| 指标 | v1 | v2 | 变化 |
|------|----|----|------|
| L4 | 24/40 (60%) | 30/40 (75%) | +6 |
| 误拦 | 16/39 (41%) | 10/39 (25.6%) | −6 |
| 场景匹配 | 11/40 | 15/40 | +4 |
| 原 24 条 L4 | — | 24/24 仍在 | 无回退 |

任务书验收：A 类场景 3/5 达标；B 类场景 0/6 未达；C 类 272679 已出 SOP、不再转人工；D 类本轮不修。误拦仍高于 15%。L2 场景匹配从 14 条降到 5 条，但多出 5 条停在 L2.5（认对场景后按该场景追问信息）。

单条 326295 单独试跑时曾判对「包裹条码批量异常」，整批 40 里变成「包裹类异常换商品标签」仍出 SOP（场景仍错）。320358 拍照暂存被串仓弱信号带偏，但仍出 SOP。

