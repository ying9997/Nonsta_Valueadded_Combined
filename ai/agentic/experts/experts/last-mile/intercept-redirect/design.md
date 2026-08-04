# intercept-redirect 专家设计

订单拦截/改址处理流程。

## 调用说明

### 适用场景

- 客户要**拦截包裹、修改收货地址或了解改址时效与费用规则**。
- 不适用：包裹已妥投或承运商规则不允许改址时（需明确告知限制）。

### 最小入参

- `trackingIds` 与 `outboundOrderNos` 至少其一非空更易定位订单。

### 参数提示

- 改址常有时效窗口，需在 `query`/`customerIntent` 中说明是否已出库、是否在途。
- 单号类字段只在 `inputs`；不要把 `customerIntent` 放进 `inputs`。
- 透传 `inputContext.chainId`。

### 示例调用

```json
{
  "query": "这单还能改地址吗",
  "customerIntent": "客户搬家了新地址",
  "inputContext": { "chainId": "ir-001", "sourceExpertId": "", "previousOutput": "" },
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
| outboundOrderNos | string[] | 出库单号 |

## 2. 输出设计

- **structured**：订单号、跟踪号等标识符
- **analysis**：拦截/改址流程指引、时效说明、建议动作

## 3. 工作流编排

待补充。

## 4. 节点说明

待补充。
