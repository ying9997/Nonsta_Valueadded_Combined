# tracking-inquiry 专家设计

查件状态和结果返回，代客户发起查件或告知查件入口。

## 调用说明

### 适用场景

- 客户要**发起查件、查询查件进度或需要查件入口指引**。
- 不适用：无任何运单/出库/查件单线索时。

### 最小入参

- `trackingIds`、`outboundOrderNos`、`inquiryIds` 至少其一非空更易执行。

### 参数提示

- 已有查件单号时优先传 `inquiryIds`；新建查件场景在 `query` 中写清问题类型。
- `customerIntent` 仅在**调用 JSON 顶层**。
- 透传 `inputContext.chainId`。

### 新建查件类型推荐

`primaryCheckingType` 只表示已有查件记录的类型；新建查件建议使用独立字段 `recommendedCheckingType`。代码优先使用确定性结构化事实：RDscan（退回妥投），或上游 `outbound-order-status` 返回且 `retrunReason=DF` 的关联退货单事实，推荐 `FR / 退回原因`；否则，Dscan 且客户明确未收到推荐 `NT / 妥投未收到`；Ascan、无 Dscan 且存在超时、停滞或派送异常信号推荐 `OT / 超时未妥投`。没有 RDscan 或 `DF` 退货事实时，“可能退回”“避免退回”等文本不能单独触发 FR；`BR / 客户退货` 也不得误判为派送失败退回。无 Ascan 或证据不足时不强行分类，并通过 `suggestedNextExperts` 引导补查轨迹。

### 示例调用

```json
{
  "query": "帮我查一下这个查件单处理了吗",
  "customerIntent": "客户催促",
  "inputContext": { "chainId": "ti-001", "sourceExpertId": "", "previousOutput": "" },
  "inputs": {
    "inquiryIds": ["TA240710381"],
    "trackingIds": [],
    "outboundOrderNos": []
  }
}
```

```json
{
  "query": "我要代客户发起查件",
  "customerIntent": "",
  "inputContext": {},
  "inputs": {
    "trackingIds": ["1Z999AA10123456784"],
    "outboundOrderNos": ["OB20250401001"],
    "inquiryIds": []
  }
}
```

## 1. 输入设计

### 1.1 框架顶层（调用边界，不在 manifest.inputSchema 内）

| 字段 | 类型 | 说明 |
|------|------|------|
| query | string | 委托任务说明，可为空 |
| customerIntent | string | 业务摘要，可为空 |
| inputContext | object | 可选；链式上下文 |

### 1.2 inputs 内业务字段（与 manifest.json 一致）

| 字段 | 类型 | 说明 |
|------|------|------|
| trackingIds | string[] | 轨迹单号 |
| outboundOrderNos | string[] | 出库单号 |
| inquiryIds | string[] | 查件流水号（与接口 `serialNumber` 对齐，如 TA…） |

### 1.3 入参 → `TailTrace.getList` 查询字段（实现约定）

| manifest / inputs | 建议填入的请求字段 |
|-------------------|---------------------|
| `inquiryIds[]` | `data.serialNumber`（逐条查询或多请求合并结果） |
| `outboundOrderNos[]` | `data.orderNo` |
| `trackingIds[]` | `data.trackingNo` / `data.shippingNo`（若一线一单号视为轨迹号则优先 `trackingNo`，否则以实现契约为准） |

单次调用仅填一种线索以减少歧义；多条命中时的归并策略见 §3。


## 2. 输出设计

新增可选字段 `recommendedCheckingType`、`recommendedCheckingTypeName`、`classificationConfidence`、`classificationReason`；这些字段由代码节点生成，模型不得覆盖。

### 2.1 总览

| 字段 | 说明 |
|------|------|
| **structured** | 机器可读：查件标识、状态码、分支标签、事实摘要（供下游路由 / 评测） |
| **analysis** | 对客可读：状态说明、进度与时效、结果摘要（遵守 `REQUIREMENTS.md` §4：勿暴露内部文档链接或协作平台名） |

