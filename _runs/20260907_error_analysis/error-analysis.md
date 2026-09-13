# 错误归因报告（183 历史 F-001 池）

- 输入：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260901_oms_facts\details.json`
- 样本数：183
- 模式：`runPipeline({ skipLlm: true })`（只跑规则）
- 说明：池内单曾标 F-001 场景码，但需求文案未必都能被当前规则判为 supported

## 汇总表

| 节点 | 分类 | 数量 | 占比 | 说明 |
|------|------|------|------|------|
| match-template | ambiguous（边界模糊） | 69 | 37.7% | F-001 vs A/B 或置信不足 |
| check-completeness | 缺操作说明 | 49 | 26.8% | 缺操作说明附件 |
| match-template | unsupported（不是换标） | 41 | 22.4% | 拦截/暂存/直接上架等非换标 |
| check-requirement | 缺操作动作 | 16 | 8.7% | 有描述但不明确操作动作 |
| check-completeness | 缺对应关系 | 6 | 3.3% | 缺商品/标签对应关系 |
| check-completeness | 全齐 → sop_generated | 2 | 1.1% | 规则侧可出 SOP |

合计：183 / 183

## Top 5 高频错误原因

### 1. match-template / ambiguous（边界模糊）（69，37.7%）

- 说明：F-001 vs A/B 或置信不足
- 示例单号：VASC000000344421、VASC000000342681、VASC000000332922

### 2. check-completeness / 缺操作说明（49，26.8%）

- 说明：缺操作说明附件
- 示例单号：VASC000000343821、VASC000000333147、VASC000000332778

### 3. match-template / unsupported（不是换标）（41，22.4%）

- 说明：拦截/暂存/直接上架等非换标
- 示例单号：VASC000000335325、VASC000000334098、VASC000000324960

### 4. check-requirement / 缺操作动作（16，8.7%）

- 说明：有描述但不明确操作动作
- 示例单号：VASC000000321243、VASC000000321231、VASC000000321210

### 5. check-completeness / 缺对应关系（6，3.3%）

- 说明：缺商品/标签对应关系
- 示例单号：VASC000000333237、VASC000000311247、VASC000000207243

## 优化建议

- 如果放宽/修正 check-requirement「缺操作动作」规则，预期约 16 条可能从 L1 进入 L2（需人工复核，避免误放行）。
- match-template unsupported 41 条：多为拦截/非换标，不应用 F-001 正例优化强行吸入。
- ambiguous 69 条：优先补边界特征（辨识信号 / 包裹类异常信号），而不是降低阈值阈值。
- check-completeness 材料缺口（操作说明 49 + 对应关系 6）：可对客服首问话术做清单化，预期减少 L3 往返。
- 本池进入 check-completeness 或更后共 57 条（含缺附件与全齐）。

结构化明细见 `error-analysis.json`。
