# delivery-status 尾程轨迹解读专家设计

## 调用说明

### 适用场景

- 用户询问「**物流到哪了/什么状态/是否异常**」，或需要基于跟踪号/出库单号拉取并解读轨迹。
- 需要为下游专家提供 `enrichedContext`（如给 DNR、赔付条款匹配）时，优先先调本专家把轨迹与单号摘要补齐。

### 最小入参（满足其一即可）

- `trackingIds`：跟踪号；或
- `outboundOrderNos`：万邑通出库/订单号（**`WO…` 形态**可与跟踪号混用，写入同一 OpenAPI `trackingnos`）；或
- `trajectoryText`：仅做文本解读（不拉 OpenAPI）。

### 参数提示

- `trackingIds` 与 `outboundOrderNos` **无流程差异**：服务端合并去重后调用万邑通 id/56；**`WO` 开头不是承运商跟踪号**，公开轨迹页兜底**不会**用其查询。
- `customerIntent`：建议写清「想确认什么」。
- 链式编排时建议透传 `inputContext.chainId`。
- **`enrichedContext.analysisClock`**：服务端 UTC 参考时钟；轨迹点时间多为本地/供应商侧时间，LLM 须区分后再做延误判断。

### 示例调用（直接可用）

**示例 1：按跟踪号**

```json
{
  "query": "拉取并解读尾程轨迹，按时间线陈述状态与关键里程碑（Ascan/Dscan 等），不输出对客行动建议",
  "customerIntent": "客户催问：包裹现在到哪里了？",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "zh_CN",
  "inputContext": { "chainId": "case-20260402-101" },
  "inputs": {
    "trackingIds": ["YT123456789CN"]
  }
}
```

**示例 2：出库单号与跟踪号混用**

```json
{
  "query": "根据单号查询并解读轨迹",
  "customerIntent": "",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "zh_CN",
  "inputContext": { "chainId": "case-20260402-102" },
  "inputs": {
    "trackingIds": ["9205590232843346676480"],
    "outboundOrderNos": ["WO1655153080"]
  }
}
```

---

## 1. 输入设计

| 输入 | 类型 | 说明 |
|------|------|------|
| `trackingIds` | string[] | 承运商跟踪号等 |
| `outboundOrderNos` | string[] | 万邑通出库/订单号（含 `WO…`） |
| `trajectoryText` | string | 客户粘贴的轨迹文本 |
| `customerIntent` | string | 客户意图 |

**约束**：至少提供 `trackingIds`、`outboundOrderNos`、`trajectoryText` 其一。

---

## 2. 数据拉取与兜底

1. **主路径**：万邑通 OpenAPI **`tracking.getOrderVerdorTracking`**（id/56），`trackingnos` 半角逗号分隔，**每请求 ≤30 个**；可选 `language`（`zh_CN` / `zh_TW` / `en_US`）。
2. **集成方式**（见 `docs/design-spec.md` §6）：前置代码节点 **`build-winit-tracking-data`** 拼装 **`winitRequestData`**（JSON 字符串）→ Coze 插件 **`cobra_winit_openapi_request`**（`action` 字面量）→ **`fetch-trajectories`** 解析插件返回的 `data`；本地 Runner 可用 `COZE_API_TOKEN` + `COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID` 调 `workflow/run`。
3. **兜底**：某键在 OpenAPI 无结果时，若**非 `WO` 前缀**，可再请求 **`https://track.winit.com/tracking/Index/getTracking`**（无客户隔离）。须在 `enrichedContext.fetchMeta.notes` 等位置提示：**可能不在当前账号权限内，公开结果仅供参考**。
4. **多批**：超过 30 个单号时，**fetch 节点内**对后续批次继续调代理（需环境变量）；画布上插件仅覆盖首批。

---

## 3. 丰富后的上下文（enrichedContext）

| 字段 | 说明 |
|------|------|
| `trajectories` | 轨迹列表（`nodes` 时间线，`summary` 含 `carrierCode`、`standardCarrier`、`dataSource`、`accountScopeHint` 等） |
| `carrierHints` | 由合并节点按每条轨迹 `summary` 预抽取的 `{ trackingNo, carrierCode?, standardCarrier? }[]`，供 LLM 写入 `structured.carriers`；`format-output` 会与 LLM 输出合并并以 API 侧字段优先 |
| **`computedScanFacts`** | 由合并节点对每条 `trajectory` 的 `nodes` 做确定性解析：`ascanEvents` / `dscanEvents` / `rdscanEvents`、**`deliveryFailureLikely`** 及 `deliveryFailureEvidence`（启发式）等；**与 `format-output` 写入的 `structured.scanFacts` 同源**；无节点时为 `dataSourceNote: "no_nodes"`，仅有仓库节点且承运商数据未确认时为 `dataSourceNote: "carrier_data_unverified"`。后者的空扫描数组不表示确定无 Ascan。LLM 的 `analysis` 须与之自洽。 |
| **`carrierLastScanAt`** | 仅取 Ascan/Dscan/RDscan 中最晚时间；仓库 DLI/DIC 不得写入。 |
| **`warehouseLastEventAt`** | 仅取 SO/GTN/PKC/PAC/DIC/DLI 中最晚时间，供无上网时长说明。 |
| **轨迹去重** | 同一 OpenAPI 行被 WO 与 trackingNo 重复命中时，按实际 trackingNo 去重并保留节点更完整的一条。 |
| `trajectoryText` | 用户粘贴文本（若有） |
| `trackingIds` / `outboundOrderNos` | 入参 + 轨迹反填，去重 |
| `analysisClock` | `{ utcIso, timezoneLabel, note }`，供与时区敏感的推理 |

