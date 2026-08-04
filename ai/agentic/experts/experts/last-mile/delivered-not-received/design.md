# delivered-not-received 专家设计

妥投未收到（Delivered Not Received, DNR）处理流程：在系统或承运商显示**妥投**的前提下，客户声称**未收到包裹**，按规则分支输出话术、自查步骤、理赔引导或转交下游专家。

**版本与阶段**：v0 以 **LLM + 明确分支 Prompt** 为主，依赖上游或 `enrichedContext` 提供事实；v1 在 POD / 索赔 eligibility 等 API 就绪后增加 **单文件代码节点**（与 [delivery-status/design.md](../delivery-status/design.md) 的 FaaS 约束一致）。

**依赖与边界**（见 [docs/plan/last-mile-plan.md](../../../docs/plan/last-mile-plan.md)）：

- 不假设 [pod-validation](../pod-validation/) 实时校验、[substitute-claim](../substitute-claim/) 系统已联调；缺数据时输出 **需人工/系统复核**。
- **赔付条款原文**不在本专家内展开：队列中需要时由 Planner 编排 **refund-standard**；代客索赔进度/材料/链接由 **substitute-claim** 承接。

---

## 调用说明

### 适用场景

- 轨迹/系统显示**已妥投**（Delivered），但客户反馈“没收到”，需要输出自查清单、冷静期建议、以及是否进入索赔/转交路径（DNR）。
- **不适用**：还没确认是否妥投（Delivered）——请先用 `delivery-status` 拉取并确认妥投事实，再进入本专家。用户仅说“买家未收到”不能作为 DNR 证据。

### 确定性 DNR 门禁

入口代码从 `enrichedContext.computedScanFacts`、域索引中的 `last-mile/delivery-status` 或 `inputContext.previousOutput.structured.scanFacts` 读取扫描事实：存在 Dscan 才允许 DNR；仅 RDscan 或已有扫描事实但无 Dscan 时固定输出 `not_dnr`；没有结构化事实时固定输出 `need_info`。该门禁在 `format-output` 再次覆盖模型结果，避免错误索赔话术进入下游。

### 编排约定（默认由编排器保证）

本专家**不负责**从零拉取 OpenAPI 轨迹或撰写首版轨迹解读；**编排器应在进入本专家之前**先调用轨迹类专家（默认 **`delivery-status`**），再把两类信息一并传入：

| 载体 | 内容 | 说明 |
|------|------|------|
| `enrichedContext` | **轨迹正文与结构化摘要** | 如 `trajectories`、`fetchMeta`、`trajectorySummary`、`deliveredEvent` 等；与 [delivery-status §3](../delivery-status/design.md) 合并结果对齐，由编排器 **merge** 进本轮入参 |
| `inputContext.previousOutput` | **上游专家的 `result` 等价物** | 至少含 `analysis`（轨迹/状态/妥投相关的长文结论）与可选 `structured`（单号、单据引用等）；形状与 `delivery-status` 的 `format-output` 产出一致；可为全文或编排器压缩后的摘要对象，但**不得省略可核验的妥投/状态结论来源** |
| `inputContext.sourceExpertId` | 溯源 | 建议填实际上游 id，如 `delivery-status` |
| `inputContext.chainId` | 链式追踪 | 与 design-spec §5 一致，全程透传 |

**降级**：若仅有单号或客户口述、**无**轨迹块且无可用 `previousOutput.analysis`（或等价分析字段），本专家在 Prompt 约束下**不得编造**妥投细节 → 输出 `need_info` / `need_human`，并在 `suggestedNextExperts` 中建议先调 **`delivery-status`**。

### 注册表、io 摘要与 Coze 开始节点（编排器必读）

[`manifest.json`](manifest.json) 的 **`inputSchema` 对业务字段不使用 `required`**，与 **`validate-input`**、降级调用（如仅单号，见下文示例 2）一致。**编排闭环**的硬语义写在 **`x_invoke_contract`** / **`x_constraint`**（并进入飞书/注册表 **`io` 列**，见 `scripts/sync-expert-register/schema-io-summary.ts`）：宜传含 **`trajectories`**（可为 `[]`）的 **`inputs.enrichedContext`**，以及顶层 **`inputContext.previousOutput.analysis`**。**`query` / `customerIntent` 不在 manifest 的 `inputSchema.properties` 中**（属框架顶层，见 design-spec §6）。

