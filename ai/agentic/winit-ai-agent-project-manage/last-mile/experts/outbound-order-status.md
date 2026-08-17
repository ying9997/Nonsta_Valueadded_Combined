# 尾程专家系统 - outbound-order-status 设计文档

## 业务场景
根据出库单号调用万邑通 OpenAPI 获取出库单详情，解读出库单当前状态（暂存、增值、已出库等），分析异常场景并给出下一步建议动作。

## 专家ID
`outbound-order-status`

## 专家名称
出库单状态解读

---

## 一、业务处理流程

```mermaid
flowchart TD
    Start[接收 outboundOrderNos 及参数] --> Route{路由判断}
    Route -->|单号数量 = 1| Single[调用 queryOutboundOrder (id/55) 获取单笔详情]
    Route -->|单号数量 > 1| Multi[逐单调用 queryOutboundOrder (id/55)，并发合并结果]
    Single --> Opt[可选接口增强]
    Multi --> Opt
    Opt -->|includeFeeBreakdown| Fee[调用 id/145 获取费用明细]
    Opt -->|includeTrackingSummary| Track[调用 id/56 获取轨迹摘要]
    Opt --> Prune[JSON 剪枝：控制返回体积避免 Token 膨胀]
    Fee --> Prune
    Track --> Prune
    Prune --> Knowledge[加载状态知识词典和场景说明]
    Knowledge --> Analyze[LLM 分析解读]
    Analyze --> Format[format-output 强制结构化输出]
    Format --> Output[输出结构化数据 + 自然语言分析]
```

---

## 二、SOP 关键信息整理

| 项目 | 说明 |
|------|------|
| **适用场景** | 用户持有出库单号（WO 开头），查询出库状态、暂存原因、增值服务处理进度 |
| **不适用场景** | 仅有轨迹号/卖家订单号且无法映射到出库单号 → 需要上游补全或转其他专家 |
| **剪枝设计** | 控制 JSON 体积，超过阈值截断并保留 `_pruneMeta` 元信息供 LLM 理解 |
| **可选增强** | `includeFeeBreakdown`: 追加 id/145 费用明细；`includeTrackingSummary`: 追加 id/56 轨迹摘要 |
| **默认并发** | 多单场景逐单调用 id/55，并发度由环境变量 `COZE_WINIT_OPENAPI_CONCURRENCY` 控制（默认 4） |

### 剪枝策略

| 层级 | 截断规则 | 控制参数 | 默认值 |
|------|----------|----------|--------|
| `packageList` | 每单保留前 N 个包裹，其余占位 | `maxPackagesPerOrder` | 10 |
| `merchandiseList` | 每包裹保留前 M 个商品，其余占位 | `maxMerchandisePerPackage` | 20 |
| `itemList` | 可选省略，状态解读通常不需要 | `includeItemList` | false |
| `batchList` | 可选省略，非核心信息 | - | 省略 |

---

## 三、输入输出 Schema

### 输入设计

#### 框架顶层（调用边界，不在 manifest.inputSchema 内）

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 委托任务说明，可为空 |
| `customerIntent` | string | 当前业务问题摘要，可为空 |
| `inputContext` | object | 可选；链式上下文：`sourceExpertId`、`previousOutput`、`chainId` |
| `customerCode` | string | 租户代码（框架约定，顶层保留） |
| `customerName` | string | 客户名称（框架约定，顶层保留） |
| `username` | string | 用户名（框架约定，顶层保留） |
| `language` | string | 语言（框架约定，顶层保留） |

#### `inputs` 内业务字段（与 manifest.json 一致）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `outboundOrderNos` | string[] | 否 | [] | 出库单号（格式：WO + 数字；带子单尾缀字母会自动规范处理） |
| `maxPackagesPerOrder` | integer | 否 | 10 | 剪枝：每单保留包裹数上限 |
| `maxMerchandisePerPackage` | integer | 否 | 20 | 剪枝：每包裹保留商品行上限 |
| `includeItemList` | boolean | 否 | false | 剪枝：是否保留商品明细 `itemList` |
| `includeFeeBreakdown` | boolean | 否 | false | 是否追加调用 id/145 获取费用明细（增加 API 调用） |
| `includeTrackingSummary` | boolean | 否 | false | 是否追加调用 id/56 获取轨迹摘要（最多 30 跟踪号） |

> **最小入参要求**：`outboundOrderNos` 至少包含一个有效出库单号。

### 输出设计

