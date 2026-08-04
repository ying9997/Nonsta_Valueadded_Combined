# inbound/inbound-psc-eligibility 专家设计

入库可用 PSC 查询：只读快照当前客户可下单的入库产品线（OW01* 系列），包括自验、海外验、头程权限状态。

---

## 调用说明

### 适用场景

- 客户询问「我能用哪些入库产品」、「OW01031 有没有开通」、「我有没有自验权限」、「可以用海外验吗」。
- 作为上游共享专家，被 `inbound-order-manage`（下单前 PSC 校验）、`inbound-permission-apply`（当前权限快照）、`inbound-process-guide`（差异化规则匹配）调用（由 planner 编排，**不由本专家内部调用**）。
- **不适用**：如何申请新权限（→ `inbound-permission-apply`）；还有多少 CBM/SKU 额度（→ `inbound-capacity-availability`）。

### 最小入参

- 无强制业务字段；`warehouseCode` 可选，仅作上下文（API 不按仓过滤）。

### 参数提示

- `filterCodes`：仅关心特定 PSC 时传入；如 `["OW01021","OW01022"]` 过滤自验相关产品（支持家族前缀匹配）。
- `customerCode` 属框架顶层；本专家默认使用当前已认证客户的身份查询，无需在 `inputs` 重复传递。

### 示例调用

**示例 1：全量 PSC 查询**

```json
{
  "query": "列出当前客户所有可用入库产品",
  "customerIntent": "客户问：我能用哪些入库方式",
  "inputContext": { "chainId": "case-20260608-060" },
  "inputs": {
    "warehouseCode": "USLAX01"
  }
}
```

**示例 2：自验权限确认**

```json
{
  "query": "确认客户是否已开通自验（OW01021/OW01022）",
  "customerIntent": "客户问：我有没有自验权限",
  "inputContext": {},
  "inputs": {
    "filterCodes": ["OW01021", "OW01022"]
  }
}
```

---

## 1. 输入设计

### 框架顶层

| 字段 | 类型 | 说明 |
|------|------|------|
| query | string | 任务说明 |
| customerIntent | string | 业务问题摘要 |
| customerCode | string | 框架顶层；Winit 客户编码，认证后自动注入 |
| inputContext | object | 可选 |

### inputs 业务字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| warehouseCode | string | 否 | 上下文仓库编码（API 不按仓过滤） |
| filterCodes | string[] | 否 | 仅返回指定 PSC 编码结果（支持前缀，如 `OW01021`） |

---

## 2. 数据拉取与兜底

> **接口依据**：`已确认` · [查询头程服务](https://developer.winit.com.cn/document/detail/id/28.html)

| Action | 系统 | 接口 | 接口依据 | 说明 |
|--------|------|------|----------|------|
| 主路径 | OSWH OpenAPI | `winit.wh.pms.getWinitProducts` | **已确认** | 按 `productType` 查询可下单 Winit 产品 |

### productType 入参

| productType | 产品线 |
|-------------|--------|
| OW0101 | 标准海外仓入库 |
| OW0102 | 直发自验入库 |
| OW0103 | 直发海外验入库 |

默认对三种 `productType` 各调用一次（批处理）；若 `filterCodes` / `productLine` 可推断产品线，则只查相关类型。

### 响应字段

| 字段 | 说明 |
|------|------|
| productCode | 完整 PSC 编码（如 OW01010343） |
| productName | 产品名称 |
| description | 产品描述 |

**语义**：接口仅返回**可下单**产品，无 `enabled` 字段；未出现在结果中的 `filterCode` 视为未开通。

**Coze 集成链路**：`build-available-product-request` → `cobra_winit_openapi_request`（批处理）→ `fetch-available-product` → `merge-available-product`。

**降级策略**：API 不可用时，输出「当前无法实时查询，请前往万邑联平台-个人中心-产品权限查看」，`structured.apiAvailable=false`。

---

## 3. 工作流编排

```mermaid
flowchart TD
  Start[inputs] --> Validate[validate-psc-query]
  Validate --> Build[build-available-product-request]
  Build --> Plugin[cobra_winit_openapi_request]
  Plugin --> Fetch[fetch-available-product]
  Fetch --> Merge[merge-available-product]
  Merge --> LoadKB[load-psc-kb]
  LoadKB --> LLM[llm-analyze]
  LLM --> Format[format-output]
```

### 节点顺序

1. `validate-psc-query`：规范化 `filterCodes` / `productLine` / `warehouseCode`
2. `build-available-product-request`：按 `productType`（OW0101/OW0102/OW0103）组装批处理 actions
3. `cobra_winit_openapi_request`：调用 `winit.wh.pms.getWinitProducts`
4. `fetch-available-product`：合并批处理响应为 `rawPscData.list`
5. `merge-available-product`：过滤、推断权限标记、构造 `pscFacts`
6. `load-psc-kb` + `llm-analyze` + `format-output`

---

## 4. 节点说明

| 节点文件 | 输入 params | 输出 |
|----------|-------------|------|
| `build-available-product-request.ts` | `filterCodes`, `productLine` | `actions[]`（含 `productType`）, `actionName` |
| `fetch-available-product.ts` | plugin 输出 / actions | `rawPscData.list` |
| `merge-available-product.ts` | `rawPscData`, `filterCodes` | `pscFacts`（含 `enabledProducts`, 权限布尔标记） |
| `load-psc-kb.ts` | KB + 上下文 | `pscCodeMap`, `kbContent` |
| `format-output.ts` | LLM 输出 | `result`, `outputContext`, `enrichedContext` |

---

## 5. 输出设计

### structured 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| enabledProducts | object[] | 可下单 PSC：`[{ productCode, productName, description, productType, inspectionType }]` |
| disabledProducts | object[] | `filterCodes` 指定但未在 API 结果中出现的家族编码 |
| hasSelfInspection | boolean | 是否存在 OW0102* 产品 |
| hasOverseasInspection | boolean | 是否存在 OW0103* / OW0104* 产品 |
| hasStandardFirstLeg | boolean | 是否存在 OW0101* 产品 |
| apiAvailable | boolean | API 是否成功返回 |
| apiAction | string | `winit.wh.pms.getWinitProducts` |
| queryWarehouseCode | string | 上下文仓库编码 |

### analysis 原则

- 简洁列举可下单产品；可按 productType 分组
- 如客户问「有没有海外验」且 `hasOverseasInspection=false`，说明未开通并提示申请路径

### enrichedContext

写入 `inbound/inbound-psc-eligibility`：`{ enabledProducts, hasSelfInspection, hasOverseasInspection, hasStandardFirstLeg }`，供下游专家复用。

---

## 6. Prompt 知识片段

| 文件 | 说明 |
|------|------|
| `prompts/kb-psc-products.md` | productType 对照、权限标记规则、家族编码前缀 |
| `prompts/main.md` | LLM 系统 Prompt |

---

## 7. 对客约束

- 只读查询，不处理申请（→ `inbound-permission-apply`）
- 不输出 CBM/SKU 额度（→ `inbound-capacity-availability`）
- 不含飞书表格链接；申请入口说明为「通过万邑联客服渠道申请」

---

## 8. 已废弃接口

| 接口 | 说明 |
|------|------|
| `queryInboundProduct` | API 矩阵旧名，已废弃 |
| `POST /wh/inboundtrade/order/availableProduct` | OMS 内部端点，已由 `winit.wh.pms.getWinitProducts` 替代 |
