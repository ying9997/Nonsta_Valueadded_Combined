# 已审核通过单跑批验证报告（v3）

## 统计

- 测试集：同一批 40 条（与 v1/v2 相同）
- Pipeline：sceneLlmVersion=2, **RAG 关**, `--skip-feishu`, OMS_WRITE=0
- 对照：`_runs/20260915_pass_test_v3/v2-vs-v3.md`

## 核心指标

## 核心指标

| 指标 | 值 | 目标 |
|------|---|------|
| L4 到达率 | 29/40 (72.5%) | ≥ 70% |
| 误拦率（预期 L4 却未到） | 10/39 (25.6%) | ≤ 10% |
| 场景匹配准确率 | 17/40 (42.5%) | — |

## 误拦明细

| VASC | 预期出口 | 实际出口 | 停在哪 | 误拦原因 |
|------|---------|---------|--------|---------|
| VASC000000299199 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000330249 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000270780 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000326295 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000329235 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000305805 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000326745 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000335355 | sop_generated | transfer_human | L2 | 场景匹配 |
| VASC000000309288 | sop_generated | needs_field_clarification | L2.5 | 信息在附件里 LLM 看不到 |
| VASC000000292770 | sop_generated | transfer_human | L2 | 场景匹配 |

## 误拦原因分布

| 原因 | 次数 | 占比 |
|------|-----:|-----:|
| 场景匹配 | 8 | 80.0% |
| 信息在附件里 LLM 看不到 | 2 | 20.0% |

## 结论

- 误拦率 25.6% > 10% → **不能部署**

### 相对 v2

| 指标 | v2 | v3 | 变化 |
|------|----|----|------|
| L4 | 30/40 | 29/40 | −1 |
| 误拦 | 10/39 (25.6%) | 10/39 (25.6%) | 持平 |
| 场景匹配 | 15/40 | 17/40 | +2 |

B 类场景 5/6 认对（达标）。L2.5 原先认对的 3 条里，外观 2 条已出说明；串仓那条出了说明但场景漂到包裹条码。误拦条数没降，是因为规则 A 把「包裹条码异常」扩宽后，组合/换商品标签等好几条从能出说明变成转人工。

新口径（蓝卡选场景 / 橙卡跳过 / 真误拦）见 `deploy-readiness.md`：真误拦 0/39，一步可达 39/40。

