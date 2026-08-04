# 万邑通（Winit）OpenAPI 集成开发手册

本文面向在仓库中**新建 expert** 的作者，说明本工程如何经 **Coze** 调用万邑通 OpenAPI：调用形态、环境变量、与现有文档的交叉引用。细节命令与全量环境表仍以 [../scripts/README.md](../scripts/README.md)、[../COZE-WORKFLOW.md](../COZE-WORKFLOW.md) 为准，此处不重复复制长文。

---

## 1. 背景与约束

- 本仓库**不实现**万邑通 **HTTP 直连**（不直接向 `openapi.winit.com.cn` 发业务请求并维护签名/会话）。生产路径统一为：
  - **Coze 插件** `cobra_winit_openapi_request` 透传；或
  - 等价的 **`POST {COZE_API_BASE_URL}/v1/workflow/run`**，由线上工作流包执行同一插件逻辑。
- 节点侧典型封装见 [../experts/outbound/outbound-order-status/nodes/fetch-outbound-order.ts](../experts/outbound/outbound-order-status/nodes/fetch-outbound-order.ts)：`runCozeWinitWorkflow`、`invokeWinitOpenapiViaCoze` 负责拼 `parameters` 并解析返回。
- 各 OpenAPI 的 **action 名**、**`data` 内字段** 以万邑通官方文档（如 id/54、id/55、id/58 等）为准；本文只描述**本仓库的接入方式**。

---

## 2. 两种编排模式（新建 expert 须先选）

### 模式 A：独立万邑通代理工作流

用于「通用透传」：工作流**仅**由 **开始 → 插件 → 结束** 组成。开始节点承载完整 `parameters` 源：`action`、`customerCode`、`customerName`、`data`（**字符串**）、`username`、`language`；结束节点从插件拉 `code`、`data`、`msg`。

