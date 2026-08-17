# tracking-no-scan 专家设计

轨迹**无上网 / 无 A-SCAN / 无扫描**类查件：按业务决策树分支输出话术、升级路径与下一步。飞书 SOP 的正文已**内化**为专家内置知识库 **[prompts/kb.md](prompts/kb.md)**；**对客输出不得附带** winitlink / 飞书 Wiki 等内部文档链接。

**版本**：v0.3.1 起优先展开 `delivery-status` 域索引并复用逐票扫描事实；无上游事实时仍由 `fetch-and-enrich` 自拉 Winit 轨迹。异步下载等价数据、Bitable 写表、出库单→跟踪号等 **额外 API** 在后续迭代中并入同一节点或子节点（与 [delivery-status](../delivery-status/design.md) 的轨迹接口对齐、可复用实现，但本专家目录内保持单文件闭环）。

---

## 调用说明

### 适用场景

- 用户/客服反馈“**无上网** / **无揽收** / **无扫描** / **无 A-SCAN**”，需要按 SOP 决策树输出话术与升级路径。
- **不适用**：纯查询“当前物流到了哪里/什么状态”，优先用 `delivery-status`（本专家聚焦“无上网”类分支处理）。

### 最小入参（满足其一即可）

- `trackingIds`：本专家将据此**自拉 Winit 轨迹**并推导事实；或
- `trajectoryText`：没有单号也可把用户粘贴的轨迹原文作为事实输入；或
- `enrichedContext.trajectories`：上游已拉到可用轨迹（并希望本专家**不要重复请求 Winit**）。

### 参数提示（最容易踩坑的点）

- `enrichedContext` 是**覆盖层/合并层**：当你已在上游得到轨迹事实时，建议传入 `enrichedContext.trajectories`，并加 `enrichedContext.skipTrajectoryFetch=true` 或 `enrichedContext.reuseUpstreamTrajectoryFacts=true`，以避免重复打 Winit。
- `bulkRegisteredNoAscentCount` 若上游无法提供，请不要凭感觉填；缺该字段时本专家会避免断言“命中批量分支”。
- 对客输出（`analysis`）**禁止**出现 winitlink/飞书 Wiki/内部 URL，本专家已通过 `prompts/kb.md` 内化 SOP。

### 示例调用（直接可用）

**示例 1：仅给跟踪号（让专家自拉轨迹）**

```json
{
  "query": "判断是否属于无上网/无扫描，并给出对客话术与下一步升级路径",
  "customerIntent": "客户催查：显示一直无揽收",
  "trackingIds": ["YT123456789CN"],
  "inputContext": { "chainId": "case-20260402-001" }
}
```

**示例 2：上游已拉到轨迹（跳过 Winit）+ 覆盖批量计数**

```json
{
  "query": "按无上网 SOP 分支给话术；上游已拉轨迹请勿重复请求",
  "customerIntent": "",
  "trackingIds": ["YT123456789CN", "YT987654321CN"],
  "enrichedContext": {
    "reuseUpstreamTrajectoryFacts": true,
    "bulkRegisteredNoAscentCount": 8,
    "trajectories": [
      { "trackingId": "YT123456789CN", "nodes": [], "summary": { "created": "2026-03-28T08:00:00Z" } },
      { "trackingId": "YT987654321CN", "nodes": [], "summary": { "created": "2026-03-28T08:00:00Z" } }
    ]
  },
  "inputContext": {
    "chainId": "case-20260402-002",
    "sourceExpertId": "delivery-status",
    "previousOutput": { "note": "trajectories already fetched upstream" }
  }
}
```

## 1. 输入设计（调用边界）

| 输入 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 否 | 上游委托说明 |
| `trackingIds` | string[] | 否 | 轨迹/运单号（**本专家将据此自拉轨迹**） |
| `outboundOrderNos` | string[] | 否 | 出库单号（**待对接** 出库单→跟踪号 API 后由 `fetch-and-enrich` 展开；当前仅透传） |
| `trajectoryText` | string | 否 | 用户/客服粘贴的轨迹原文（无单号时也可作为输入） |
| `customerIntent` | string | 否 | 诉求摘要 |
| `enrichedContext` | object | 否 | **可选覆盖层 / 前序事实**：与自拉结果 **合并**。若已含 **可复用的 `trajectories`**（任一票有 `nodes` 或 `summary.lastInfo`/`created`）或显式 `skipTrajectoryFetch` / `reuseUpstreamTrajectoryFacts === true`，**不再调用 Winit** 重复拉轨迹。仍可用于 `bulkRegisteredNoAscentCount`、`orderDetails`、合规标记等；`trajectories`/`orderDetails` 非空数组时覆盖自拉结果。 |
| `inputContext` | object | 否 | 链式上下文 |