- **`inputSchema.x_invoke_contract`**：编排器必读；**不**替代 JSON Schema，专门描述闭环须满足的顶层 + `inputs` 形状。
- **`x_framework_input_required`**、**`x_framework_require_previous_output`**：导出 Coze 时由 **`expertStartNodeOutputs(manifest)`** 将开始节点中的 **`inputContext`**、其下的 **`previousOutput`** 标为 **`required`**（画布/框架顶层），与「`inputSchema.properties` 内是否出现 `inputContext`」无关。

### 最小入参（推荐优先级）

- **推荐（编排闭环）**：`enrichedContext`（含轨迹）+ `inputContext.previousOutput`（含上游 `analysis`）+ `customerIntent`
- 次选：`enrichedContext`（含 `deliveredEvent` 或 `trajectorySummary` 等妥投事实）+ `customerIntent`（分析已隐含在 enriched 摘要中时）
- 降级：`trackingIds` / `outboundOrderNos`（至少其一），由模型引导补全或建议前置 `delivery-status`

### 参数提示

- `claimChannelKnown`：若上游已确认“有/无索赔渠道”，请显式传入（避免模型猜测）。
- 本专家**不输出赔付条款细则**：需要条款匹配请转 `refund-standard`；需要代客索赔入口/进度/材料请转 `substitute-claim`（且禁止杜撰链接）。

### 示例调用（直接可用）

**示例 1：上游已给妥投事实（推荐）**

```json
{
  "query": "按 DNR 流程给自查步骤与下一步，判断是否需转 substitute-claim/refund-standard",
  "customerIntent": "客户说显示已签收但没收到包裹",
  "trackingIds": ["YT123456789CN"],
  "enrichedContext": {
    "trajectorySummary": "状态 Delivered / 已妥投",
    "deliveredEvent": {
      "at": "2026-04-01T10:20:00Z",
      "rawStatus": "Delivered",
      "locationHint": "front desk"
    },
    "customerStatedFacts": "客户表示未收到短信，门口也没有包裹"
  },
  "claimChannelKnown": true,
  "inputContext": {
    "chainId": "case-20260402-301",
    "sourceExpertId": "delivery-status",
    "previousOutput": {
      "structured": {
        "trackingIds": ["YT123456789CN"],
        "orderIds": [],
        "documentRefs": []
      },
      "analysis": "轨迹显示已于 2026-04-01 妥投，末条状态 Delivered，地点提示为 front desk；无异常延误节点。"
    }
  }
}
```

**示例 2：仅有单号 + 诉求（信息不足时会走 need_info/need_human 引导补全）**

```json
{
  "query": "客户反馈妥投未收到，请先判断需要补哪些事实并给标准引导话术",
  "customerIntent": "显示已妥投但客户没收到",
  "outboundOrderNos": ["OB202603280001"],
  "inputContext": { "chainId": "case-20260402-302" }
}
```

## 1. 输入设计

**双层契约**（与 `manifest.json` 一致）：**JSON Schema** 只描述 `inputs` 内字段类型，**不**用 `required` 卡 `enrichedContext`，以便降级入参与示例 2。**编排闭环**须满足 **`x_invoke_contract`**（注册表 io 列可见）。**Coze 开始节点**另由 **`x_framework_input_required`** 将框架顶层 **`inputContext`**（及导出所设子字段）标为必填，见 design-spec §6。

| 输入 | 类型 | 说明 |
|------|------|------|
| `query` | string | 上游委托本步的具体任务说明；可与单号/诉求等组合满足 validate-input |
| `trackingIds` | string[] | 轨迹/运单号 |
| `outboundOrderNos` | string[] | 出库单号 |
| `customerIntent` | string | 客户诉求摘要 |
| `enrichedContext` | object | 前置轨迹专家合并后的上下文（见 §1.1）。**Schema 可选**；**编排闭环推荐**由前置注入且宜含 `trajectories`（可为 `[]`） |
| `claimChannelKnown` | boolean | 上游是否已确认存在可索赔渠道；未传则模型仅按上下文推断并标注不确定性 |
| `inputContext` | object | 置于**调用 JSON 顶层**（design-spec §6）。**闭环**宜含 `previousOutput.analysis`（见 `x_invoke_contract`）；**Coze 导出**下开始节点对该对象及 `previousOutput` 等标必填 |

