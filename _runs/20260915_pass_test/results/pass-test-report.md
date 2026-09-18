# 已审核通过单跑批验证报告

## 统计

- 测试集：40 条已审核通过的增值单
- Pipeline 配置：sceneLlmVersion=2, RAG=off, `--skip-feishu`, OMS_WRITE=0

## 核心指标

| 指标 | 值 | 目标 |
|------|---|------|
| L4 到达率 | 24/40 (60.0%) | ≥ 70% |
| 误拦率（预期 L4 却未到） | 16/39 (41.0%) | ≤ 10% |
| 场景匹配准确率 | 11/40 (27.5%) | — |

## 误拦明细

| VASC | 预期出口 | 实际出口 | 停在哪 | 误拦原因 |
|------|---------|---------|--------|---------|
| VASC000000270780 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000326295 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000313224 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000298617 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000305805 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000309966 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000335355 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000272679 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000309402 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000309288 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000333423 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000292770 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000338049 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000344016 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000321948 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000338076 | sop_generated | transfer_human | L2 | 场景匹配 |

## 误拦原因分布

| 原因 | 次数 | 占比 |
|------|-----:|-----:|
| 信息在附件里 LLM 看不到 | 2 | 12.5% |
| 场景匹配 | 14 | 87.5% |

## 结论

- 误拦率 41.0% > 10% → **不能部署**，先看误拦明细再修对应场景卡/规则

### 读数时注意

- 这次要修的 L2.5（「附件里有仍追问」）不是主因：包裹类异常换商品标签 3 条里 **3 条都到了 L4**（其中 2 条场景也认对）。
- 14 条停在 L2，是场景认不准/转人工。库内场景更明显（外观辨识、加固、A+换标、良品转不良）。
- 仅剩 2 条停在 L2.5，且都是 **先认错场景，再按错场景的必填信息追问**（组合后上架被认成换商品标签后追问新入库单号；第三方条码被认成尺重辨识后追问处理数量），不是「Excel 里有数量仍追问」那种原问题。
- 另有 1 条 SOP 生成失败（`VASC000000333147`），第一轮出口仍记为 sop_generated，未计入误拦。

