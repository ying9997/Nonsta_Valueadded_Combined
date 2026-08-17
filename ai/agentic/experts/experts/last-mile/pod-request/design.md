# pod-request 专家设计

申请、获取POD处理流程。

## 调用说明

### 适用场景

- 客户要**申请或获取妥投证明（POD）**，需要流程与材料指引。
- 不适用：无运单/出库单无法关联包裹时。

### 最小入参

- `trackingIds` 与 `outboundOrderNos` 至少其一非空更易执行；可两者都传。

### 参数提示

- 优先使用客户能提供的**最稳标识**（官方跟踪号或出库单号）。
- **`exportOutboundPod` 以出库单号列表为入参**：若仅有跟踪号，须先解析为万邑通出库单号（`WO…` 等），典型做法为编排**前置** [`delivery-status`](../delivery-status/design.md) 或 [`outbound-order-status`](../../../outbound/outbound-order-status/design.md)，或由本专家内节点在具备条件时补解析（与实现阶段二选一，**不在** `manifest.inputSchema` 顶层暴露万邑通 `data`）。
- `query`、`customerIntent` 为**调用 JSON 顶层**。
- 透传 `inputContext.chainId` 便于工单追踪。

### 示例调用

```json
{
  "query": "我要下载这份单的 POD",
  "customerIntent": "客户要索赔凭证",
  "inputContext": { "chainId": "podr-001", "sourceExpertId": "", "previousOutput": "" },
  "inputs": {
    "trackingIds": ["1Z999AA10123456784"],
    "outboundOrderNos": []
  }
}
```

```json
{
  "query": "",
  "customerIntent": "",
  "inputContext": {},
  "inputs": {
    "trackingIds": [],
    "outboundOrderNos": ["OB20250401001"]
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
| outboundOrderNos | string[] | 出库单号（与 OpenAPI `outboundOrderNoList` 对应） |

---

## 2. 输出设计

- **structured**：与对客交付相关的标识与链接（见下表）；无 POD 时各字段为空或省略，由 `analysis` 说明原因。
- **analysis**：申请指引、获取方式、链接时效与 **vPOD/ePOD** 说明；**不得**编造接口未返回的下载地址。

| structured 建议字段 | 类型 | 说明 |
|---------------------|------|------|
| outboundOrderNos | string[] | 实际参与导出的出库单号 |
| trackingIds | string[] | 入参透传或反填 |
| podFileUrls | string[] | **可直连下载的完整 URL**（由节点将接口返回的 `fileUrl` 与平台基址拼接后的结果，见 §3） |
| podRawPaths | string[] | 可选；接口返回的原始 `data.fileUrl` 片段，便于排障 |
| exportStatus | string | 如 `success` / `partial` / `failed` / `skipped_not_delivered`（与实现一致即可） |

---

## 3. 万邑通 OpenAPI：`exportOutboundPod`

与材料中「TOM 获取 POD」能力对齐的自动化路径：**经 Coze 插件 `cobra_winit_openapi_request` 透传**（见 [`docs/winit-openapi-integration.md`](../../../docs/winit-openapi-integration.md)），**不**在调用方顶层传万邑通 `data`；`data` 由前置代码节点 `JSON.stringify` 后写入插件入参。

### 3.1 请求体（`data` 反序列化后的对象）

| 字段 | 类型 | 说明 |
|------|------|------|
| outboundOrderNoList | string[] | 出库单号列表，与 `inputs.outboundOrderNos` 对应（去重、去空后填入） |

与 query 形态示例一致：`form` 编码前为 `{"outboundOrderNoList":["WO11375010754"]}`。

### 3.2 `action` 名

以万邑通 / 插件侧约定为准：与网关 `api=wh.outbound.exportOutboundPod` 对齐时，可能为 **`exportOutboundPod`** 或带命名空间的完整方法名；**`coze.config.yml` 的 `openapiAction` 与线上一致即可**。

### 3.3 业务响应体（插件返回 `data` 解析后的对象；成功示例）

```json
{
  "data": {
    "fileUrl": "72c9338f5e09414898b6f8da73365517/2026/05/04/b051c612ec4341639ebce00515f3754a.PDF"
  },
  "status": 1,
  "info": "success",
  "errorCode": ""
}
```

| 字段 | 说明 |
|------|------|
| data.fileUrl | **相对路径或对象键路径**（示例为 `…/yyyy/MM/dd/….PDF`）；可能含转义斜杠 `\/`，解析后应规范化为 `/`。 |
| status | 成功样例为 `1`；失败或非成功语义以万邑通文档为准，与 `errorCode`、`info` 联合判断。 |
| info | 人类可读信息，如 `success`。 |
| errorCode | 失败时可能非空；节点应据此分支，避免把错误响应当成有效文件。 |

### 3.4 `fileUrl` 与对客链接

- 接口返回的 `fileUrl` **通常不是**带 `https://` 的完整 URL；**须在实现节点内**与运维/文档提供的**下载基址**（CDN 或 openapi 文档中的文件域名）拼接为 `podFileUrls[]` 再写入 `structured`。
- 若官方提供「一次性签名 URL」与「仅路径」两种形态，以线上万邑通说明为准，并在 `analysis` 中提示**有效期**（若有）。