### 2.2 `structured` 建议字段（与实现对齐后可写入 `manifest.outputSchema`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `serialNumbers` | string[] | 查件流水号（如 TA…，对应接口 `serialNumber`） |
| `orderNos` | string[] | 出库订单号（`orderNo`） |
| `trackingNos` | string[] | 快递单号等（`trackingNo` / `shippingNo` 归并时需去重） |
| `primaryCheckingStatus` | string | 当前主单据的 `checkingStatus`（SU / NSC / SSC / WCR / RT / CP / CC） |
| `primaryCheckingType` | string | `checkingType`（OT / PT / NR / FR / NT），可选 |
| `sopBranch` | string | 话术路由：`case1_no_record` \| `case2_pending_accept` \| `case3_supplier` \| `case4_done` \| `supplement_nsc` \| `supplement_wcr` \| `supplement_rt` \| `supplement_cc` |
| `records` | object[] | 从列表接口解析后的最小必要事实列表（含 `checkingStatus`、`applicationTime`、`acceptTime`、`checkingResults`、`feedbackMsg` 等关键键）；禁止透传接口原始整行及收件、客户、内部人员等非必要字段 |
| `elapsedBizDays` | number \| null | 申请日不计、分析日计入的工作日数；当前确定性实现按 Asia/Shanghai 周一至周五计算 |
| `calendarSource` | string | 当前为 `weekday_only`，明确表示尚未扣除法定节假日 |
| `slaBand` | string | `within_1_day` / `within_3_days` / `within_10_days` / `over_10_days` / `unknown` |
| `canEscalateUrgent` | boolean \| null | `elapsedBizDays > 3` 时为 true；无法计算时为 null |
| `missingFacts` | string[] | 缺字段提示（如无法解析工作日） |
| `canEscalateUrgent` | boolean | 是否满足第六节加急时间门槛（由策略节点计算） |
| `suggestedNextExperts` | string[] | 可选：`delivery-status`、`substitute-claim`、`need_human` 等 |

### 2.3 `analysis`

按 **`docs/experts/last-mile/tracking-inquiry.md`**「第五节」+「五·补充」输出；完成态（CP）须解释结果含义时，使用 **`checkingResults` ID → 名称** 映射（见该文档外部系统依赖附录），避免复述内部码。WCR 且无可对客结果时，由代码固定说明“当前接口暂未返回可对客说明的具体结果”，并引导后续主动查询，禁止推断供应商状态或承诺主动通知。

---

## 3. 工作流编排（草案）

与 `substitute-claim` 同构：**校验 → 拼装 OpenAPI 请求 → 插件 / 代理调用 → 解析事实 → LLM → 归一化输出**。

**本期范围**：**不调用**任何「创建查件单」类 OpenAPI；若客户需新建查件，仅在话术 / KB 中引导至卖家端 **`https://seller.winit.com.cn/Tracking/create`**（与 `prompts/kb.md` 一致）。

1. **validate-input**：至少一组单号；规范化 `trackingIds` / `outboundOrderNos` / `inquiryIds`（与接口查询字段映射：`trackingNo`、`shippingNo`、`orderNo`、`serialNumber`，以实现阶段契约为准）。
2. **build-tail-trace-request**：组装网关 `data`，调用业务 **`TailTrace.getList`**（分页策略：首页 + 必要时分页直到命中或确认空列表）。
3. **winit-openapi-plugin**（Coze）：`action` = `tail.claim.ai.v1.gateway`（与 `scripts/test-winit-openapi-call.ts`、现网插件配置一致；定稿前与开放平台核对）；本地 Runner 可用 `shared/winit-openapi-call`。
4. **fetch-tail-trace-list**：解析 `content[]`，抽取 `structured.records`，计算 `primary*`、`sopBranch`（逻辑对齐 **`docs/experts/last-mile/tracking-inquiry.md`「五·补充」**）。
5. **llm-analyze**：注入 `prompts/main.md`、脱敏 **kb**（`prompts/kb.md`）与 `{{tailTraceFacts}}` / `{{kbMd}}`。
6. **format-output**：合并事实与 LLM 输出，写入 `outputContext.expertId` = `tracking-inquiry`。

**空列表**：走 SOP **情况1**（未提交查件）话术；若业务上存在「有出库但无查件记录」歧义，置 `missingFacts` 并降级或 `need_human`。

---

## 4. 节点说明（草案）

| 节点 | 文件（拟） | 说明 |
|------|------------|------|
| validate-input | `nodes/validate-input.ts` | 入参校验、单号归一、透传 `enrichedContext` |
| build-tail-trace-request | `nodes/build-tail-trace-request.ts` | 生成 OpenAPI `data` JSON 字符串 |
| winit-openapi-plugin | `nodes/winit-openapi-plugin.ts` | Coze 插件占位说明（非本地执行） |
| fetch-tail-trace-list | `nodes/fetch-tail-trace-list.ts` | 解析响应 → `tailTraceFacts` / `structured` 预览 |
| llm-analyze | `nodes/llm-analyze.ts` | LLM 声明与 Prompt 绑定 |
| format-output | `nodes/format-output.ts` | 合并输出、`outputContext` |

---

### 相关文档

- 业务与话术路由：**`docs/experts/last-mile/tracking-inquiry.md`**（含「五·补充」映射表）
- OpenAPI 枚举与示例：**同文档「⚠️ 外部系统依赖」**

---

**Coze / 本地**：打进 Coze 的代码节点**不得使用 `fs` / `readFile`**；密钥与 API 基址须按 [`docs/design-spec.md`](../../docs/design-spec.md) §6 经 **`runtimeConfig`（或等价入参）优先、本地 `process.env` 回退** 提供。