时间表述必须跟随事实来源：无 `carrierLastScanAt`、只有 `warehouseLastEventAt` 时，只能说明距仓库最近作业事件的时长，不能称为承运商轨迹停更。`noUpdateDays` 是按运行时 `analysisClock` 计算的兼容字段，会随测试日期增长；历史回归应保存快照时间，实时验收应核对事件时间与阈值区间，不锁死某个天数。

OpenAPI 只有 SO/GTN/PKC/PAC/DIC/DLI 等仓库节点时，`summary.carrierDataStatus` 标为 `unverified`。系统可尝试用实际 trackingNo 查询公开轨迹补充；若仍无承运商证据，必须保留“承运商数据未确认”，不得归类为确定无上网。
| `fetchMeta` | 拉数批次数、`publicFallbackKeys`、`notes` 等 |
| `orderDetails` | 占位空数组（当前专家不再拉单独出库详情 API） |

---

## 3.1 下游专家（如 delivered-not-received）

当编排器在 **`delivery-status` 之后**调用 **妥投未收到（`delivered-not-received`）** 时，建议将下列内容 **原样或合并** 传入 DNR（字段名与 DNR design 对齐）：

| 传给 DNR 的片段 | 来源 | 说明 |
|-----------------|------|------|
| `enrichedContext` | 本会话的 `merge-enriched-context` 合并结果 | 含 `trajectories`、`fetchMeta`、`analysisClock`、`trackingIds` / `outboundOrderNos` 等（见 §3），供 DNR 做细节核对 |
| `inputContext.previousOutput` | 本会话 `format-output` 的 **顶层 `{ structured, analysis }`**（或与 **`result`** 字段同构对象） | 至少包含 **`analysis`**（全链路事实与关键里程碑长文）；可选 **`structured`**（`trackingIds`、`orderIds`、`documentRefs`、**`carriers`、`scanFacts`** 等，与 [format-output.ts](nodes/format-output.ts) 一致；**`scanFacts` 可辅助 DNR 核对妥投/退回/派送失败，与 `trajectories` 交叉验证**） |
| `inputContext.sourceExpertId` | 固定或显式 | 建议 `"delivery-status"` |
| `inputContext.chainId` | 与上游请求一致 | 全程透传 |

`outputContext.resultSummary` 可作为编排器展示摘要，**不能替代** `previousOutput` 中的完整 `analysis`（若编排需截断，须在 DNR 侧可接受范围内保留妥投/状态结论要点）。

---

## 4. 工作流编排

```
用户输入
    │
    ▼
validate-input ──branch──► identifiers ──► build-winit-tracking-data ──► winit_openapi_plugin ──┐
    │                                                                                              │
    ├──branch──► text ──► fetch-trajectories（仅透传/空轨迹）◄─────────────────────────────────────┘
    │                                      │
    │                                      ▼
    └──────────────────────────────── merge-enriched-context
                                        │
                                        ▼
                                   llm-analyze
                                        │
                                        ▼
                                  format-output
```

---

## 5. FaaS 单文件节点（nodes/）

| 节点文件 | 说明 |
|----------|------|
| `validate-input.ts` | 校验；`branch`: `identifiers` \| `text` |
| `build-winit-tracking-data.ts` | 拼装首批 `winitRequestData`、`queryKeys` |
| `fetch-trajectories.ts` | OpenAPI 多批 + 公开兜底 + 透传字段 |
| `merge-enriched-context.ts` | 合并 `enrichedContext`，注入 `analysisClock` |
| `winit-openapi-plugin.ts` | 插件占位说明（非可执行） |
| `llm-analyze.ts` | LLM 声明 |
| `format-output.ts` | 输出格式化 |

**环境变量（本地代理）**：`COZE_API_TOKEN`（或 `COZE_WORKFLOW_PAT`）、`COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID`、`COZE_WINIT_CUSTOMER_CODE`、`COZE_WINIT_CUSTOMER_NAME`、`COZE_WINIT_USERNAME`；可选 `COZE_API_BASE_URL`。