| 字段 | 类型 | 说明 |
|------|------|------|
| `structured` | object | 结构化数据：出库单号、状态码、子单状态、跟踪号、`_pruneMeta` 剪枝元信息等 |
| `analysis` | string | 状态解读、暂存/增值场景说明、下一步建议动作 |
| `outputContext.expertId` | string | 当前专家 ID，透传给下游 |
| `outputContext.resultSummary` | string | 结果摘要，供下游使用 |
| `outputContext.chainId` | string | 透传 `inputContext.chainId` |

---

## 四、API 选型与调用策略

### API 对比

| 维度 | 单个出库单详情 (id/55) | 批量出库单列表 (id/54) |
|------|------------------------|------------------------|
| 接口 | `queryOutboundOrder` | `queryOutboundOrderList` |
| 入参 | `outboundOrderNum` 必填 | `outboundOrderNum` 可选 + 日期范围 + 分页 |
| 返回粒度 | 单笔完整详情，含嵌套商品结构 | 列表，商品扁平结构 |
| 默认适用 | 单号数量 = 1 | 兼容退路（环境变量控制） |

### 默认策略

- 单号 **= 1**：调用 `queryOutboundOrder` (id/55)
- 单号 **> 1**：逐单并发调用 `queryOutboundOrder` (id/55)，合并结果（避免依赖未文档化的多值逗号传参行为）
- 可选退路：设置 `COZE_WINIT_MULTI_FETCH_STRATEGY=list` 改用 `queryOutboundOrderList` (id/54)，按日期窗口翻页过滤

---

## 五、调用说明

### 最小入参
`inputs.outboundOrderNos` 至少包含一个有效出库单号，剪枝参数可省略使用默认值。

### 参数提示
- `maxPackagesPerOrder`/`maxMerchandisePerPackage`：包裹/商品很多时应适当收紧数值控制 JSON 体积
- 多专家链式编排建议透传 `inputContext.chainId` 保持链路追踪

### 示例调用

```json
{
  "query": "解读这些出库单当前状态和下一步建议",
  "customerIntent": "客户想知道出库是否已发出、为何暂存",
  "inputContext": {
    "chainId": "chain-demo-001",
    "sourceExpertId": "",
    "previousOutput": ""
  },
  "inputs": {
    "outboundOrderNos": ["OB20250401001"],
    "maxPackagesPerOrder": 10,
    "maxMerchandisePerPackage": 20,
    "includeItemList": false
  }
}
```

```json
{
  "query": "",
  "customerIntent": "",
  "inputContext": {},
  "inputs": {
    "outboundOrderNos": ["OB001", "OB002"]
  }
}
```

---

## 六、代码实现节点

| 节点文件 | 功能 |
|----------|------|
| `route-by-order-count.ts` | 根据出库单数量决定路由策略 |
| `fetch-outbound-order.ts` | 执行 API 调用获取出库单数据 |
| `prune-outbound-json.ts` | JSON 剪枝，控制 Token 体积 |
| `load-status-knowledge.ts` | 加载状态词典、场景解读提示 |
| `analyze-and-summarize` | LLM 分析生成结构化结果与说明 |
| `format-output.ts` | 标准化输出格式对齐框架 |

### 提示词片段

| 文件 | 内容 |
|------|------|
| `prompts/outbound-status-lexicon.md` | 状态码字典：状态码 → 状态名、说明 |
| `prompts/outbound-status-scenarios.md` | 场景解读：暂存、增值、异常、建议动作 |
| `prompts/outbound-json-field-guide.md` | JSON 字段说明，辅助 LLM 理解返回结构 |

---

## 七、与其他专家分工

| 专家 | 职责分工 |
|------|----------|
| **outbound-order-status** | 出库单状态查询、场景解读、下一步建议 |
| **delivery-status** | 尾程物流轨迹拉取与异常解读 |
| **shipping-label** | 面单申请与打印指引 |

---

## 八、代码实现状态

- ✅ 框架结构已创建 (`manifest.json`)
- ✅ 设计文档已完成 (`design.md`)
- ✅ `nodes/` 节点已实现
- ✅ `prompts/` 提示词已编写
- ✅ 工作流已编排 (`workflow.json`)
- ✅ Coze 配置已完成 (`coze.config.yml`)
- ✅ OpenAPI Schema 已导入 (`outbound_endpoint_schema.md`)

---

## ⚠️ 外部系统依赖

本专家需要调用万邑通 OpenAPI 获取出库数据：

- **万邑通 OpenAPI `queryOutboundOrder` (id/55)**：获取出库单详情
- **可选：`sms.incomeSettlement.queryOutboundOrderFee` (id/145)**：费用明细
- **可选：`tracking.getOrderVerdorTracking` (id/56)**：轨迹摘要

---

**文档生成时间**：2026年04月27日
**数据源**：代码仓库 `design.md` + `manifest.json` 分析整理
