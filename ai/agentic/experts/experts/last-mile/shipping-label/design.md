# shipping-label 尾程面单查询专家设计

## 调用说明

### 适用场景

- 用户要查询、下载或留档尾程面单，或将面单用于平台申诉。
- 支持 WO 主单号、`WO...A` 包裹号、trackingNo、卖家订单号。
- 不处理可打印发货标签申请，不负责物流状态解读或轨迹查询。

### 最小入参

- `inputs.orderIdentifiers`：必填，1～10 个非空标识。
- 框架顶层必须提供 `customerCode` 与 `username`；`customerName` 可为空。

### 示例调用

```json
{
  "query": "查询这些订单的尾程面单",
  "customerIntent": "下载面单用于平台申诉",
  "customerCode": "<当前客户编码>",
  "customerName": "<当前客户名称>",
  "username": "<当前客户账号>",
  "language": "zh_CN",
  "inputContext": { "chainId": "shipping-label-001" },
  "inputs": {
    "orderIdentifiers": ["WO12345678901", "TRACKING-NO-EXAMPLE"]
  }
}
```

## 1. 业务边界

- 面单接口返回的 PDF 已包含 `DO NOT PRINT - SAMPLE ONLY` 水印及条码模糊处理，Expert 原样返回，不修改域名、不转存、不二次处理。
- 对客必须说明：链接通常约 60 分钟有效；PDF 仅供查询、留档或申诉，不可用于实际发货打印。
- 不询问申请理由，不检查三方面单、6 个月期限，不按订单状态设置本地白名单。
- 接口业务结果是能否提供面单的唯一依据。

## 2. 输入与限制

| 字段 | 类型 | 约束 |
|------|------|------|
| `orderIdentifiers` | string[] | 单次提交 1～10 个非空标识，进入查询前去重 |

- `WO + 数字 + 可选字母后缀` 识别为万邑通出库单；包裹后缀自动移除。
- 其他标识先使用 `trackingNo` 查询；该查询无结果时才使用 `sellerOrderNo` 结果。
- 同一查询类型匹配多个 WO 时全部保留；全局按 WO 去重并保留 `matchedFrom`。
- 最终解析超过 20 个 WO 时，不调用面单接口，要求用户缩小范围；禁止静默截断。

## 3. OpenAPI 数据流

```text
validate-input
  → build-order-resolution-actions
  → queryOutboundOrderList 批处理插件
  → merge-order-resolution
  → build-label-actions
  → wh.outbound.getMaskedLabelUrl 批处理插件
  → merge-label-results
  → format-output
```

### 3.1 订单定位

- WO/包裹号在代码节点内直接规范化，不调用定位接口。
- 其他标识各生成两条 `queryOutboundOrderList` action：`trackingNo` 与 `sellerOrderNo`。
- 查询日期范围采用最近一年，单页 50 条；解析后仍受 20 个 WO 安全上限约束。

### 3.2 面单查询

每个唯一 WO 生成一条 action：

```json
{
  "action": "wh.outbound.getMaskedLabelUrl",
  "data": "{\"orderNo\":\"WO...\",\"customerCode\":\"...\"}"
}
```

- `customerCode` 同时来自框架顶层并写入业务 `data`。
- 不传可选 `trackingNo`，获取该订单全部包裹面单。
- 两个插件批处理节点均设置 `batchSize: 20`、`concurrentSize: 10`。

## 4. 输出与失败分类

`structured.status`：`success`、`partial_success`、`failed`、`need_input`、`too_many_matches`。

逐订单 `result`：

| result | 含义 |
|--------|------|
| `success` | 至少一个可用 PDF URL |
| `no_label` | 接口成功但 `maskedLabelUrlList` 为空 |
| `not_found` | 订单不存在或未匹配 |
| `not_supported` | 接口明确表示当前不支持查询 |
| `forbidden` | 当前客户账号无权查询 |
| `service_error` | 未识别业务错误、插件异常或响应缺失 |

- `businessCode` 始终为字符串，保留可能的前导零。
- 批量部分成功时保留成功链接，并逐单说明失败原因。
- 未识别错误不对客暴露原始内部信息，也不未经证据宣称服务暂时不可用；统一使用“当前未能获取尾程面单”的中性提示。
- `02020249908` 表示订单尚未完成出库，映射为 `not_supported`；对客说明尚未出库是本次无法获取面单的原因，并引导完成出库后再自助查询，不转人工。
- `02020249909` 已通过同身份控制查询确认表示“已超过可查询时限（出库后30天内可查）”，映射为 `not_supported`；对客同时说明尾程面单已支持自助查询和本单超过 30 天，禁止套用“仅支持人工客服提供”或自动转人工的旧规则。
- 其他异常按可确认原因提示：订单未找到时提示核对标识与归属；权限或归属校验失败时提示使用订单所属账号；成功空列表时说明未返回面单文件；未知业务码或无有效响应时明确“原因未确认”，不得猜测原因。
- 其他未确认语义的业务码保持 `service_error`。只有取得接口原始 `msg/data` 或官方枚举后，才能按真实语义映射为 `not_supported`、`forbidden` 或 `not_found`。
- 临时 URL 仅存在于本轮 `structured.orders[].labels` 和 `analysis`，不得写入 `outputContext` 或 `enrichedContext`。

## 5. 节点职责

| 节点 | 职责 |
|------|------|
| `validate-input` | 输入、数量与账号上下文校验 |
| `build-order-resolution-actions` | 直接 WO 解析与模糊标识 action 构建 |
| `merge-order-resolution` | tracking 优先、seller 兜底、映射、去重与 20 单保护 |
| `build-label-actions` | 逐 WO 构建面单 action |
| `merge-label-results` | 解析面单列表并分类逐单错误 |
| `format-output` | 确定性生成四字段输出，不使用 LLM |

## 6. 安全与上线要求

- 不记录或输出 token、签名、用户名、客户编码及插件调试信息。
- 真实客户样本只保存在 Git 忽略的验证目录。
- 发布前必须完成本地校验、Coze 草稿态真实测试，并再次取得发布授权。
