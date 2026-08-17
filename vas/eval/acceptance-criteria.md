# Golden Set Acceptance Criteria

## 通过条件

| Gate | Required result | 判定口径 |
|---|---:|---|
| route accuracy | 100% | 9 条 golden-set 用例与 3 条 attachment-candidates 用例的 `expected.route` 必须完全命中。 |
| schema violations | 0 | 输出必须满足 AgentGuideResult 结构：route、matchState、matchConfidence、selectedVasc、selectedService、fieldSuggestions、confirmationSummary、missingFields、attachmentRequirements、attachmentCheck、pageActions、displayText、customerMessage、decisionTrace 均存在且类型正确。 |
| 候选外推荐 | 0 | `selectedVasc` / `selectedService` 必须来自 `input.candidateSnapshot.systemScopedVascList`，不得推荐候选外产品、服务项或原子。 |

## 评分维度

每个维度按单条用例计分：通过 = 1，失败 = 0；不适用 = N/A，不进入该维度分母。模型总分可按维度求平均，也可分别报告关键 gate。

| # | 维度 | 判定规则 | 计分方式 |
|---:|---|---|---|
| 1 | 路由是否正确 | `actual.route === expected.route`。 | 1/0；该项参与 route accuracy。 |
| 2 | 是否只推荐候选内产品/服务项 | `actual.selectedVasc.candidateId` 和 `actual.selectedService.serviceCode` 必须能在候选快照中找到。 | 1/0；任一候选外推荐即失败。 |
| 3 | 是否正确区分 2a 与 2b | 2a 不进入 SOP 长追问；2b 不冒充具体命名服务项。 | 1/0；只对 2a/2b 计分。 |
| 4 | 2d 是否正确返回标准增值路径 | 2d 必须输出 `2d_standard_redirect`，字段建议为空，`pageActions` 不含 `fill_field`。 | 1/0；只对 2d 计分。 |
| 5 | 2b 是否先模板匹配再追问 | 有模板时最小追问；信息不足时输出结构化 `missingFields` 和追问动作。 | 1/0；只对 2b 计分。 |
| 6 | 是否避免编造 SOP | 无候选或无模板证据时不得伪造历史 SOP、客户确认或附件内容。 | 1/0；发现编造即失败。 |
| 7 | 是否包含“客户确认不等于审核通过” | 2b 且 `matchState=matched` 时，`confirmationSummary` 必须包含该句。 | 1/0；只对 matched 2b 计分。 |
| 8 | 是否生成可填入原字段的建议 | 仅在允许填写时输出 `fieldSuggestions.background` / `description`；2d 必须为空。 | 1/0；按分支规则判定。 |
| 9 | 是否输出附件要求提示 | `attachmentRequirements` 必须与 SOP 摘要、字段建议、候选附件要求一致。 | 1/0；无附件要求时空数组为通过。 |
| 10 | 是否正确执行轻量附件检查 | `attachmentCheck` 只基于附件元数据给出 `state`、`missingRequired`、`warnings`，不强制拦截业务流。 | 1/0；附件专题重点计分。 |
| 11 | 是否触发禁止输出 | 不得命中用例 `forbiddenOutputs`；如实际输出违反任一条，记为失败。 | 1/0；人工复核可补充判定。 |

## 分支判定口径

- 2d：应返回标准增值路径，不继续引导填写非标字段；允许给出复制建议或追问缺失信息，但不得启用 `fill_field`。
- 2a：必须直接命中候选内命名非标原子；`confirmationSummary=null`；不得推荐“入库/出库其他服务需求”兜底项。
- 2b：必须走 `2b_other_service_sop`；信息不足时输出结构化追问；`matchState=matched` 的确认摘要必须包含“客户确认不等于审核通过”。

## 多模型对比方式

1. 固定同一批 `golden-set.json` 和 `attachment-candidates.json` 输入。
2. 固定 AgentGuideResult JSON schema 和字段校验器。
3. 固定本文件评分规则和 forbiddenOutputs 判定口径。
4. 每个模型分别记录：route accuracy、候选内推荐准确率、SOP 字段完整率、违规输出率、人工复核备注。
5. 任一模型出现 schema violations、候选外推荐或 route accuracy 未达 100%，不得判定通过。
