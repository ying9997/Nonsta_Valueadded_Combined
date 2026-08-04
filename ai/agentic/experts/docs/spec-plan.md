# Agent 专家系统 Spec 方案

## 1. 方案目标

本方案定义 `experts_target` 中“专家”的标准规格，使每个专家都能被任意上游系统稳定发现、校验、调用和链式编排。

核心目标：

- 专家实现与上游调度解耦。
- 每个专家通过 `manifest.json` 暴露元数据、输入 Schema 和输出 Schema。
- 每个专家使用统一调用结构承接上下文，并产出统一的下游上下文。
- 每个专家可在本地开发、校验，并导出为 Coze 可运行工作流包。
- 专家内部可以调用 API、执行代码节点和 LLM 节点，但不能直接调用其他专家。

## 2. 范围边界

### 2.1 本项目负责

- 专家目录结构规范。
- 专家元数据规范。
- 业务输入 Schema 规范。
- 输出 Schema 和 `format-output` 四字段契约。
- `inputContext` / `outputContext` / `enrichedContext` 上下文规范。
- Coze FaaS 代码节点约束。
- 本地运行、校验、导出 Coze 包的交付约束。
- 专家设计、实现、验收流程。

### 2.2 本项目不负责

- 上游 planner / router 的调度策略实现。
- 多专家队列编排的完整运行时。
- 用户会话系统、权限系统、任务中心等平台能力。
- 业务数据源本身的建设。
- 跨专家直接互调。

上游系统应根据专家的 `description`、`capabilities`、`inputSchema` 和历史上下文，自行决定是否调用该专家。

## 3. 总体架构

```text
上游系统 / planner
  │
  │ 读取专家 manifest，判断是否适用
  │
  ▼
专家调用入参
  ├─ query
  ├─ customerIntent
  ├─ customerCode / customerName / username / language
  ├─ inputContext
  └─ inputs
       └─ 专家业务字段
  │
  ▼
专家工作流
  ├─ validate-input
  ├─ fetch / compute / transform
  ├─ llm 节点，可选
  └─ format-output
  │
  ▼
专家输出
  ├─ structured
  ├─ analysis
  ├─ outputContext
  └─ enrichedContext
```

## 4. 专家目录规范

每个专家必须位于：

```text
experts/{domain}/{expert-id}/
```

推荐结构：

```text
experts/{domain}/{expert-id}/
  manifest.json
  design.md
  workflow.json
  coze.config.yml
  nodes/
    validate-input.ts
    fetch-data.ts
    format-output.ts
  prompts/
    main.md
    examples.md
```

字段约束：

- `domain`：业务域，如 `last-mile`、`outbound`、`inbound`。
- `expert-id`：专家 ID，使用小写字母、数字和连字符，建议与 `manifest.id` 一致。
- `manifest.json`：专家对外契约的主入口。
- `design.md`：专家设计说明，包含适用场景、最小入参、工作流、输出字段和示例调用。
- `workflow.json`：本地运行和 Coze 导出共用的节点编排。
- `coze.config.yml`：Coze 包导出配置。
- `nodes/`：Coze 代码节点源码。
- `prompts/`：LLM 节点 Prompt。

## 5. manifest 规范

`manifest.json` 是专家可发现和可校验的核心。

### 5.1 必填字段

```json
{
  "id": "delivery-status",
  "domain": "last-mile",
  "name": "物流轨迹专家",
  "description": "获取并分析物流轨迹，提炼状态、异常、关联单据及供应链关联。Use when 用户查询物流状态、轨迹跟踪、配送异常、出库单、运单号、最后一公里、供应链追溯。",
  "capabilities": ["物流追踪", "轨迹分析", "异常识别"],
  "version": "1.0.0",
  "inputSchema": {},
  "outputSchema": {}
}
```

### 5.2 字段要求

| 字段 | 要求 |
| --- | --- |
| `id` | 专家唯一标识，正则建议 `[a-z0-9-]+`，不超过 64 字符 |
| `domain` | 业务域，用于上下文域索引和避免跨域同名冲突 |
| `name` | 人类可读名称 |
| `description` | 第三人称描述，必须包含 WHAT + WHEN，且包含 `Use when ...` |
| `capabilities` | 能力标签数组，供上游粗筛 |
| `version` | 语义化版本，便于兼容管理 |
| `inputSchema` | 只声明 `inputs` 内的业务字段 |
| `outputSchema` | 只声明业务输出的 `structured` 和 `analysis` |

### 5.3 禁止写入 inputSchema 的字段

以下字段属于框架顶层字段，不得写入 `inputSchema.properties`：

```text
query
customerIntent
inputContext
inputs
customerCode
customerName
username
language
data
```

原因：`inputSchema` 只用于描述专家自己的业务参数。框架字段由统一调用协议传入，若混入业务 Schema，会导致上游参数拼装、校验和 Coze 导出产生歧义。

## 6. 调用入参 Spec