**约束（业务最小，与 validate-input 一致）**：至少具备「事实入口」之一：非空 `enrichedContext`、`trackingIds` / `outboundOrderNos`、`customerIntent` 或 `query`。编排闭环下仍应通过前置专家补齐轨迹与 `previousOutput.analysis`；否则 Prompt 侧走 `need_info` / `need_human` 并建议 `delivery-status`。

### 1.1 enrichedContext 与上游分析（分列）

- **`enrichedContext`**：承载 **原始/半结构化轨迹与拉数元数据**（见下表），由前置专家产出、编排器合并；**不**承载 delivery-status 的 LLM 长文结论（长文放在 `inputContext.previousOutput.analysis`）。
- **`inputContext.previousOutput`**：承载 **轨迹与状态解读结论**（`analysis` + 可选 `structured`），见上文「编排约定」；DNR 的 LLM 应 **优先采信** 该分析，并以 `enrichedContext.trajectories` 等做细节核对。

供上游（如 `delivery-status`）合并传入 `enrichedContext`；本专家 **不** 在本工作流内实现 OpenAPI 拉取（与「依赖前置专家」定位一致）。

| 字段 | 说明 |
|------|------|
| `trajectories` | 轨迹列表：节点、时间、状态、地点等 |
| `fetchMeta` / `analysisClock` | 拉数批次、公开兜底说明、分析用时钟等（与 delivery-status 对齐） |
| `orderDetails` | 出库单精简：目的国、产品、收件区域等 |
| `trajectorySummary` | 轨迹摘要文本，便于 LLM 快速判断（可与上游 analysis 互补，非替代） |
| `deliveredEvent` | 妥投事件：`at`（ISO 时间或原文）、`rawStatus`、`locationHint`、`deliverySubtype`（如柜、邻居、前台、代收点等占位） |
| `podSignals` | POD/签收证明摘要；API 未就绪时可为空 |
| `customerStatedFacts` | string，客户已陈述事实（未开门、无短信等） |

可与 [refund-standard](../refund-standard/design.md) 的 enrichedContext 扩展字段共存；本专家优先消费 **上游 analysis、妥投时间、签收类型、目的国/国内国际线索**。

**远期**：若 delivery-status 将「是否妥投、妥投事件」结构化进 `structured`，可在两专家 design 中同步扩展字段名，仍以 `previousOutput` 为分析结论主载体。

---

## 2. 输出设计

| 字段 | 说明 |
|------|------|
| `structured` | 见 §2.1 |
| `analysis` | 面向客服/用户的完整回复与下一步（非结构化） |
| `outputContext` | 链式输出：`expertId`、`resultSummary`、`chainId`（由 format 节点或 Runner 合并，见 design-spec.md） |

### 2.1 structured 约定字段

| 键 | 类型 | 说明 |
|----|------|------|
| `branch` | string | 决策分支枚举，见 §2.2 |
| `trackingIds` | string[] | 本轮涉及的跟踪号 |
| `outboundOrderNos` | string[] | 本轮涉及的出库单号 |
| `suggestedNextExperts` | string[] | 建议下游专家 id，如 `refund-standard`、`substitute-claim` |
| `missingFacts` | string[] | 仍缺的关键事实（如妥投时间、签收类型） |

### 2.2 branch 枚举

| branch | 含义 |
|--------|------|
| `need_info` | 单号或关键事实不足，仅引导补全 |
| `early_exit` | 命中异常话术库场景（代收、安全位置、疑似误扫等），直接解释 + 自查 |
| `cooling_wait` | 妥投后仍在冷静期内，建议等待并自查（邻居、物业、邮箱等） |
| `claim_path_domestic` | 进入国内索赔话术路径（是否满足标准可能仍需复核） |
| `claim_path_international` | 进入国际索赔话术路径 |
| `not_eligible` | 当前信息下不满足索赔/调查受理标准（说明原因） |
| `no_claim_channel` | 无可用索赔渠道说明 |
| `need_human` | 需人工或系统复核（POD、 eligibility 未对接等） |
| `handoff_claim` | 客户已确认发起索赔意图，建议转 **substitute-claim** 或工单（不提供编造链接） |

`branch` 必须与 `analysis` 中的实际建议一致。

---

## 3. 业务决策树（文字版）

与「轨迹长时间未更新」类流程**同构**：先取数 → 异常早退 → 短时规则 → 服务/资格分支 → 校验 → 收口。

