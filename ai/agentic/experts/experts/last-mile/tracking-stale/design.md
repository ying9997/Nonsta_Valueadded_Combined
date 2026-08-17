# tracking-stale 专家设计

> 边界：本专家只处理**已有承运商 Ascan 后**的停滞。全部无 Ascan 固定转 `tracking-no-scan`；批次扫描状态混合时按 `scanStates` 拆票。

轨迹长时间未更新处理流程。

**版本与定位**：Phase A 使用 `validate-input -> llm-analyze -> format-output` 三节点链路。  
本专家严格依赖上游（默认 `delivery-status`）提供事实，不在本工作流内直接拉轨迹。

---

## 调用说明

### 适用场景

- 用户反馈轨迹停滞、长时间无更新、疑似丢件，需输出分支判断与标准话术。
- 不适用：无法定位订单且缺少事实输入时，应先补齐单号或调用 `delivery-status` 获取轨迹事实。

### 编排前置（推荐）

进入本专家前，编排器应先调用 `delivery-status`，并传入：

- `enrichedContext`：轨迹事实、异常识别、扫描信息、时钟基准等。
- `inputContext.previousOutput`：上游分析结论（至少含 `analysis`）。
- `inputContext.sourceExpertId`：建议为 `delivery-status`。
- `inputContext.chainId`：全链路透传。

### 最小入参（满足其一）

- `trackingIds` 或 `outboundOrderNos` 至少其一非空；
- 或提供非空 `enrichedContext`；
- 或提供 `customerIntent` / `query`（将进入补充信息或人工分支）。

### 示例调用

```json
{
  "query": "请按轨迹停滞流程给处理建议",
  "customerIntent": "客户反馈 11 天未更新",
  "trackingIds": ["1Z999AA10123456784"],
  "enrichedContext": {
    "recognizedException": false,
    "ascanDetected": true,
    "lastTrackingAt": "2026-04-20T08:30:00Z",
    "noUpdateDays": 11,
    "hasClaimService": true,
    "isDomestic": true,
    "claimWindowStatus": "in_window"
  },
  "inputContext": {
    "chainId": "lm-stale-001",
    "sourceExpertId": "delivery-status",
    "previousOutput": {
      "analysis": "轨迹最后更新于 4/20，当前已超 10 天。"
    }
  }
}
```

---

## 1. 输入设计

### 1.1 框架顶层（不在 manifest.inputSchema 内）

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 调用方委托说明，可为空 |
| `customerIntent` | string | 客户诉求摘要，可为空 |
| `trackingIds` | string[] | 跟踪号列表，可为空 |
| `outboundOrderNos` | string[] | 出库单号列表，可为空 |
| `enrichedContext` | object | 上游事实上下文，建议非空 |
| `inputContext` | object | 链式上下文，建议携带 `previousOutput` |

### 1.2 核心事实字段（来自 enrichedContext）

| 字段 | 类型 | 用途 |
|------|------|------|
| `recognizedException` / `exceptionResult` | boolean/object | 是否已命中系统异常识别结果 |
| `ascanDetected` | boolean | 是否已有首扫/MSCAN |
| `computedScanFacts` | array | `delivery-status` 的逐票 Ascan/Dscan/RDscan 确定性事实；存在时优先于批量布尔字段 |
| `lastTrackingAt` | string | 最后一条轨迹时间 |
| `noUpdateDays` | number | 无更新天数（优先使用上游已算结果） |
| `carrierLastScanAt` | string | 最近承运商扫描时间；无 Ascan 时应为空 |
| `warehouseLastEventAt` | string | 最近仓库作业时间；无 Ascan 场景的时长应以此描述，不得称为承运商停更 |
| `hasClaimService` | boolean | 是否有索赔服务；必须来自明确上游事实、平台面单判定或已维护的确定性产品规则，缺失不得按 `false` 处理 |
| `orderFacts` | array | `outbound-order-status` 输出的实际订单产品；实际绑定产品优先于父级模板 |
| `isPlatformWaybill` | boolean | 是否为 3PL / 平台面单（**不支持索赔**，与停更天数无关） |
| `isDomestic` | boolean | 国内件/国际件 |
| `claimWindowStatus` | string | 索赔时效状态：`in_window` / `out_of_window` / `not_open_yet` |
| `customerConfirmedClaim` | boolean | 客户是否确认提交索赔 |
| `analysisClock` | object | 服务端时钟基准（UTC） |

若部分字段缺失，本专家可降级到 `need_info` 或 `need_human`，并在 `missingFacts` 给出所缺事实。

当 `computedScanFacts` 因上游兼容或 Coze 输入裁剪而缺失，但 `ascanDetected` 是明确布尔值时，代码节点按该批量事实为每个 `trackingId` 生成扫描状态；`false` 必须得到 `all_no_ascan`，不得先填充 `unknown` 后绕过转派。天数随运行时 `analysisClock` 增长，历史回归只验证当时快照，实时验收以事件时间和阈值区间为准。