- YAML 结构对照：[coze-reference/winit_openapi_call-draft.yaml](coze-reference/winit_openapi_call-draft.yaml)。
- 生成可导入包：`npm run export:coze:winit-openapi-proxy`（选项与 PowerShell 注意见 [../COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §3.2）。

```mermaid
flowchart LR
  startNode[Start_100001]
  pluginNode[cobra_winit_openapi_request]
  endNode[End_900001]
  startNode -->|action_customer_data| pluginNode
  pluginNode -->|code_data_msg| endNode
```

### 模式 B：专家主工作流内嵌插件

在专家目录的 `coze.config.yml` 中配置 **`winitOpenapiPlugin`**（`insertBefore`、`openapiAction` / `requestActionFrom`、`requestDataFrom` 等）。**开始节点仅含框架顶层**客户信息（`customerCode`、`customerName`、`username`、`language` 等），**不**在调用方顶层传万邑通请求体；**`data` 由前置代码节点**按 `inputs` 拼装，再经插件进入万邑通。

- 规约见 [design-spec.md](design-spec.md) §6（含「专家主工作流内嵌万邑通插件时不要在调用 JSON 顶层传 `data`」）。
- 示例配置：[../experts/_template/arithmetic-formula/coze.config.yml](../experts/_template/arithmetic-formula/coze.config.yml)。

```mermaid
flowchart LR
  buildData[build_winit_data_node]
  pluginNode[cobra_winit_openapi_request]
  consumer[fetch_or_merge_node]
  buildData -->|winitRequestData| pluginNode
  pluginNode -->|plugin_data| consumer
```

---

## 3. `workflow/run` 调用契约（本地 TS 复用）

本地节点若直接调 Coze 工作流，通常约定如下（与 `fetch-outbound-order.ts` 一致）：

| 项 | 说明 |
|----|------|
| URL | `POST` `{baseUrl}/v1/workflow/run`，`baseUrl` 默认 `https://api.coze.cn`，可由 `COZE_API_BASE_URL` 覆盖 |
| 鉴权 | `Authorization: Bearer {COZE_API_TOKEN}`，亦可使用 `COZE_WORKFLOW_PAT` |
| Body | `workflow_id`（字符串）、`parameters` 对象 |
| `parameters` | `action`（万邑通 OpenAPI 动作名）、`customerCode`、`customerName`、`username`、`language`、`data`（**整个万邑通业务请求体经 `JSON.stringify` 的字符串**） |

响应：检查 HTTP 与业务 `code`；`data` 可能是 JSON 字符串，且存在**二次序列化**，解析时需与线上行为一致（实现上可参考 `parseCozeWorkflowDataField` 的逐层 `JSON.parse` 策略）。

---

## 4. 环境变量：两套 `WORKFLOW_ID`（易混对照）

| 用途 | 工作流 ID 变量 | 说明 |
|------|----------------|------|
| 出库单详情 / 列表等（`queryOutboundOrder`、`queryOutboundOrderList` 等） | `COZE_WINIT_WORKFLOW_ID` | 与出库专家画布对齐；详见 [../scripts/README.md](../scripts/README.md)「万邑通（Coze Workflow 代理）」出库小节 |
| 通用代理（库存 id/58、last-mile 轨迹等**复用「独立代理包」形态**） | `COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID` | 典型值与独立包 `winit_openapi_call` 的线上一致；见 [../scripts/README.md](../scripts/README.md) 四则模板与 SKU 小节 |

**共用**（两模式都需要，除非纯画布不调本地 `workflow/run`）：

- `COZE_API_TOKEN` 或 `COZE_WORKFLOW_PAT`
- `COZE_WINIT_CUSTOMER_CODE`、`COZE_WINIT_CUSTOMER_NAME`、`COZE_WINIT_USERNAME`
- 可选 `COZE_WINIT_LANGUAGE`、`COZE_API_BASE_URL`

**出库 / 列表策略可选**（仅部分节点使用，见 [../experts/outbound/outbound-order-status/design.md](../experts/outbound/outbound-order-status/design.md) 与 [../scripts/README.md](../scripts/README.md)）：

- `COZE_WINIT_LIST_DATE_START` / `COZE_WINIT_LIST_DATE_END`
- `COZE_WINIT_LIST_PAGE_SIZE`、`COZE_WINIT_LIST_MAX_PAGES`、`COZE_WINIT_LIST_STATUS`、`COZE_WINIT_LIST_WAREHOUSE_ID`
- `COZE_WINIT_MULTI_FETCH_STRATEGY`（`detail` 与 `list`）
- `COZE_WINIT_OPENAPI_CONCURRENCY`

**插件元数据**（`apiID`、`pluginID` 等）在仓库中的**唯一维护位置**为 [../scripts/coze-export/winit-openapi-plugin-shared.ts](../scripts/coze-export/winit-openapi-plugin-shared.ts)。Coze 侧插件升级后应改此文件并重新执行 `export:coze` 或 `export:coze:winit-openapi-proxy`，勿在多个 YAML 中手工分散修改。

---

## 5. 新建 expert 实操清单（Checklist）

1. **Schema**：[design-spec.md](design-spec.md) §6：不要把万邑通请求体 **`data`** 或 **`action`** 放进 `manifest.json` 的 `inputSchema`；框架顶层客户字段与 `inputs` 的划分按规格执行。
2. **拼装请求**：为所需 OpenAPI 增加 **构建 `data` 的代码节点**（惯用命名如 `build-*-winit-data`），输出供插件或 `workflow/run` 使用。
3. **画布**：
   - 若用**模式 B**，在 `coze.config.yml` 配置 `winitOpenapiPlugin`，并在 `nodes/` 增加**插件占位 `.ts`（注释说明 action 与拉线关系）**——见 [design-spec.md](design-spec.md)「Coze 插件节点占位声明」。
4. **消费结果**：在后续节点解析 `data`（字符串）为业务对象；未配置 `COZE_*` 时行为需与产品一致（例如占位空列表、告警日志），见各专家 `design.md`。
5. **导出**：`npm run export:coze -- experts/<域>/<expert-id>`；仅需要独立万邑通包时用 `npm run export:coze:winit-openapi-proxy`。
6. **本机联调**：[../LOCAL-INVOCATION.md](../LOCAL-INVOCATION.md)；Runner 可透传 `--coze-winit-customer-code` / `--coze-winit-username` 等覆盖 `.env`。

---

## 6. 仓库内参考实现索引

| 场景 | 主要节点 / 文件 | 使用的 workflow 环境变量 |
|------|-----------------|-------------------------|
| 出库单详情、列表、补拉、可选费用/轨迹 | [../experts/outbound/outbound-order-status/nodes/fetch-outbound-order.ts](../experts/outbound/outbound-order-status/nodes/fetch-outbound-order.ts) | `COZE_WINIT_WORKFLOW_ID` |
| SKU 库存（id/58 等） | [../experts/_template/arithmetic-formula/nodes/fetch-sku-inventory.ts](../experts/_template/arithmetic-formula/nodes/fetch-sku-inventory.ts) | `COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID` |
| 尾程轨迹等 | [../experts/last-mile/delivery-status/nodes/fetch-trajectories.ts](../experts/last-mile/delivery-status/nodes/fetch-trajectories.ts)（及同领域相关节点） | `COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID` |

出库单编排与 Coze 画布关系见 [../experts/outbound/outbound-order-status/design.md](../experts/outbound/outbound-order-status/design.md) §3；循环/批处理样本见 [coze-reference/LOOP_AND_BATCH_SAMPLES.md](coze-reference/LOOP_AND_BATCH_SAMPLES.md)。

---

## 7. 常见问题（FAQ）

**两套 `WORKFLOW_ID` 混用会怎样？**  
`COZE_WINIT_WORKFLOW_ID` 应对的是**出库线**上配置的、开始节点/参数与出库插件链一致的包；`COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID` 对应**通用三节点代理包**。混用会导致 `parameters` 与线上工作流预期不一致、鉴权/客户字段虽相同但**后端路由错误**，表现为非预期错误或空数据。按上表为节点选变量。

**PowerShell 下 `npm run … -- --no-zip` 未生效？**  
见 [../COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §3.2 与 [../scripts/README.md](../scripts/README.md) 文末说明；可改用 `cmd /c` 或 `npx ts-node` 直跑脚本并带参数。

**FaaS 有插件、本地无插件时差异？**  
例如出库：画布上可能由插件先拉 id/55/id/54 一页，未齐套时由 [fetch-outbound-order.ts](../experts/outbound/outbound-order-status/nodes/fetch-outbound-order.ts) 在配置齐全时用 `workflow/run` **补拉**；本地未配置环境则走占位逻辑。设计细节见 `outbound-order-status` 的 `design.md` 与节点文件头注释。

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [design-spec.md](design-spec.md) §5–§6 | 框架顶层字段、万邑通 `data`/`action` 边界、插件占位 |
| [../COZE-WORKFLOW.md](../COZE-WORKFLOW.md) | 导出、内嵌插件、`export:coze:winit-openapi-proxy` |
| [../scripts/README.md](../scripts/README.md) | 环境变量全表、CLI、`dev:expert` 与万邑通段 |
| [../LOCAL-INVOCATION.md](../LOCAL-INVOCATION.md) | 本地安装与调用专家 |
