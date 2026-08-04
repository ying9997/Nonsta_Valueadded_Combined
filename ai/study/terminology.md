# AI 客服 Multi-Expert 系统术语表

> 以线上代码实证为准，对应路径均指 `agentic/` 目录下。

---

## 架构层

| 术语 | 含义 | 代码位置 |
|------|------|---------|
| **Multi-Expert Agent** | 整体架构名称 — 多个领域专家协作回答客户问题 | 整个 `experts/` 项目 |
| **Expert** | 一个独立的领域处理单元，有明确的输入/输出合约，不直接调用其他 expert | `experts/experts/{domain}/{expert-id}/` |
| **Domain** | expert 的业务归属分组 | last-mile / inbound / outbound / value-add / sku / customer |
| **Orchestration Loop** | 编排循环 — 协调多个 expert 按顺序执行的控制流 | `experts/experts_recaller/` |
| **experts_recaller** | 编排器的具体实现，运行 Planner→Expert→Judge 循环 | `experts/experts_recaller/` |

---

## 编排流程

| 术语 | 含义 | 代码位置 |
|------|------|---------|
| **Planner** | LLM 节点，根据用户问题 + 可用 expert 列表生成线性任务队列（Markdown checklist） | `experts_recaller/prompts/queue-planner-initial.md` |
| **Replan** | 当 Judge 判定当前计划不可行时，Planner 重新规划（保留已完成 `[x]` 行） | `experts_recaller/prompts/queue-planner-replan.md` |
| **LLM-Judge** | 检查点节点 — 评估执行进度后输出 continue / replan / abort | `experts_recaller/prompts/queue-llm-judge.md` |
| **SOLUTIONS_SUFFICIENT** | Planner 的旁路判断 — 上游知识库已充分回答，无需调 expert | `queue-planner-initial.md` 中 "solutions sufficiency check" 段 |
| **chainContext** | 循环状态 — 记录当前执行链的 ID 和上下文 | `experts_recaller/nodes/check-planner-output.ts` |
| **sessionHandoff** | 结构化队列记忆 — 每个 expert 完成后追加一步，供后续 expert 和最终汇总使用 | `experts_recaller/readme.md` |
| **enrichedContext** | 跨 expert 的事实传递机制（前一个 expert 的结构化输出喂给后一个） | manifest 中 `x_recaller_propagate_previous_enriched_context` |

---

## Expert 构成

| 术语 | 含义 | 代码位置 |
|------|------|---------|
| **Manifest** | expert 的注册合约（ID、描述、capabilities、inputSchema、outputSchema） | 各 expert 的 `manifest.json` |
| **Node** | Coze Workflow 内的一个处理步骤（代码节点或 LLM 节点） | 各 expert 的 `nodes/*.ts` |
| **Prompt** | expert 的领域知识 / 指令，注入到 LLM 节点 | 各 expert 的 `prompts/*.md` |
| **Workflow** | expert 内部的执行流定义（节点间的连线和数据流） | 各 expert 的 `workflow/*.yaml` |
| **inputSchema / outputSchema** | expert 的 API 合约 — 接收什么参数、返回什么结构 | `manifest.json` 中的 JSON Schema |
| **Knowledge Base (KB)** | 广义知识库 — 包括 prompts/ 中的领域知识文档 + 外部飞书文档/数据 | `prompts/` 目录 + 外部知识源 |

---

## 上游路由

| 术语 | 含义 | 代码位置 |
|------|------|---------|
| **QID** (Question ID) | 用户问题匹配到的知识条目 ID，其 `sys_experts` 字段决定触发哪些 expert | `qa-gen_base.csv` |
| **sys_experts** | QID 上的字段 — 标记该问题需要调用哪些 expert | `qa-gen_base.csv` 列 |
| **Intent Classification** | 意图分类 — 24 类，决定问题属于哪个业务域 | `ai_agent_classification/classification/classfication.md` |
| **cs_Default_Query_v4** | 上游主 Chatflow — 从用户提问到分流的入口工作流 | `Coze离线快照/` 中的 HTML 快照 |

---

## 运行时与部署

| 术语 | 含义 | 代码位置 |
|------|------|---------|
| **Coze** | 工作流运行平台 — expert 最终以 Coze Workflow 形式部署和调用 | `workflow/*.yaml` + `coze.config.yml` |
| **coze_workflow_id** | expert 在 Coze 平台上的唯一 ID，recaller 通过它调用 expert | `qa-gen_expert_system_experts.csv` 列 |
| **release_id** | expert 版本标签，recaller 按此过滤当前可用的 expert 集合 | `experts_recaller/nodes/release-id.ts` |
| **Expert Registry** | 注册表 — 存在飞书多维表格中，包含所有 expert 的 manifest 信息 | `scripts/sync-expert-register/` 同步脚本 |

---

## 决策判断用语

当面对业务需求时，需要判断的层次：

| 层次 | 问题 | 对应动作 |
|------|------|---------|
| **新增 Expert** | 现有 expert 都无法处理这类问题 | 创建新 manifest + nodes + prompts + workflow |
| **调整 KB / Prompt** | expert 已存在但知识不够或不准确 | 修改 `prompts/*.md` 中的领域知识 |
| **调整编排 (Orchestration)** | expert 间的调用顺序或条件需要变化 | 修改 recaller 的 planner prompt 或 judge 逻辑 |
| **调整 QID 绑定** | 问题能匹配到 expert 但没被触发 | 修改 `qa-gen_base.csv` 中的 `sys_experts` |
| **调整 Schema** | expert 需要新的输入参数或输出字段 | 修改 `manifest.json` 的 inputSchema/outputSchema |
| **调整 Node 逻辑** | 数据获取或处理逻辑需要变化 | 修改 `nodes/*.ts` 代码 |
