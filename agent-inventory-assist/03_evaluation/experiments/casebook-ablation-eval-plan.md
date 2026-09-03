# Casebook 是否提升 Agent 表现的对照实验设计

## 1. 实验目的

本实验用于验证：在 `match-template`、需求完整性判断、追问生成、SOP 生成等节点中，引入 Casebook 案例库是否能提升 Agent 表现。

当前主链路优先跑通，不把本实验作为一期上线阻塞项。主框架稳定后，再用本实验评估 Casebook 的真实收益。

## 2. 实验对象

Agent 工作流核心链路：

```text
Start
→ Context Load
→ check-requirement
→ match-template
→ check-completeness
→ SOP Generation
→ Response / IM Generation
→ End
```

本实验重点观察以下节点：

| 节点 | 是否纳入实验 | 关注点 |
|---|---|---|
| check-requirement | 是 | 是否正确识别需求描述缺失项，是否生成正确追问 |
| match-template | 是 | 是否正确召回、排序、选择场景 |
| check-completeness | 是 | 是否正确判断字段/附件缺失 |
| SOP Generation | 是 | 生成 SOP 是否准确、可执行、无幻觉 |
| Response / IM Generation | 可选 | 群内通知是否清楚、责任人是否明确 |

## 3. 对照组设计

### A 组：SOP KB Only

只使用 SOP 知识库。

```text
输入单据
→ SOP KB 检索 / 规则匹配
→ Agent 输出
```

用途：建立基线，判断只靠标准 SOP 能做到什么程度。

### B 组：SOP KB + Casebook Rules

使用 SOP 知识库，加上 Casebook 中抽取出来的规则。

```text
输入单据
→ SOP KB 检索 / 规则匹配
→ Casebook 规则补充
→ Agent 输出
```

用途：验证历史案例沉淀出来的规则，是否能减少误判和漏判。

### C 组：SOP KB + Casebook Rules + Similar Cases

使用 SOP 知识库、Casebook 规则，并检索相似历史案例作为参考证据。

```text
输入单据
→ SOP KB 检索 / 规则匹配
→ Casebook 规则补充
→ 相似案例检索
→ Agent 输出
```

用途：验证相似案例是否能进一步提升边界场景判断和追问质量。

## 4. 数据集要求

建议使用独立评测集，不直接拿 Casebook 原始案例当考试题。

每个场景至少准备：

| 类型 | 数量建议 | 说明 |
|---|---:|---|
| 正例 | >= 5 条 | 明确属于该场景 |
| 近邻反例 | >= 3 条 | 与该场景相似，但不应命中 |
| 缺信息样本 | >= 3 条 | 需求描述不完整，需要追问 |
| 附件/字段缺失样本 | >= 3 条 | 场景已明确，但材料不完整 |
| 人工兜底样本 | >= 2 条 | 无法归入当前支持场景 |

优先评测的 3 个场景：

1. `F-001: 入库尺重/标签辨识后换标上架`
2. `包裹类异常换商品标签上架`
3. `指定商品拍照暂存`

## 5. 指标设计

### 5.1 match-template 指标

| 指标 | 定义 |
|---|---|
| Top-1 Accuracy | 排名第一的场景是否等于人工标注场景 |
| Recall@K | 正确场景是否出现在 Top K 候选中 |
| MRR | 正确场景排名越靠前分数越高 |
| Unsupported Accuracy | 不支持场景是否正确转人工 |
| Ambiguous Handling Rate | 多个候选接近时，是否正确进入澄清/人工分流 |

### 5.2 check-requirement 指标

| 指标 | 定义 |
|---|---|
| Missing Slot Recall | 应追问的缺失项是否都识别出来 |
| Missing Slot Precision | 提出的缺失项是否确实需要补充 |
| Clarification Quality | 追问是否具体、可回答、面向业务人员 |
| Premature Routing Rate | 需求不完整时是否错误提前进入 match-template |

### 5.3 check-completeness 指标

| 指标 | 定义 |
|---|---|
| Attachment Missing Accuracy | 附件缺失判断是否正确 |
| Field Missing Accuracy | 字段缺失判断是否正确 |
| False Block Rate | 材料已齐时是否误拦截 |
| False Pass Rate | 材料不齐时是否误放行 |

### 5.4 SOP Generation 指标

| 指标 | 定义 |
|---|---|
| Factuality | SOP 是否符合知识库规则 |
| Actionability | 审核人员是否能直接执行 |
| Hallucination Rate | 是否编造不存在的规则、附件、操作 |
| Human Acceptance Score | 业务审核人员是否接受，建议 1-5 分 |

## 6. 实验输出格式

每次实验输出一份结果表：

| case_id | gold_scene | variant | predicted_scene | output_path | missing_items | pass/fail | error_type |
|---|---|---|---|---|---|---|---|

其中 `variant` 取值：

```text
A_sop_only
B_sop_casebook_rules
C_sop_casebook_rules_cases
```

建议额外保存每条样本的完整输出 JSON，方便回溯。

## 7. 通过线建议

主框架跑通后的第一轮目标：

| 指标 | 最低通过线 |
|---|---:|
| match-template Top-1 Accuracy | >= 80% |
| match-template Recall@3 | >= 90% |
| check-requirement Missing Slot Recall | >= 85% |
| check-completeness False Pass Rate | = 0 |
| SOP Hallucination Rate | = 0 |
| 人工兜底误伤率 | 可接受，但需记录原因 |

注意：早期宁可多转人工，不要错误放行。

## 8. Casebook 的使用边界

Casebook 不能作为场景权威来源。

权威优先级：

```text
SOP KB > 业务签批规则 > Casebook 抽取规则 > 相似历史案例
```

Casebook 主要用于：

1. 补充边界判断；
2. 解释为什么某类单据失败；
3. 提炼追问项；
4. 辅助区分近邻场景；
5. 提供 SOP 生成时的历史参考。

Casebook 不应单独决定一个新场景是否被支持。

## 9. 执行时机

本实验不阻塞当前主链路。

推荐顺序：

```text
1. 先跑通单据输入 → check-requirement → match-template → 分流
2. 再补 2/3 个场景，让 match-template 从二分类升级为多场景
3. 再设计评测集
4. 最后执行 A/B/C 对照实验
```

## 10. 当前结论

Casebook 是否有效，不应凭感觉判断，应通过评测集对照实验验证。

如果 B 组明显优于 A 组，说明 Casebook 规则有价值。

如果 C 组优于 B 组，说明相似案例检索有额外收益。

如果 C 组没有提升甚至变差，说明相似案例可能引入噪声，应先只使用 Casebook 规则，不把案例全文直接喂入决策链路。