1. **Gather**：收集跟踪号/出库单号、客户意图、`enrichedContext`、`inputContext.previousOutput`（上游轨迹分析）。
2. **取事实**：**优先**采用 `previousOutput.analysis` 与 `structured` 中的结论，并与 `enrichedContext.trajectories` / `deliveredEvent` 核对；归纳妥投是否成立、妥投时间、签收地点/类型、POD 线索（有则引用，无则标注缺失）；**禁止**在无轨迹且无上游分析时编造妥投细节。
3. **异常话术库（可选）**：若命中预定义模式（邻居代收、快递柜、前台、安全位置、分拨误显示妥投等）→ **`early_exit`**，给解释与自查清单。
4. **冷静期**：若距妥投时间在业务设定阈值内（**具体小时数待业务定**，设计占位如 24–48h）→ **`cooling_wait`**。
5. **超过冷静期**：判断是否开放索赔/调查渠道；若上游 `claimChannelKnown === false` 或上下文明确无渠道 → **`no_claim_channel`** 或 **`need_human`**。
6. **有渠道**：按国内/国际（来自 `orderDetails` / `enrichedContext`）→ **`claim_path_domestic`** / **`claim_path_international`**。
7. **理赔标准校验**：材料、时效、场景是否满足（v0 用清单 + 不确定则 **`need_human`**）→ 不满足则 **`not_eligible`**。
8. **收口**：客户确认要发起索赔 → **`handoff_claim`**；**禁止编造 URL**；无官方链接时写明由客服在工单/系统发起，并建议 Planner 调用 **substitute-claim**。

**编排建议**（专家队列）：`delivery-status`（或等价轨迹+POD 摘要）→ **`delivered-not-received`** → 需要条款时 `refund-standard` → 需要代客索赔入口/进度时 `substitute-claim`。上下文通过 `inputContext.previousOutput` 传递（见 [experts_recaller/prompts/queue-next-job-prepare.md](../../../experts_recaller/prompts/queue-next-job-prepare.md)）。

---

## 4. 工作流编排

### Phase A（当前）

```
params → validate-input → LLM（prompts/main.md）→ format-output → result / outputContext
```

本地 Runner 使用根目录 [workflow.json](workflow.json) 串联上述节点；`scripts/llm-openai.ts` 负责注入 `query`、`trackingIds`、`outboundOrderNos`、`customerIntent`、`enrichedContext`、`claimChannelKnown`、`inputContext`（整对象 JSON）及 `inputContext.previousOutput`（兼容占位符）。未配置 `OPENAI_API_KEY` 时 LLM 为 Mock，仅用于打通流水线。

### Phase B（API 就绪后）

在 Phase A 基础上增加事实拉取与分支预计算：

```text
validate-input ──► merge-enriched（API）──► llm-analyze ──► format-output
```

| 节点 | 职责 |
|------|------|
| `validate-input` | 校验至少一种事实来源（Phase B 可扩展 `branchHint`） |
| `merge-enriched` | 合并 API 返回与入参（可选） |
| `llm-analyze` | Prompt：`main.md`（分支附录已内嵌；`expert.md` 仅本地维护参考，Coze 不读文件） |
| `format-output` | 校验 JSON、`outputContext` |

环境变量占位：`WINIT_*`、轨迹/POD API 等与 delivery-status、pod-validation 对齐后补充。

---

## 5. 节点说明（Phase A 已实现文件）

| 文件 | 说明 |
|------|------|
| `nodes/validate-input.ts` | 单文件闭环；校验至少一种事实来源 |
| `nodes/format-output.ts` | 单文件闭环；归一化 `branch` 枚举与 `outputContext` |
| `nodes/llm-analyze.ts` | LLM 节点声明（非 workflow `file` 可执行项） |
| `nodes/README.md` | Coze 代码节点约定（已有） |

---

## 6. 待业务 / 客服对齐清单

| 项 | 说明 |
|----|------|
| 冷静期 | 妥投后多少小时/天走「等待+自查」分支 |
| 国内/国际判定 | 以目的国、产品还是账单主体为准 |
| 异常话术库 | 是否与「轨迹长时间未更新」共用条目 |
| 官方代客索赔入口 | 各渠道 URL 或仅工单发起（写入 substitute-claim 专家，本专家不杜撰） |

---

## 7. 风险

- POD、ePOD 规则、索赔 eligibility 未 API 化前，**法律与金额承诺**以合同及 **refund-standard** 为准。
- LLM 不得输出未在知识库/上游提供的具体链接或赔付金额。