专家被调用时，统一使用以下顶层结构：

```json
{
  "query": "用户原始问题或上游委托说明",
  "customerIntent": "当前要解决的业务问题摘要",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "zh",
  "inputContext": {
    "sourceExpertId": "",
    "previousOutput": {},
    "chainId": ""
  },
  "inputs": {
    "trackingIds": ["YTO1234567890"],
    "trajectoryText": ""
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `query` | string | 原始问题或上游委托说明，可为空 |
| `customerIntent` | string | 用户真实业务诉求摘要，可为空 |
| `customerCode` | string | 客户编码，占位必传，用于审计和 API 路由 |
| `customerName` | string | 客户名称，占位必传 |
| `username` | string | 调用用户，占位必传 |
| `language` | string | 输出语言，如 `zh` / `en` |
| `inputContext` | object | 上游上下文，可为空对象 |
| `inputs` | object | 专家业务字段，必须与 `manifest.inputSchema.properties` 对齐 |

## 7. 输出 Spec

所有专家最终必须由 `format-output` 节点返回统一四字段：

```json
{
  "structured": {},
  "analysis": "对客或对上游可读的自然语言结论",
  "outputContext": {
    "expertId": "delivery-status",
    "resultSummary": "本次结果摘要",
    "chainId": ""
  },
  "enrichedContext": {}
}
```

### 7.1 structured

`structured` 承载可解析的业务结果，例如：

- 单号、运单号、出库单号。
- 状态码、状态枚举。
- 时间戳、节点列表。
- 可供后续专家消费的事实字段。

要求：

- 字段命名稳定。
- 类型明确。
- 不放大段自然语言。
- 与 `manifest.outputSchema.properties.structured` 对齐。

### 7.2 analysis

`analysis` 承载自然语言分析、解释、建议和结论。

要求：

- 面向用户或上游系统可读。
- 不把飞书、多维表、内部 Wiki、内部链接写成对客规则依据。
- 对外规则依据应表达为合同、价卡、订单约定、政策条款或本专家内置规则摘要。
- 不嵌套整份 JSON。

### 7.3 outputContext

`outputContext` 是框架字段，不写入 `manifest.outputSchema`。

字段要求：

| 字段 | 要求 |
| --- | --- |
| `expertId` | 当前专家 ID，必须非空 |
| `resultSummary` | 给下游读取的简短摘要，必须非空 |
| `chainId` | 调用链 ID；没有时用空字符串，不得为 `null` 或 `undefined` |

### 7.4 enrichedContext

`enrichedContext` 用于给后续专家提供事实上下文。无内容时返回 `{}`。

要求：

- 放可复用事实，不放完整长文本。
- 尽量扁平，避免深层复杂结构。
- 不使用 `_meta` 作为业务字段名。
- 若专家需要自动接收前序 enrichedContext，在 `manifest.json` 根级开启：

```json
{
  "x_recaller_propagate_previous_enriched_context": true
}
```

## 8. 工作流节点 Spec

### 8.1 推荐主路径

```text
validate-input
  ↓
fetch-data / compute
  ↓
llm-analyze，可选
  ↓
