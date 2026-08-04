# 本地调试脚本

## dev:expert

运行专家工作流，支持 Coze 代码节点与 LLM 节点。

```bash
npm run dev:expert <expert-id> -- [--key value ...]
```

示例：

```bash
npm run dev:expert outbound-order-status -- --outboundOrderNos '["WO001"]' --customerIntent "查状态"
```

### LLM 节点

- **未配置 OPENAI_API_KEY**：使用 Mock，返回预设的 `analysisResult`
- **已配置 OPENAI_API_KEY**：调用 OpenAI API，读取 `prompts/main.md`，注入上下文，解析 JSON 输出

环境变量：

| 变量 | 说明 |
|------|------|
| OPENAI_API_KEY | OpenAI API 密钥（必填，使用真实 LLM 时） |
| OPENAI_MODEL | 模型名，默认 `gpt-4o-mini` |
| OPENAI_BASE_URL | 可选，兼容 OpenAI 协议的网关地址 |

CLI 会加载项目根目录 `.env`（见 `dotenv/config`）。可复制 [.env.example](../.env.example) 为 `.env` 后填写。

### 万邑通（Coze Workflow 代理）

**出库专家（`outbound-order-status`）**：Coze 导出包为线性 **`resolve-outbound-lookup` → `build-outbound-primary-winit` → 万邑通插件 → `merge-winit-outbound-plugin-batch`**。统一走 `queryOutboundOrderList`（id/54）：`WO...` 用 `outboundOrderNum`；非 WO 按 `trackingNo` 优先、`sellerOrderNo` 兜底。插件结果在 merge 节点直接产出 `rawOrderData`，不再二次调用 `queryOutboundOrder`（id/55）。