### 3.5 客户归属校验（安全门闸）

- **`exportOutboundPod` 无鉴权**：任意知道出库单号者均可尝试拉取 POD 文件，**必须在调用前**经有鉴权的 **`queryOutboundOrder`（id/55）** 确认出库单属于当前会话客户。
- 工作流顺序：`build-verify-outbound-winit-data` → 批处理插件 `queryOutboundOrder` → **`verify-outbound-ownership`** → 仅对 **`verifiedOutboundOrderNos`** 拼装 `exportOutboundPod` 请求。
- 校验失败时 `exportStatus` 为 **`skipped_not_owner`**，**不调用** `exportOutboundPod`；`analysis` 引导客户核对单号，勿泄露他人 POD。

### 3.6 妥投与调用顺序（业务门闸）

- **仅已妥投**场景才应承诺可提供 POD；与 [`docs/experts/last-mile/pod-request.md`](../../../docs/experts/last-mile/pod-request.md) 一致。
- **推荐**：编排器先跑 **`delivery-status`**，将轨迹结论放入 `inputContext.previousOutput` / `enrichedContext`，本专家 LLM 与节点**消费**该结论后再调 `exportOutboundPod`；若未妥投则 **跳过插件调用**，`analysis` 明确告知客户暂无 POD。

### 3.7 集成与环境变量

- 与尾程轨迹等「通用 OpenAPI 代理」一致时，使用 **`COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID`** + `COZE_API_TOKEN`（或 `COZE_WORKFLOW_PAT`）及 `COZE_WINIT_CUSTOMER_*` / `COZE_WINIT_USERNAME`；**勿与** `COZE_WINIT_WORKFLOW_ID`（出库单详情专用包）混用。详见 [`docs/winit-openapi-integration.md`](../../../docs/winit-openapi-integration.md) §4。

---

## 4. 工作流编排

```
用户输入
    │
    ▼
validate-input
    │
    ▼
（可选）merge / enrich：合并 inputContext.previousOutput、enrichedContext 中的轨迹与出库单摘要
    │
    ▼
branch：存在可导出 outboundOrderNoList（WO…）？
    │  N ──► fetch-export-pod（guidance，不调 OpenAPI）
    │  Y
    ▼
build-verify-outbound-winit-data ──► winit_verify_outbound_batch（queryOutboundOrder）
    │
    ▼
verify-outbound-ownership（产出 verifiedOutboundOrderNos）
    │
    ▼
build-export-pod-winit-data ──► winit_openapi_plugin（exportOutboundPod，仅 verified 单号）
    │
    ▼
fetch-export-pod（解析 status / errorCode / data.fileUrl，拼接完整 URL，写 structured）
    │
    ▼
llm-analyze（结合 SOP：vPOD/ePOD、自助渠道、查件兜底）
    │
    ▼
format-output
```

画布导出时：`build-export-pod-winit-data` 产出 **`winitRequestData`** → 插件 **`data`**；**`openapiAction`** 为字面量或与 `requestActionFrom` 一致；占位说明文件见规划中的 `nodes/winit-openapi-plugin.ts`（与 [`docs/design-spec.md`](../../../docs/design-spec.md) §6 一致）。

---

## 5. 节点说明（FaaS / Coze）

| 节点（规划名） | 说明 |
|----------------|------|
| `validate-input` | 校验 `trackingIds` / `outboundOrderNos` 至少其一；可选校验链路上游是否含妥投结论。 |
| `build-verify-outbound-winit-data` | 为每个 WO 组装 `queryOutboundOrder` 批处理 `actions`。 |
| `verify-outbound-ownership` | 合并插件结果，产出 `verifiedOutboundOrderNos` / `ownershipStatus`。 |
| `build-export-pod-winit-data` | 仅用 `verifiedOutboundOrderNos` 组装 `outboundOrderNoList`，输出 `winitRequestData`。 |
| `winit-openapi-plugin` | 插件占位声明（非可执行）；含归属校验批处理与 `exportOutboundPod` 两次调用。 |
| `fetch-export-pod` | 调插件或消费插件输出：解析 `status`、`info`、`errorCode`、`data.fileUrl`；规范化路径、拼接完整下载 URL；多单时与批处理策略对齐（若 OpenAPI 仅支持单笔，则循环或批处理由实现定）。 |
| `llm-analyze` | 基于 structured 与 SOP 生成 `analysis`。 |
| `format-output` | 输出 `result.structured` / `result.analysis` 与全局规范一致。 |

**与 `delivery-status` 的关系**：本专家**不重复**实现 id/56 轨迹拉取；妥投事实以前置专家或本专家消费的 `enrichedContext` 为准（参见 [`../delivery-status/design.md`](../delivery-status/design.md) §3.1 链式传递约定，可按需对齐字段名）。

---

## 6. 兜底与人工

- 接口失败、`errorCode` 非空、或成功但无 `fileUrl`：在 `analysis` 中引导 **查件/人工**（与飞书 SOP 一致）。
- 仍支持文档所列 **承运商官网自助**、**TOM 界面** 等路径作为补充说明，与自动 `exportOutboundPod` 不冲突。