format-output
```

### 8.2 validate-input

职责：

- 从 `params.inputs` 读取业务参数。
- 校验必填字段、类型、枚举、长度。
- 必填参数缺失时返回明确错误，避免继续调用外部接口。
- 兼容 `inputContext` 和 `enrichedContext`。

### 8.3 fetch-data / compute

职责：

- 调用外部 API 或执行确定性计算。
- 将外部返回转成稳定中间结构。
- 避免把上游原始大对象直接传给 LLM。
- 外部 API 不可用时提供可解释的失败输出或降级路径。

### 8.4 LLM 节点

职责：

- 基于确定性数据生成解释、归因、建议和对客话术。
- 输出 JSON 外层键必须与 `workflow.json` 中 LLM 节点 `outputs[0]` 一致。

示例：

```json
{
  "analysisResult": {
    "structured": {},
    "analysis": "自然语言结论"
  }
}
```

### 8.5 format-output

职责：

- 统一收敛代码节点、API 节点和 LLM 节点结果。
- 根级返回 `structured`、`analysis`、`outputContext`、`enrichedContext`。
- 作为 Coze 结束节点唯一数据来源。

禁止：

- 返回 `{ result: { structured, analysis } }` 包装。
- 把 `enrichedContext` 放进 `outputContext`。
- 让结束节点从非 `format-output` 节点拉最终字段。

## 9. Coze FaaS 约束

代码节点必须符合 Coze 单文件运行约束。

要求：

- 每个可执行代码节点是一个独立 `.ts` 文件。
- Coze 最终脚本不得包含 `import` / `export`。
- 本地节点源文件仅允许从仓库根目录 `shared/` import，导出时内联。
- 不得 import 其他节点文件。
- 不得 import npm 包。
- 节点入口为 `async function main({ params })`。
- 返回值必须是 Object，值可为 string / number / boolean / array / object。

代码形态：

```ts
async function main({ params }: { params: Record<string, unknown> }) {
  const inputs = params.inputs;
  return {
    ok: true,
    data: inputs
  };
}
```

## 10. 设计文档 Spec

每个专家的 `design.md` 至少包含：

1. 调用说明。
2. 适用场景。
3. 不适用场景。
4. 最小入参。
5. 参数说明。
6. 示例调用 JSON。
7. 数据来源与降级策略。
8. 工作流分支。
9. 输出字段设计。
10. 对客输出约束。
11. `enrichedContext` 是否产出或消费。

示例调用必须使用真实字段名：

```json
{
  "query": "帮我查这个运单为什么还没签收",
  "customerIntent": "查询尾程配送状态",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "zh",
  "inputContext": {
    "chainId": "chain-001",
    "sourceExpertId": "",
    "previousOutput": {}
  },
  "inputs": {
    "trackingIds": ["YTO1234567890"]
  }
}
```

## 11. 校验与验收

### 11.1 单专家验收

- `manifest.id` 与目录名一致。
- `description` 含 `Use when ...`。
- `inputSchema` 不含框架保留字段。
- `outputSchema` 不含 `outputContext`。
- `design.md` 含调用说明和示例 JSON。
- `workflow.json` 中所有 `file` 均存在。
- 所有可执行节点符合 `main({ params })` 形态。
- `format-output` 返回四字段。
- `coze.config.yml` 的 `endOutputs` 四字段均来自 `format-output`。
- 本地 `npm run dev:expert <expert-id> -- ...` 可运行。
- `npm run export:coze -- experts/{domain}/{expert-id}` 可导出。

### 11.2 仓库级验收

建议提交前执行：

```bash
npm run check:coze-node-code
npm run check:format-output-contract
npm run check:coze-port-wiring
npm run check:coze-io
npm run check:experts:manifest
```

如接入 Coze 包导出：

```bash
npm run export:coze -- experts/{domain}/{expert-id} --validate
```

## 12. 版本与兼容

### 12.1 兼容原则

- 新增字段优先作为可选字段。
- 修改字段含义必须提升版本号。
- 删除字段前应先标记 deprecated，并保留兼容期。
- 输出字段一旦被上游消费，不得随意改名。
- `analysis` 文案可以演进，但 `structured` 字段应稳定。

### 12.2 版本号建议

```text
1.0.0  首个可用版本
1.1.0  新增向后兼容字段或能力
2.0.0  输入输出契约存在不兼容变更
```

## 13. 专家开发流程

```text
场景分析
  ↓
域和 expert-id 命名
  ↓
边界卡片
  ↓
API / KB / Playbook 梳理
  ↓
design.md 定稿
  ↓
复制模板专家
  ↓
编写 manifest / nodes / prompts / workflow
  ↓
本地运行
  ↓
导出 Coze 包
  ↓
登记专家元数据
  ↓
上线验证
```

## 14. 风险与处理

| 风险 | 说明 | 处理 |
| --- | --- | --- |
| 专家边界重叠 | 上游无法稳定路由 | 在域 plan 中维护边界卡和路由树 |
| inputSchema 混入框架字段 | 调用结构混乱，导出校验失败 | Schema 只写 `inputs` 内业务字段 |
| 输出结构不统一 | 编排器无法解析 | 强制 `format-output` 四字段 |
| LLM 输出不可解析 | 后续节点失败 | Prompt 外层键与 `workflow.json.outputs[0]` 对齐 |
| Coze 代码节点含 import/export | 线上运行失败 | 本地导出内联，最终脚本单文件闭环 |
| 对客话术引用内部材料 | 客户体验和合规风险 | 内部材料只做设计溯源，不进入对客依据 |
| enrichedContext 过大 | 链式调用成本高且不稳定 | 只传关键事实和摘要 |

## 15. 一期落地建议

一期应优先固化专家契约和最小工具链闭环：

1. 明确 `manifest.json` 必填字段和校验规则。
2. 固化统一调用入参结构。
3. 固化 `format-output` 四字段输出结构。
4. 选 1 个模板专家作为黄金样例。
5. 完成本地 `dev:expert`、`export:coze` 和校验脚本闭环。
6. 建立专家新增验收 checklist。
7. 再扩展到多领域、多专家和 recaller 编排。

## 16. 关键结论

本 Spec 的核心不是定义一个复杂的调度系统，而是把“专家”本身做成稳定、可发现、可校验、可链式消费的独立单元。

专家系统的稳定性主要来自三点：

- 入口稳定：统一顶层调用结构，业务参数只放 `inputs`。
- 契约稳定：`manifest` 描述能力、输入和输出。
- 出口稳定：所有专家统一返回 `structured`、`analysis`、`outputContext`、`enrichedContext`。

只要这三点固定，上游 planner、Coze、脚本调用、未来其他调度系统都可以复用同一批专家。