**约束**：至少具备其一：`trackingIds` / `outboundOrderNos` / `trajectoryText` / 非空覆盖层 / `customerIntent` / `query`。否则 `branch: need_info`。

### 1.1 合并后 `enrichedContext` 字段（面向 LLM）

| 字段 | 来源 | 用途 |
|------|------|------|
| `trajectories` | **自拉**（Winit `getTracking`）+ 可覆盖 | 轨迹节点与 summary |
| `trajectorySummary` | **自拉** 紧凑 JSON 摘要 | 快速判断 |
| `carrierScanDetected` | **自拉** 规则推导 ∨ 覆盖层为 true | 是否命中 SCAN 分支 |
| `scanStates` / `scanStateSummary` | 确定性代码推导 | `carrier_data_unverified` 或轨迹 summary 为 `unverified` 时逐票状态为 `unknown`，不得归入 `all_no_ascan` |
| `parcelCreatedAt` | **自拉** 从 summary.created | 10 / 21 自然日 |
| `analysisClock` | **本节点** 每次执行写入 | `utcIso` 等为当前 UTC，与 `parcelCreatedAt` 算「距今」；合并后覆盖覆盖层旧值 |
| `fetchMeta` | **自拉** | `fetchedAt`、`fetchError` 等 |
| `orderDetails` | 覆盖层为主；API 就绪后 **自拉** | 挂号、渠道、订单类型等 |
| `bulkRegisteredNoAscentCount` | 通常 **覆盖层/中台** | 批量分支；缺则勿断言 |
| `hasSplitWeight` | 覆盖层或后续自拉 | 分单重量 → `manual_inquiry_split_weight` |
| `isHeavyOrReWeighInquiry` | 覆盖层或后续自拉 | 重查/重包裹 |
| `customerInsistsSpecialInquiry` | 覆盖层 / NLU | 特殊查件 |
| `complianceStatus` | 覆盖层 | 合规校核 |
| `asyncDownloadDataset` | 覆盖层 / 后续接口 | 异步下载等价数据 |
| `noAscentInvestigationRecord` | 覆盖层 / Bitable | 调查登记回执 |
| `carrierServiceHint` | 覆盖层 | 如美线 UPS 非 SurePost |
| `skipTrajectoryFetch` | 覆盖层（控制位） | 为 `true` 时不请求 Winit；合并后从 `enrichedContext` 中移除，不进入 LLM |
| `reuseUpstreamTrajectoryFacts` | 覆盖层（控制位） | 同上，语义为「前序已拉轨迹/事实」 |

**原则**：能由本专家 **HTTP 拉取**的（当前已实现 Winit 轨迹）不依赖前序专家；其余字段在 API 就绪后 **逐步收编**到 `fetch-and-enrich` 或新增代码节点。

---

## 2. 输出设计

| 字段 | 说明 |
|------|------|
| `structured` | 见 §2.1 |
| `analysis` | 面向客服/用户的回复与下一步；**仅陈述事实与分支结论**，不得承诺本专家/本节点无法执行的登记、跟进、协调承运商等动作（见 prompts/main.md 能力边界） |
| `outputContext` | `expertId: tracking-no-scan`、`resultSummary`、`chainId` |

### 2.1 structured 约定字段

| 键 | 类型 | 说明 |
|----|------|------|
| `branch` | string | 决策分支，见 §2.2 |
| `trackingIds` | string[] | 本轮跟踪号 |
| `outboundOrderNos` | string[] | 本轮出库单号 |
| `suggestedNextExperts` | string[] | 如 `delivery-status`、`refund-standard`、`tracking-inquiry` |
| `missingFacts` | string[] | 仍缺的关键事实 |
| `scanStates` | array | 每个 trackingNo 的 `ascan/no_ascan/delivered/unknown` 确定性状态 |

### 2.2 branch 枚举

