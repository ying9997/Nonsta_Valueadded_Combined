# expected-arrival-time 专家设计

预计到达时间处理流程。

## 调用说明

### 适用场景

- 客户查询**预计送达时间（ETA）**、到货窗口或是否延误。
- 不适用：无任何单号/轨迹可关联时。

### 最小入参

- `trackingIds` 与 `outboundOrderNos` 至少其一非空更易计算；可两者都传。

### 参数提示

- 国际件 ETA 常依赖清关与末端承运商，结论需带不确定性说明。
- `query`、`customerIntent` 为**调用 JSON 顶层**。
- 透传 `inputContext.chainId`。

### 示例调用

```json
{
  "query": "这单大概哪天到",
  "customerIntent": "客户要安排收货",
  "inputContext": { "chainId": "eta-001", "sourceExpertId": "", "previousOutput": "" },
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

- **structured**：订单号、预计到达时间等
- **analysis**：预计到达时间、计算依据、异常说明

## 3. 工作流编排

待补充。

## 4. 节点说明

待补充。