---

## 2. 输出设计

### 2.1 输出字段

- `result.structured`：结构化分支、单号、后续建议专家、缺失事实。
- `result.analysis`：面向客服/客户的结论与下一步。
- `outputContext`：链路摘要与 `chainId`。

### 2.2 branch 枚举

| branch | 含义 |
|--------|------|
| `need_info` | 输入不足，先补充信息 |
| `recognized_exception` | 已命中系统异常识别结果，直接复用 |
| `terminal_delivered_not_stale` | 系统判定已妥投（`staleFacts.isDelivered`），不适用「运输中停更/丢件」话术 |
| `handoff_no_ascan` | 全部运单无 Ascan，转 `tracking-no-scan`，本专家不判断渠道索赔 |
| `mixed_scan_state` | 同批既有 Ascan 又有无 Ascan，输出逐票 `scanStates` 并要求拆票 |
| `ascan_stale_within_3_days` | 有 ascan 且停滞在 3 天阈值分支 |
| `below_claim_threshold` | 未达到 10 天阈值，不建议索赔 |
| `no_claim_service` | 平台面单，或超 10 天且 `hasClaimService === false` |
| `domestic_claim_recommended` | 国内件 + 有索赔服务，建议索赔 |
| `international_wait_recommended` | 国际件 + 有索赔服务，建议等待/观察 |
| `stale_over_10_days` | 超 10 天通用提醒（未确认索赔） |
| `claim_handoff` | 客户确认提交索赔，转 `substitute-claim` |
| `need_human` | 事实冲突或关键字段缺失，需人工 |

---

## 3. 决策顺序（命中即停）

1. 输入不足 -> `need_info`
2. 命中系统异常结果 -> `recognized_exception`
3. 读取 `enrichedContext.staleFacts`（代码节点确定性计算）；`calcStatus != ok` -> `need_human`
4. `staleFacts.isDelivered === true` -> `terminal_delivered_not_stale`
5. **`staleFacts.isPlatformWaybill === true`（3PL / 平台面单）** -> `no_claim_service`（**禁止**引用 10 天索赔阈值或任何可索赔暗示）
6. `staleFacts.scanStateSummary === all_no_ascan` -> `handoff_no_ascan`
7. `staleFacts.scanStateSummary === mixed` -> `mixed_scan_state`
8. 有 ascan 且 `staleFacts.isOver3Days === true` 且 `staleFacts.isOver10Days === false` -> `ascan_stale_within_3_days`
7. `staleFacts.isOver10Days === false` -> `below_claim_threshold`（仅非平台面单）
8. `staleFacts.isOver10Days === true` 且 `hasClaimService === false` -> `no_claim_service`
9. `staleFacts.isOver10Days === true` 且 `hasClaimService === true`：
   - 国内件 -> `domestic_claim_recommended`
   - 国际件 -> `international_wait_recommended`
10. 若客户确认索赔 -> `claim_handoff`，建议下游 `substitute-claim`
11. 若未确认索赔 -> `stale_over_10_days`
12. 超 10 天但 `hasClaimService` 缺失，或关键事实冲突 -> `need_human`，并标记缺失事实

---

## 4. 工作流编排（Phase A）

```text
params -> validate-input -> derive-stale-facts -> llm-analyze -> format-output -> result/outputContext
```

- `validate-input`：校验入口、合并 delivery/outbound 域事实、注入 `analysisClock`，并按确定性产品规则补充索赔能力。
- `derive-stale-facts`：确定性计算停更阈值及逐票 `scanStates`，写入 `enrichedContext.staleFacts`。
- `llm-analyze`：基于确定性事实生成候选分支与话术。
- `format-output`：先执行无 Ascan/混合扫描守卫，再对已有 Ascan 场景复核平台面单与显式索赔事实。

---

## 5. 节点说明

| 文件 | 说明 |
|------|------|
| `nodes/validate-input.ts` | 入参校验、标准化数组、注入时钟 |
| `nodes/derive-stale-facts.ts` | 计算停更天数、产出 `isOver3Days/isOver10Days`；妥投与参考时间一致时写 `isDelivered` 并豁免停更阈值 |
| `nodes/llm-analyze.ts` | LLM 节点声明（非执行逻辑） |
| `nodes/format-output.ts` | 输出归一化、branch 白名单、outputContext |

---

## 6. 约束与风险

- 对客 `analysis` 禁止输出内部链接（飞书 wiki、内部系统 URL）。
- 事实优先级：`enrichedContext` 和 `inputContext.previousOutput` > 用户口述。
- 当上游未提供关键事实时，不得强行断言索赔资格，应给出 `missingFacts`。