| 变量 | 说明 |
|------|------|
| COZE_API_TOKEN | Coze 访问令牌（`Authorization: Bearer`，也可用 `COZE_WORKFLOW_PAT`） |
| COZE_WINIT_WORKFLOW_ID | 工作流 ID（字符串） |
| COZE_WINIT_CUSTOMER_CODE | 工作流入参 customerCode |
| COZE_WINIT_CUSTOMER_NAME | 工作流入参 customerName |
| COZE_WINIT_USERNAME | 工作流入参 username |
| COZE_WINIT_LANGUAGE | 可选，工作流入参 language |
| COZE_API_BASE_URL | 可选，默认 `https://api.coze.cn` |
| COZE_WINIT_LIST_DATE_START / COZE_WINIT_LIST_DATE_END | 可选，`queryOutboundOrderList` 下单日期范围；不设则默认近一年 |
| COZE_WINIT_LIST_PAGE_SIZE / COZE_WINIT_LIST_PAGE_NUM | 可选，列表分页，默认 50 / 1；传入万邑通时为**字符串**（与官方示例一致） |
| COZE_WINIT_LIST_STATUS | 可选，列表接口 `status`（如 `ALL`、`VO`），见 [文档 id/54](https://developer.winit.com.cn/document/detail/id/54.html) |
| COZE_WINIT_LIST_WAREHOUSE_ID | 可选，列表接口 `warehouseId` |

`queryOutboundOrder` / `queryOutboundOrderList` 的 `data` 字段已按 [id/55](https://developer.winit.com.cn/document/detail/id/55.html)、[id/54](https://developer.winit.com.cn/document/detail/id/54.html) 封装。未设置 `COZE_WINIT_LANGUAGE` 时，本地替身会默认传 `zh_CN`（与官方请求示例一致）。

**部署到 Coze**：执行 `npm run export:coze -- experts/outbound/outbound-order-status` 生成含插件与条件分支的包；单笔路径已对齐 design-spec §6。详见 [`nodes/README.md`](../experts/outbound/outbound-order-status/nodes/README.md)。

### 四则运算模板（`arithmetic-formula`）与 SKU_QTY

模板专家 [`evaluate-expression.ts`](../experts/_template/arithmetic-formula/nodes/evaluate-expression.ts) 支持 **`SKU_QTY(wh=仓库, sku=SKU)`** 在式内声明仓与 SKU，并兼容无括号 **`SKU_QTY`**（依赖入参 `warehouseCodes`/`merchandiseCode`）；数值由 **`fetch-sku-inventory`** 调万邑通 [queryProductInventoryList4Page / id/58](https://developer.winit.com.cn/document/detail/id/58.html) 的 **`qtyAvailable`（可用）**。**勿与**上方 `COZE_WINIT_WORKFLOW_ID`（出库 customerCode 形态）混用。

| 变量 | 说明 |
|------|------|
| COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID | 代理工作流 ID（如 `7623329033350168611`），`parameters` 为 `action`、`customerCode`、`customerName`、`username`、`data` |
| COZE_WINIT_CUSTOMER_CODE / COZE_WINIT_CUSTOMER_NAME / COZE_WINIT_USERNAME | 与出库一致，传入上述代理 |
| WINIT_POD_FILE_BASE_URL / **WINIT_FILE_BASE_URL** | 可选；覆盖 POD 相对路径拼接默认根址 **`https://cnfmsstream.winit.com.cn`**（无末尾 `/`），再生成卖家代理链 `https://seller.winit.com.cn/User/fmsFileDownload?url=<encodeURIComponent(FMS)>` |

仍使用 `COZE_API_TOKEN`（或 `COZE_WORKFLOW_PAT`）与 `COZE_API_BASE_URL`。专家对外入参**不含** `skuUsableQty`/`warehouseCodes`；本地调试可在 CLI **额外**传入 `--skuUsableQty`、`--warehouseCodes` 等，Runner 会并入上下文供 **`fetch-sku-inventory`** 消费。库存接口为 **id/58**（默认 `inventoryType=Warehouse`，分页见 manifest）。**Windows 下**若 `npm run dev:expert ... -- --expression ...` 丢参，可改用：`npx ts-node -P scripts/tsconfig.json scripts/run-expert-cli.ts arithmetic-formula -- --expression "1+2"`。

**Coze FaaS**：在 **`fetch-sku-inventory`** 前接 openapi 插件（或写入 `skuUsableQty`）；由 **`fetch-sku-inventory`** 产出 `skuResolutions` 再传入 **`evaluate-expression`**。求值节点内不请求 `workflow/run`。

### 生成万邑通 OpenAPI 代理 Coze 包

与 [`COZE-WORKFLOW.md`](../COZE-WORKFLOW.md) §3.1 一致：导出仅含「开始 → `cobra_winit_openapi_request` → 结束」的工作流目录与 zip，便于在 Coze 中导入后与本地 `workflow/run` 参数对齐。

```bash
npm run export:coze:winit-openapi-proxy
# 默认 tmp/coze_winit_openapi_proxy/workflow/，并写 experts_coze_output/winit_openapi_call.zip
npm run export:coze:winit-openapi-proxy -- --out tmp/my_proxy --workflow-id <与线上一致> --no-zip
```

实现：`scripts/export-winit-openapi-proxy-cli.ts`、`scripts/coze-export/winit-openapi-proxy-emit.ts`；插件常量 **`scripts/coze-export/winit-openapi-plugin-shared.ts`**（专家 `export:coze` 内嵌插件与独立包共用）。平台升级插件后若需改 `apiID` / `pluginVersion` 等，在该 shared 文件修改后重新导出。

**PowerShell**：`npm run … -- --no-zip` 有时不会把参数传到 `ts-node`；可改用 `cmd /c "npm run export:coze:winit-openapi-proxy -- --no-zip"` 或上面的 `npx ts-node … --no-zip`。

---

## test:expert:online（线上子工作流独立探测）

对 **Coze 已发布** 的专家子工作流发起真实 `POST /v1/workflow/run`（与 [experts_recaller/nodes/call-expert.ts](../experts_recaller/nodes/call-expert.ts) 的 `parameters` 与返回解析一致）。**`workflow_id`** 从飞书专家登记表多维表读取 **`coze_workflow_id`**，筛选条件与编排读表一致：`expert_id` + **`release_id`** + **`available=on`**；同一批次下若多行同专家，取 **`ver` 字符串降序** 最新一行（可用 `--ver` 锁定）。

### 环境变量

| 变量 | 说明 |
|------|------|
| EXPERT_REGISTER_RELEASE_ID | 当前灰度/生产登记批次 id（与 `experts_recaller` 的 `release_id` 一致）；可被 `--release-id` 覆盖 |
| FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_BITABLE_APP_TOKEN / FEISHU_BITABLE_TABLE_ID | 与 `sync:expert-register` 相同，指向专家登记表 |
| COZE_API_TOKEN 或 COZE_WORKFLOW_PAT | Coze 调用令牌 |
| COZE_API_BASE_URL | 可选，默认 `https://api.coze.cn` |

### 命令示例

```bash
# 仅解析登记表，打印 workflow_id / ver（不调用 Coze）
npm run test:expert:online -- --expert-id tracking-inquiry --release-id rel-experts-20260509 --dry-resolve

# 跑通全流程 + 可选 expect 断言（fixture 内 parameters 原样作为 workflow/run 的 parameters）
npm run test:expert:online -- --fixture scripts/expert-online-test/fixtures/my.local.json --expert-id tracking-inquiry
```

成功输出会包含 `execute_id` 与 `debug_url`；`debug_url` 是 Coze Trace 页面地址，可直接用于回看本次真实 `workflow/run` 运行记录。若需要继续做脱敏摘要，可将该 URL 传给 `inspect:coze-run-history`。

### Fixture（JSON）

路径自定；敏感单号建议用 `*.local.json`（已在仓库 `.gitignore` 忽略）。字段：

- **`expert_id`**（可选）：与 `--expert-id` 一致时可省略其一。
- **`parameters`**（必填）：须含 `customerCode`、`customerIntent`、`customerName`、`inputContext`、`inputs`、`language`、`query`、`username`。
- **`expect`**（可选）：对 `outputContext.expertId` / `chainId` 精确匹配；对 `resultSummary`、`analysis` 支持 `minLength` / `includes` / `regex`；`structuredKeys` 要求 `structured` 上键存在；`structuredPaths` 为点分路径须存在且非 null。

示例模板：[scripts/expert-online-test/fixtures/example.fixture.json](expert-online-test/fixtures/example.fixture.json)。

### 注意

- 灰度即生产时，凭据与业务入参等同生产操作，勿在 fixture 中提交真实单号到 Git。
- 登记表若因列类型无法服务端筛选，CLI 会分页扫描并在本地过滤（与 `get-expert-registry` 思路类似）。