| branch | 含义 |
|--------|------|
| `need_info` | 信息不足，仅引导补全 |
| `bulk_no_tracking_online_service` | 批量条件（>5 同 PSC/出库日/挂号无上网）→ 转在线服务支持；话术依 **kb.md**，**不**对客户附 Wiki 链接 |
| `non_registered` | 非挂号 → 非挂号话术 |
| `carrier_has_scan` | 轨迹已有 SCAN → 非无上网；若诉求为停滞可转 `tracking-stale` |
| `tracking_data_unverified` | 已有 tracking ID，但接口只返回仓库节点、承运商数据未确认；输出 `missingFacts=["freshCarrierTracking"]`，不进入赔付判断 |
| `mixed_scan_state` | 同批既有扫描票又有无 Ascan 票，按 `scanStates` 拆票 |
| `standard_claim_review` | 全部无 Ascan 且约 11–45 天，转 `refund-standard` 核验完整适用条件，不承诺可赔 |
| `claim_window_manual_review` | 全部无 Ascan且超过摘要窗口，转规则人工核验 |
| `parcel_created_within_10_days` | 创建距今 < 10 自然日 |
| `platform_mixed_10_to_21_days` | 非直发混合、>10 且 ≤21 自然日 |
| `platform_mixed_over_21_days` | 非直发混合、>21 自然日 |
| `manual_inquiry_split_weight` | 有分单重量 → 人工查件 |
| `heavy_or_reweigh_parcel` | 重查/重包裹话术 |
| `standard_inquiry_and_ticket` | 常规查件 + 后台工单/系统登记 |
| `non_compliant_submission` | 提报不合规 |
| `compliant_recorded` | 合规，记录并更新流程 |
| `special_inquiry_escalation` | 特殊查件（非美 UPS 路径：资料 + 查件 → 供应商 → SD） |
| `ups_us_substitute_claim` | 美线 UPS（非 SurePost）代客索赔路径；优先 Bitable/API |
| `need_human` | 无法唯一分支或缺关键 API 数据 |

`branch` 须与 `analysis` 一致。

---

## 3. 业务决策树（命中即停顺序）

与 Prompt `main.md` 中顺序一致，概要如下：

1. **缺信息** → `need_info`
2. **批量（飞书）**：`bulkRegisteredNoAscentCount > 5` 且维度满足 → `bulk_no_tracking_online_service`（无计数则勿断言）
3. **非挂号** → `non_registered`
4. **逐票状态混合** → `mixed_scan_state`
5. **承运商轨迹已有 SCAN** → `carrier_has_scan`
6. **全部无 Ascan 且 11–45 天** → `standard_claim_review`；>45 天 → `claim_window_manual_review`
7. **创建 < 10 自然日** → `parcel_created_within_10_days`
6. **非直发混合订单**：>10 且 ≤21 → `platform_mixed_10_to_21_days`；>21 → `platform_mixed_over_21_days`
7. **直发/混合**：`hasSplitWeight` → `manual_inquiry_split_weight`
8. **`isHeavyOrReWeighInquiry`** → `heavy_or_reweigh_parcel`
9. **常规**：`standard_inquiry_and_ticket`；若 `complianceStatus` 明确则 `non_compliant_submission` / `compliant_recorded`
10. **客户坚持特殊查件**：美线 UPS（非 SurePost）→ `ups_us_substitute_claim`；否则 → `special_inquiry_escalation`
11. 无法判定 → `need_human`

主流程图若写「>10」批量，与 KB 所载「>5」冲突时 **以 kb.md 与上游算子经覆盖层注入后的口径为准**。

---

## 4. 集成与能力边界（dp.winit 与多维表格）

| 能力 | Wiki 中的前端/表单 | 自动化应采信方式 |
|------|-------------------|------------------|
| 异步下载等价数据 | `https://dp.winit.com.cn/index.html#/Home` | **内部接口**拉取；写入 `enrichedContext.asyncDownloadDataset`；**勿**引导终端用户自行导出 |
| 无上网调查登记 | 共享表单（见附录 A） | **飞书 Bitable Open API** 新增记录；表单仅人工兜底；**勿**作为对客主路径话术 |

**代客索赔**（附录 B 美线 UPS）若落多维表，同样 **优先 API**。

---

## 5. 工作流编排

### 当前（v0.3）

```
params → validate-input → fetch-and-enrich → LLM（prompts/main.md）→ format-output → result / outputContext
```

