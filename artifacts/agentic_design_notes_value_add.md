# 增值 AI 助手的 Agentic 设计说明

## 1. 为什么需要这份说明

当前“增值 AI 助手”容易被理解成一个万能大 Agent：客户问什么、系统判断什么、审核怎么过、仓库 SOP 怎么写，全部交给一个模型完成。

这个理解风险很高。

更准确的设计是：

> 对外是一个统一的“增值 AI 助手”；
> 对内是一套 workflow-driven Agent 应用，由固定业务流程、局部 LLM 节点、规则校验、工具调用和人工确认共同组成。

也就是说，本项目不是让模型自由发挥，而是把业务链路拆成可控节点：先分流，再补全，再识别场景，再检查资料，再生成 SOP，最后由人确认。

## 2. 官方概念怎么理解

OpenAI Agents SDK 中，Agent 可以理解为一个配置了模型、指令、工具、保护栏、转交机制和结构化输出的智能执行单元。官方文档中提到，Agent 可以配置 `instructions`、`tools`、`guardrails`、`handoffs`，并通过 agent loop 在模型调用、工具调用、任务转交和最终输出之间循环执行。

参考：

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents SDK Guide](https://developers.openai.com/api/docs/guides/agents)

| 概念 | 通俗理解 | 在本项目里的含义 |
|---|---|---|
| `instructions` | 岗位说明书 | 告诉增值 Expert 只能做非标增值需求补全、场景判断、SOP 草稿，不能承诺审核、费用、时效 |
| `tools` | 可调用能力 | 查 OMS 单据、查附件状态、查历史 SOP、查场景库、查责任人、发飞书消息 |
| `guardrails` | 保护栏 / 风控规则 | 不得编造事实；不得自动审批；A/B 未签批不得 hard gate；提交/保存必须人工确认 |
| `handoffs` | 任务转交 | 智能客服主 Agent 把“非标增值需求”转交给增值 SOP Expert |
| `structured outputs` | 固定格式输出 | `outputPath`、`sceneKey`、`missingFields`、`missingAttachments`、`warehouseSop` |
| `agent loop` | 执行循环 | 模型判断 -> 调工具 -> 看结果 -> 继续或结束 |

## 3. workflow 和 workflow-driven Agent 的区别

这里要避免一个误解：

> 不是每个 workflow 都是 Agent；
> 也不是每个步骤都要拆成 Agent。

更准确的区分是：

| 形态 | 谁决定下一步 | 典型表现 | 本项目例子 |
|---|---|---|---|
| 纯 workflow | 代码或流程图决定 | 固定节点顺序 | `validate -> context-bind -> check-requirement -> match-template -> check-completeness -> format-output` |
| 纯 Agent | 模型动态决定 | 模型自己判断下一步调什么工具 | 开放式排查、复杂问答、探索任务 |
| workflow-driven Agent 应用 | 大流程固定，局部节点用 LLM | 可控流程 + 局部智能判断 | 增值审核 Copilot |
| Multi-Agent 系统 | 主控调度多个专家 Agent | 一个主 Agent 调多个领域专家 | 智能客服主 Agent 调用增值 SOP Expert |

LangGraph 也有类似区分：workflow 通常是预设代码路径，agent 更动态地决定过程和工具使用。

参考：

- [LangGraph Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)

本项目建议用这个表述：

> 这是一套 workflow-driven Agent 应用：主流程固定，LLM 只在需求理解、场景判断、SOP 生成等节点发挥作用。

## 4. 为什么当前不只是 workflow

不是因为项目里画了 workflow，所以它就是 workflow-driven Agent 应用；而是因为这个 workflow 已经在定义“AI 能力如何被流程约束、如何调用知识和工具、如何产出结构化结果、如何交给人确认”。

如果只是画了流程，它只是 workflow 设计。

如果这个流程里有 LLM 节点、工具调用、业务规则、结构化输出、人工确认和可评测闭环，并且目标是完成一个业务任务，那就可以叫 workflow-driven Agent 应用。

判断标准：

| 判断项 | 普通 workflow | workflow-driven Agent 应用 |
|---|---|---|
| 是否有业务目标 | 有流程目标 | 有明确用户任务目标 |
| 是否有 LLM 参与 | 不一定 | 局部节点使用 LLM 理解、生成、判断 |
| 是否有工具/数据 | 可能没有 | 会读取 OMS、附件、知识库、历史案例 |
| 是否有结构化输出 | 不一定 | 输出 `outputPath`、`sceneKey`、缺失项、SOP |
| 是否有风控边界 | 普通校验 | guardrails、人确认、禁止自动审批 |
| 是否可评测 | 流程跑通即可 | 每个节点和端到端结果都可评测 |

当前项目已经具备这些特征：

1. 明确业务目标：非标增值需求补全、场景识别、资料校验、SOP 草稿。
2. 固定流程骨架：`validate -> context-bind -> check-requirement -> match-template -> check-completeness -> generate-sop -> format-output`。
3. 局部 AI 节点：需求理解、场景边界判断、SOP 草稿生成、群通知话术。
4. 工具/数据依赖：OMS 单据、附件状态、SOP 知识库、casebook、场景卡。
5. 结构化输出：`outputPath`、`sceneKey`、`missingFields`、`missingAttachments`、`warehouseSop`。
6. 人工确认边界：不自动审批、不自动提交、不直接写 OMS，审核员或客户确认后再进入下一步。

所以当前更准确的定位是：

> 当前不是成熟 autonomous agent，也不是纯 workflow。它是一个 workflow-driven agentic application 的设计和雏形。

## 5. 为什么不是纯 Agent

本项目也不是纯 Agent，因为没有让模型自由决定：

- 我要不要查 OMS。
- 我要不要匹配场景。
- 我要不要生成 SOP。
- 我要不要审批。

这些步骤都被业务流程固定住了。

更准确地说：

> 大流程由 workflow 控制；
> 局部认知和生成任务由 LLM 完成；
> 高风险动作由规则和人工确认兜底。

这就是 workflow-driven Agent 应用的核心。

## 6. 本项目里哪些节点用 LLM

### 6.1 内部审核视角

内部审核场景下，它不是被智能客服主 Agent 调度的专家，而是一个直接服务审核流程的 AI 应用。

推荐流程：

```text
待审核增值单
-> 拉取 OMS 事实
-> 需求完整性检查
-> 场景识别
-> 资料/附件完整性校验
-> SOP 草稿生成
-> 群通知 / 审核员确认
```

各节点是否需要 LLM：

| 节点 | 是否需要 LLM | 原因 |
|---|---|---|
| 拉取 OMS 事实 | 否 | 这是确定性工具/API |
| 基础入参校验 | 否 | 规则校验即可 |
| 需求完整性检查 | 部分需要 | 明确字段可规则判断；客户描述含糊时可用 LLM 判断是否缺关键信息 |
| 场景识别 | 部分需要 | 当前可先用 deterministic scoring；后续可用 LLM/reranker 处理边界和歧义 |
| 资料/附件完整性校验 | 原则上不需要 | 必填字段和附件应走规则，不应由 LLM 自由判断 |
| SOP 草稿生成 | 需要 | 需要把结构化事实改写成仓库可执行 SOP |
| 风险提示 | 部分需要 | 固定风险用规则；复杂风险可用 LLM 总结，但不能替代审批 |
| 群通知文案 | 可用 LLM | 根据缺失项生成清楚、克制的通知话术 |
| 审核通过/驳回 | 不应由 LLM 决定 | 必须人工确认 |

结论：

> 内部审核侧，LLM 主要用于“理解模糊需求、处理边界场景、生成 SOP 草稿、生成沟通话术”；
> 不用于“决定是否审核通过、是否自动写入 OMS、是否强制拦单”。

### 6.2 智能客服视角

智能客服场景下，增值能力是主 Agent 下面的一个专家 Expert。

推荐流程：

```text
客户输入
-> 智能客服主 Agent 判断意图
-> handoff / tool call 到增值 SOP Expert
-> 增值 Expert 做需求补全、场景识别、SOP 草稿
-> 返回结构化结果
-> 主 Agent 展示、追问或转人工
```

各节点是否需要 LLM：

| 节点 | 是否需要 LLM | 原因 |
|---|---|---|
| 智能客服意图识别 | 需要 | 判断客户是不是增值相关问题 |
| 是否转交增值 Expert | 可规则 + LLM | 高置信场景可规则，复杂表达可 LLM 判断 |
| 需求补全追问 | 需要 | 客户语言口语化，需要动态追问 |
| 场景识别 | 部分需要 | 可用规则/场景卡初筛，LLM 处理歧义 |
| 附件/字段检查 | 原则上不需要 | 应根据页面字段和 OMS 附件状态确定 |
| SOP 草稿生成 | 需要 | 生成客户可确认、仓库可执行的草稿 |
| 一键回填建议 | 不需要 LLM 做最终动作 | LLM 只输出结构化 `uiActionProposal`，前端按白名单执行 |
| 提交/审批 | 不应由 LLM 决定 | 客户确认、审核人员确认后才可继续 |

结论：

> 智能客服侧，LLM 的价值在“理解客户意图、动态追问、归纳成稿”；
> 但页面写入、提交、审批必须由系统规则和人工确认控制。

## 7. 它在两个场景里的身份不同

同一套增值 AI 能力，在不同入口下身份不同。

| 使用场景 | 它是什么 | 解释 |
|---|---|---|
| 智能客服 | Multi-Agent 系统里的增值 SOP Expert | 主 Agent 负责客户入口、对话上下文和专家调度；增值 Expert 只负责非标增值这一段 |
| 内部审核 | 审核辅助 AI 应用 / workflow-driven Agent 应用 | 它直接读取待审核单，按固定流程做质检、分流、资料检查和 SOP 草稿 |

可以这样统一表述：

> 它不是两套 Agent，而是一套可复用的增值领域能力。
> 在智能客服里，它作为专家 Agent 被主 Agent 调用；
> 在内部审核里，它作为审核辅助 AI 应用独立运行。

## 8. 什么时候一个节点才值得叫 Agent

不是每个步骤都要叫 Agent。

只有同时满足下面几个条件时，才建议叫一个 Agent：

| 判断标准 | 说明 |
|---|---|
| 有独立目标 | 不是简单函数，而是能完成一个明确任务 |
| 有自己的 instructions | 有独立角色、规则和边界 |
| 有自己的工具/知识库 | 能调用专属 API 或知识库 |
| 有清晰输入输出 | 上游知道怎么调用，下游知道怎么消费 |
| 可以独立测试 | 能单独跑用例和评估 |
| 可以被主控调用或 handoff | 可以作为专家能力接入主流程 |

以本项目为例：

| 模块 | 建议叫法 | 是否是 Agent |
|---|---|---|
| `validate-input` | 校验节点 | 不是 |
| `context-bind` | 事实绑定节点 | 不是 |
| `check-requirement` | 需求完整性节点 | 通常不是，除非后续复杂到独立维护 |
| `match-template` | 场景识别节点 | 当前不是 Agent，后续可升级为场景识别 Expert |
| `check-completeness` | 资料完整性校验节点 | 不是 |
| `llm-generate-sop` | SOP 生成节点 | 可视复杂度升级为 SOP Expert |
| `nonstandard-sop-guide` | 增值 SOP Expert | 在智能客服下可以叫专家 Agent |
| 内部审核 Copilot | 审核辅助 AI 应用 | 是应用，不一定是单个 Agent |

这给项目预留了扩展性：

- 如果 `match-template` 后续需要独立场景知识库、历史案例召回、reranker、置信度校准和单独评测，它可以升级为“场景识别 Expert”。
- 如果 `llm-generate-sop` 后续需要多模板、多语言、仓库差异、审核意见吸收和独立质量评估，它可以升级为“SOP 生成 Expert”。

## 9. 应用和 Agent 怎么区分

| 概念 | 定义 | 本项目例子 |
|---|---|---|
| Agent | 一个智能执行单元 | 增值 SOP Expert |
| Workflow | 一条确定性流程 | 审核链路节点顺序 |
| Tool | 被 Agent 调用的外部能力 | OMS 查询、附件查询、飞书通知 |
| Application | 面向用户完成业务闭环的产品形态 | 内部审核 Copilot、客户侧 AI 指引侧栏 |

一句话：

> Agent 是能力单元，Application 是产品形态。
> 一个应用可以包含一个 Agent、多个 Agent，或者 workflow + LLM 节点的组合。

## 10. 推荐对业务方的表达

不要说：

> 我们做了很多 Agent。

建议说：

> 我们把增值 AI 助手设计成一个统一入口下的分层能力，不是一个大模型黑盒。
> 业务上分三层：下单前引导、审核前质检、SOP 辅助生成。
> 技术上采用 workflow-driven Agent 设计：主流程固定，关键节点使用 LLM，所有高风险动作保留人工确认。
> 一期先做内部审核 Copilot 和 F-001 最小闭环；A/B 场景先进入识别候选，不做自动拦单和正式审批判断。

## 11. 参考资料

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents SDK Guide](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI Agent Definitions](https://developers.openai.com/api/docs/guides/agents/define-agents)
- [OpenAI Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [OpenAI Guardrails and Human Review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
- [OpenAI Running Agents](https://developers.openai.com/api/docs/guides/agents/running-agents)
- [LangGraph Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [LangChain Multi-Agent](https://docs.langchain.com/oss/python/langchain/multi-agent)
- [Microsoft Copilot Studio Human Review](https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-request-for-information)
