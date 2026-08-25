# 增值推荐决策层

本目录是 `value-add-recommendation-rules`，用于承载增值产品推荐的决策层规则。它不替代现有事实层知识库，只引用事实层的异常定义、异常到 VASC 映射、VASC 到服务项编排等事实。

## 与事实层的关系

| 层级 | 目录 | 职责 | 本目录使用方式 |
|------|------|------|----------------|
| 事实层 | `agentic/value-add-service-guide/` | 异常定义、映射关系、原子编排、原子证据状态 | 只读引用，不修改 |
| 决策层 | `增值配置AI化/增值单ai指引助手/value-add-recommendation-rules/` | forbidden 校准、推断规则、意图追问、H 规则、字段清单、话术约束 | 本目录新增维护 |

事实层回答“B0102E23 能映射到哪些产品、产品包含哪些原子”。决策层回答“在系统已圈定候选的前提下，应该如何校准、追问、组织话术和收集字段”。

## D6 硬分流边界

本目录必须遵守 D6 业务会确认的硬分流边界：

- 产品圈定权威 = 前端/中间层调用系统接口 `listAllVasc` 后注入的 `systemScopedVascList`。
- KB/决策层只做：`forbiddenProducts` 校准、意图追问、话术约束、字段清单提示。
- 禁止 LLM 自行从离线 KB 扩推荐范围。
- 禁止把 xlsx、对照表或本目录规则当运行时权威；它们只能作为系统候选内的校准参考。
- 当 `systemScopedVascList` 为空或与客户意图冲突时，必须转人工或追问，不得凭离线映射补推荐。

来源：

- `_workflow/20260720_增值预配置和客户引导助手规划/shared/D6_业务会_异常单增值客户引导.md`
- `_workflow/20260720_增值预配置和客户引导助手规划/module_异常单增值客户引导/deliverables/一期业务系统映射关系矩阵_定稿.md`

## MVP 文件

| 文件 | 内容 | 来源 |
|------|------|------|
| `system-prompt.md` | AI 专家 system prompt 与运行边界 | `test_prompt_B0102E23.json.systemPrompt`，源文件位于 2026-07-20 交付目录 |
| `inference-rules.md` | 客户描述关键词到处理方式的推断规则 | `test_prompt_B0102E23.json.enrichedContext.inferenceRules`，源文件位于 2026-07-20 交付目录 |
| `h-rules.md` | H01-H18 校准规则 | 映射矩阵定稿 §5 |
| `forbidden-products.md` | 禁推 / 降级 / 转人工清单 | `test_prompt_B0102E23.json.forbiddenProducts` + 映射矩阵 §3.3 / §5；`入库商品拍照` 按用户裁决为产品级全局禁推 |
| `intent-routing/B0102E23.md` | A+包裹质量异常意图路由 | `test_prompt_B0102E23.json.intentTriples` |
| `intent-routing/B03E03.md` | 包裹内出现订单外商品意图路由 | 映射矩阵 §3.2 / §4.1 / §4.2 |
| `field-requirements/*.md` | B0102E23 案例已出现字段 | `test_prompt_B0102E23.json.fieldRequirements` |
| `nonstandard-sop/2.1-inbound-relabel-shelving.md` | 非标 2.1 换标上架的客户填写层追问与确认用 SOP 摘要边界 | 非标 SOP 知识库 §2.1 + SOP 模板 + D6 口径 |
| `test-cases/TC-B0102E23-001.json` | B0102E23 最小测试用例 | 复制 2026-07-20 交付目录中的 `test_prompt_B0102E23.json`，已通过 JSON parse 自检 |
| `BACKLOG.md` | 本步延后事项 | 用户指定范围 |
| `EXEC_REPORT.md` | 执行报告与自检 | 本次执行 |

## 运行时输入约定

推荐专家使用本目录时，必须先从上游拿到：

- `exceptionFacts`：异常单事实，如 `eventCode`、`eventName`、`warehouseCode`、`pscCode`、原入库单号等。
- `systemScopedVascList`：由中间层 `listAllVasc` 注入的系统候选产品，唯一产品范围权威。
- `forbiddenProducts`：由中间层或规则层计算后的禁推项。
- `hRulesHit`：命中的 H 规则。
- `fieldRequirements`：已查证字段清单；未查证字段必须标 `pending`。

## 输出边界

允许输出：

- 在 `systemScopedVascList` 内推荐产品。
- 对客户描述进行处理意图推断。
- 对多产品可选场景提出必要追问。
- 告知客户必填字段和值来源。
- 基于 H 规则执行 block / downgrade / ask_intent / manual。
- 当系统候选明确落到非标/特批，且场景匹配非标 SOP 时，输出客户填写层追问和客户确认用 SOP 摘要。

禁止输出：

- 推荐不在 `systemScopedVascList` 内的产品。
- 推荐 `forbiddenProducts` 中的产品。
- 把 pending 字段当作已查证枚举。
- 报价、承诺审核结果、描述仓库内部操作流程。
- 将客户确认用 SOP 摘要解释为审核通过，或在无客户确认时静默下发仓库执行。
- 输出 AI 内部推理过程给客户。