- **validate-input**：校验入参，输出 `contextOverlay`（即调用方可选 `enrichedContext`）。
- **fetch-and-enrich**：默认按 `trackingIds` 调 Winit（与 `delivery-status/nodes/fetch-trajectories.ts` 同源）；**若覆盖层已有可用轨迹或显式跳过标志，则跳过请求**；推导/复用 `carrierScanDetected`、`parcelCreatedAt` 等；与 `contextOverlay` 合并为最终 `enrichedContext`。
- **llm-analyze** / **format-output**：同前。

本地 Runner：[workflow.json](workflow.json)；`llm-openai` 将 [prompts/kb.md](prompts/kb.md) 注入 `main.md` 的 `{{kbMd}}`。Coze 导出时 **emit.ts** 内联 **kb.md**。

**本地测试**：仓库根目录 `npm run test:tracking-no-scan`（默认 stub LLM，校验 fetch 跳过与 `enrichedContext`）；真实 LLM 加 `--openai`；真实 Winit 见 [scripts/test-tracking-no-scan.ts](../../scripts/test-tracking-no-scan.ts)。

### 后续（API 扩展）

在 **fetch-and-enrich** 内或紧后增加：出库单→跟踪号、出库单详情、异步下载等价查询、Bitable 写入等；保持「**本专家自拉 + 合并 + LLM**」总形态，避免依赖「必须先调 delivery-status」的编排假设。

---

## 6. 节点说明

| 文件 | 说明 |
|------|------|
| `nodes/validate-input.ts` | 校验入参；`contextOverlay` |
| `nodes/fetch-and-enrich.ts` | **自拉轨迹** + 事实推导 + 与覆盖层合并 |
| `nodes/format-output.ts` | 归一化 `branch` 与 `outputContext` |
| `nodes/llm-analyze.ts` | LLM 节点声明 |
| `nodes/README.md` | Coze 代码节点约定 |

---

## 7. 待业务 / 研发对齐

| 项 | 说明 |
|----|------|
| 自然日零点 | 10/21 天起算点 |
| 直发/混合 vs 平台单 | 判定字段来源 |
| 异步下载 API | 路径、参数、与 PSC/出库日映射 |
| Bitable | `app_token`、`table_id`、字段映射 |
| 批量阈值 | 飞书 >5 与流程图 >10 是否统一 |
| 出库单→跟踪号 | 接入后写入 `fetch-and-enrich`，消除「仅有出库单却无轨迹」的缺口 |

---

## 附录 A — 与「批量无上网（在线服务）」的对应关系

- **执行知识**：以 **[prompts/kb.md](prompts/kb.md) 的 KB-1** 为对模型与话术的单一事实来源（与内部飞书 SOP 同步维护）。
- **范围摘要**：同一 PSC、同一出库日期、**带挂号**、无上网 **超过 5 单** → 转 **在线服务支持**。
- **步骤摘要**：取单号 → SD 异常 → **接口**侧无 A-SCAN 数据核对拣选车 → **Bitable/API** 调查或升级 → 质控/PD+SD 等内部协作（见 KB-1）。
- **§4 技术锚点**（dp、多维表）仅供研发与内部运维文档使用，**不**写入对客 `analysis`。

---

## 附录 B — 与「无上网特殊查件」的对应关系

- **执行知识**：以 **[prompts/kb.md](prompts/kb.md) 的 KB-2** 为准（与内部飞书 SOP 同步维护）。
- **美国 UPS（非 SurePost）** / **非美国 UPS** 路径见 KB-2。

---

## 8. 风险

- **禁止**在对客 `analysis` 中出现 winitlink、飞书 Wiki、内部知识库 URL；知识已通过 **kb.md** 内化。
- 不得编造未提供的、客户不可达的链接；§4 所列 DP/表单 URL **仅作研发与内部 SOP 参考**，不进入对客话术。
- 缺 `asyncDownloadDataset` / 批量计数时勿虚构已核对拣选车或批量命中。
- 赔付条款由 **refund-standard**；代客索赔入口/进度由 **substitute-claim** / **tracking-inquiry**（若接入）。
- `standard_claim_review` 只是规则核验入口；仓库摘要对“无上网”适用条件存在冲突文字，因此禁止在本专家中写成“必定可赔”。

**编排建议**：优先复用 `delivery-status` 域索引；代码会展开最新快照并跳过重复拉轨迹。后续按需 `refund-standard`、`tracking-inquiry`。
